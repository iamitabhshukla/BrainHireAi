const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parseResume } = require('../services/gemini');
const fs = require('fs');
const pdfParse = require('@cyber2024/pdf-parse-fixed');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

// ==========================================
// RECRUITER ROUTES
// ==========================================

// 1. POST /api/jobs - Create job
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, tech_stack, experience_level, work_mode, max_applicants, invite_only } = req.body;
  
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  try {
    const newJob = await pool.query(
      `INSERT INTO jobs 
        (title, description, tech_stack, experience_level, work_mode, max_applicants, invite_only, recruiter_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [title, description, tech_stack, experience_level, work_mode ? work_mode.toLowerCase() : 'remote', max_applicants || 50, invite_only || false, req.user.id]
    );
    res.status(201).json(newJob.rows[0]);
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// 2. GET /api/jobs - Get all jobs for recruiter
router.get('/', authenticateToken, async (req, res) => {
  try {
    const jobs = await pool.query(
      `SELECT j.*, COUNT(a.id) as applicants_count 
       FROM jobs j
       LEFT JOIN applications a ON j.id = a.job_id
       WHERE j.recruiter_id = $1
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );
    res.json(jobs.rows);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// 3. GET /api/jobs/:id/applicants - Return list of applicants sorted by ai_score DESC
router.get('/:id/applicants', authenticateToken, async (req, res) => {
  try {
    // Verify recruiter owns this job
    const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1 AND recruiter_id = $2', [req.params.id, req.user.id]);
    if (jobCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized to view these applicants' });
    }

    const applicants = await pool.query(
      `SELECT a.id as application_id, a.status, a.ai_score, a.created_at, 
              c.name, c.email, c.resume_url, a.interview_id
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.id
       WHERE a.job_id = $1
       ORDER BY a.ai_score DESC NULLS LAST, a.created_at DESC`,
      [req.params.id]
    );
    res.json(applicants.rows);
  } catch (err) {
    console.error('Error fetching applicants:', err);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// 4. PATCH /api/jobs/applications/:id/status - Update status
router.patch('/applications/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'completed', 'rejected', 'shortlisted'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const updatedApp = await pool.query(
      'UPDATE applications SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (updatedApp.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(updatedApp.rows[0]);
  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// 5. GET /api/jobs/:id - Get job details
router.get('/:id', async (req, res) => {
  try {
    const job = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job.rows[0]);
  } catch (err) {
    console.error('Error fetching job details:', err);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// ==========================================
// CANDIDATE APPLICATION FLOW
// ==========================================

// 6. GET /api/jobs/invite/:jobId - Fetch job info for candidate (alias for above)
router.get('/invite/:jobId', async (req, res) => {
  try {
    const job = await pool.query(
      'SELECT id, title, description, tech_stack, work_mode FROM jobs WHERE id = $1',
      [req.params.jobId]
    );
    if (job.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(job.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// 7. POST /api/jobs/apply/:jobId - Submit Application
router.post('/apply/:jobId', upload.single('resume'), async (req, res) => {
  const { name, email } = req.body;
  const { jobId } = req.params;
  
  if (!name || !email || !req.file) {
    return res.status(400).json({ error: 'Name, email, and resume are required' });
  }

  try {
    // Check if job exists
    const jobCheck = await pool.query('SELECT id, max_applicants FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const applicantCount = await pool.query('SELECT COUNT(*) FROM applications WHERE job_id = $1', [jobId]);
    if (parseInt(applicantCount.rows[0].count) >= jobCheck.rows[0].max_applicants) {
      return res.status(400).json({ error: 'This job is no longer accepting applications' });
    }

    let resumeText = '';
    try {
      const pdfBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(pdfBuffer);
      resumeText = pdfData.text;
    } catch (err) {
      console.error('PDF Parse Error:', err);
      resumeText = fs.readFileSync(req.file.path, 'utf8').replace(/\0/g, ''); // fallback
    }

    let parsedResume = { all_skills_flat: [] };
    try {
      parsedResume = await parseResume(resumeText);
    } catch (err) {
      console.error('Gemini Parse Error:', err);
    }
    const skillsJson = JSON.stringify(parsedResume.all_skills_flat || []);
    const parsedJson = JSON.stringify(parsedResume);

    // ✨ THE TRICK: Create a "Shadow User"
    const pseudoPassword = await bcrypt.hash(Date.now().toString(), 10);
    const shadowUser = await pool.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name 
       RETURNING id`,
      [name, email, pseudoPassword]
    );
    const shadowUserId = shadowUser.rows[0].id;

    // Upload Resume (linked to shadow user)
    const newResume = await pool.query(
      `INSERT INTO resumes (user_id, filename, extracted_text, skills_json, parsed_json) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [shadowUserId, req.file.originalname, resumeText, skillsJson, parsedJson]
    );

    // Create Candidate
    const newCandidate = await pool.query(
      'INSERT INTO candidates (name, email, resume_url) VALUES ($1, $2, $3) RETURNING id',
      [name, email, req.file.path]
    );

    // Create Application
    const newApp = await pool.query(
      'INSERT INTO applications (job_id, candidate_id, status) VALUES ($1, $2, $3) RETURNING id',
      [jobId, newCandidate.rows[0].id, 'pending']
    );

    // Generate valid JWT Token for existing interview system
    const token = jwt.sign({ id: shadowUserId, email }, process.env.JWT_SECRET, { expiresIn: '2h' });

    res.status(201).json({
      message: 'Application successful',
      token,
      resume_id: newResume.rows[0].id,
      application_id: newApp.rows[0].id
    });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Application failed' });
  } finally {
    if (req.file) fs.unlinkSync(req.file.path);
  }
});

// 8. PUT /api/jobs/applications/:id/link-interview
router.put('/applications/:id/link-interview', authenticateToken, async (req, res) => {
  const { session_id } = req.body;
  try {
    const updated = await pool.query(
      'UPDATE applications SET interview_id = $1 WHERE id = $2 RETURNING *',
      [session_id, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to link interview' });
  }
});

module.exports = router;
