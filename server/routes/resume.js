const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// pdf-parse-fixed: Node.js 22 compatible fork of pdf-parse
const pdfParse = require('@cyber2024/pdf-parse-fixed');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { parseResume } = require('../services/gemini');



// Multer setup — store uploads in /uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${req.user.id}-${file.originalname}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'));
  }
});

// POST /api/resume/upload
// Pipeline: PDF upload → pdf-parse extracts text → Gemini API → JSON (skills, education, experience) → PostgreSQL
router.post('/upload', authenticateToken, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // ── Step 1: pdf-parse extracts text ─────────────────────────────────────────
    console.log('📄 Extracting text from PDF...');
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text;
    console.log(`   Extracted ${extractedText.length} characters from ${req.file.originalname}`);

    // ── Step 2: Gemini API → structured JSON (skills, education, experience) ────
    console.log('🤖 Running Gemini resume parser...');
    let parsed = {
      summary: '',
      skills: { technical: [], languages: [], frameworks: [], tools: [], soft: [] },
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      all_skills_flat: [],
    };

    try {
      parsed = await parseResume(extractedText);
      console.log(`   Parsed: ${parsed.all_skills_flat.length} skills, ${parsed.education.length} education entries, ${parsed.experience.length} experience entries`);
    } catch (geminiErr) {
      console.error('⚠️  Gemini parsing failed (continuing with empty parsed data):', geminiErr.message);
    }

    // ── Step 3: Store in PostgreSQL ──────────────────────────────────────────────
    const result = await pool.query(
      `INSERT INTO resumes (user_id, filename, extracted_text, skills_json, parsed_json)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, filename, skills_json, parsed_json, uploaded_at`,
      [
        req.user.id,
        req.file.originalname,
        extractedText,
        JSON.stringify(parsed.all_skills_flat),   // flat skills array for backward compat
        JSON.stringify(parsed),                    // full structured data
      ]
    );

    const resume = result.rows[0];

    res.status(201).json({
      message: 'Resume parsed and stored successfully',
      resume: {
        id: resume.id,
        filename: resume.filename,
        uploaded_at: resume.uploaded_at,
      },
      parsed,                                  // full structured JSON
      skills: parsed.all_skills_flat,          // convenience flat array
    });

  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ error: 'Failed to process resume: ' + err.message });
  }
});

// GET /api/resume — get user's latest resume (with full parsed data)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filename, skills_json, parsed_json, uploaded_at
       FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No resume found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// GET /api/resume/all — get all resumes for user
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filename, skills_json, parsed_json, uploaded_at
       FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// GET /api/resume/:id — get single resume by ID with full parsed details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filename, skills_json, parsed_json, uploaded_at
       FROM resumes WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Resume not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

module.exports = router;
