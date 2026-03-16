const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { extractSkills } = require('../services/gemini');

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
router.post('/upload', authenticateToken, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Extract text from PDF
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text;

    // Use Gemini to extract skills
    let skills = [];
    try {
      skills = await extractSkills(extractedText);
    } catch (geminiErr) {
      console.error('Gemini skill extraction failed:', geminiErr.message);
      // Continue with empty skills rather than failing the whole upload
    }

    // Store in DB
    const result = await pool.query(
      `INSERT INTO resumes (user_id, filename, extracted_text, skills_json)
       VALUES ($1, $2, $3, $4) RETURNING id, filename, skills_json, uploaded_at`,
      [req.user.id, req.file.originalname, extractedText, JSON.stringify(skills)]
    );

    res.status(201).json({
      message: 'Resume uploaded and processed successfully',
      resume: result.rows[0],
      skills,
    });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ error: 'Failed to process resume: ' + err.message });
  }
});

// GET /api/resume — get user's latest resume
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filename, skills_json, uploaded_at FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1`,
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
      `SELECT id, filename, skills_json, uploaded_at FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

module.exports = router;
