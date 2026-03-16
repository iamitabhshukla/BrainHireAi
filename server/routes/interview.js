const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { generateQuestions, generateFollowUp, evaluateSession } = require('../services/gemini');

// POST /api/interview/start — start a new session, generate initial questions
router.post('/start', authenticateToken, async (req, res) => {
  const { resume_id, interview_type = 'technical' } = req.body;
  if (!resume_id) return res.status(400).json({ error: 'resume_id is required' });

  try {
    // Fetch resume
    const resumeResult = await pool.query(
      'SELECT extracted_text, skills_json FROM resumes WHERE id = $1 AND user_id = $2',
      [resume_id, req.user.id]
    );
    if (resumeResult.rows.length === 0)
      return res.status(404).json({ error: 'Resume not found' });

    const { extracted_text, skills_json } = resumeResult.rows[0];
    const skills = Array.isArray(skills_json) ? skills_json : JSON.parse(skills_json || '[]');

    // Create session in DB
    const sessionResult = await pool.query(
      'INSERT INTO interview_sessions (user_id, resume_id, interview_type) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, resume_id, interview_type]
    );
    const sessionId = sessionResult.rows[0].id;

    // Generate questions via Gemini
    const questions = await generateQuestions(extracted_text, skills, interview_type, 8);

    // Save questions to DB
    for (let i = 0; i < questions.length; i++) {
      await pool.query(
        'INSERT INTO interview_qa (session_id, question, question_order) VALUES ($1, $2, $3)',
        [sessionId, questions[i], i + 1]
      );
    }

    // Fetch saved QA rows
    const qaResult = await pool.query(
      'SELECT id, question, question_order FROM interview_qa WHERE session_id = $1 ORDER BY question_order',
      [sessionId]
    );

    res.status(201).json({
      session_id: sessionId,
      interview_type,
      questions: qaResult.rows,
    });
  } catch (err) {
    console.error('Start interview error:', err);
    res.status(500).json({ error: 'Failed to start interview: ' + err.message });
  }
});

// POST /api/interview/answer — save an answer
router.post('/answer', authenticateToken, async (req, res) => {
  const { qa_id, answer } = req.body;
  if (!qa_id || answer === undefined)
    return res.status(400).json({ error: 'qa_id and answer are required' });

  try {
    await pool.query('UPDATE interview_qa SET answer = $1 WHERE id = $2', [answer, qa_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

// POST /api/interview/follow-up — get one adaptive follow-up question
router.post('/follow-up', authenticateToken, async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  try {
    // Get session + resume
    const sessionRes = await pool.query(
      `SELECT sess.resume_id, r.extracted_text FROM interview_sessions sess
       JOIN resumes r ON r.id = sess.resume_id
       WHERE sess.id = $1 AND sess.user_id = $2`,
      [session_id, req.user.id]
    );
    if (sessionRes.rows.length === 0)
      return res.status(404).json({ error: 'Session not found' });

    const { extracted_text } = sessionRes.rows[0];

    // Get current Q&A history
    const qaRes = await pool.query(
      'SELECT question, answer FROM interview_qa WHERE session_id = $1 ORDER BY question_order',
      [session_id]
    );
    const history = qaRes.rows;

    const followUp = await generateFollowUp(extracted_text, history);

    // Save follow-up as a new QA row
    const lastOrder = history.length + 1;
    const newQA = await pool.query(
      'INSERT INTO interview_qa (session_id, question, question_order) VALUES ($1, $2, $3) RETURNING id, question',
      [session_id, followUp, lastOrder]
    );

    res.json(newQA.rows[0]);
  } catch (err) {
    console.error('Follow-up error:', err);
    res.status(500).json({ error: 'Failed to generate follow-up: ' + err.message });
  }
});

// POST /api/interview/end — evaluate session, save analytics
router.post('/end', authenticateToken, async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  try {
    // Get session + resume
    const sessionRes = await pool.query(
      `SELECT sess.interview_type, sess.resume_id, r.extracted_text
       FROM interview_sessions sess
       JOIN resumes r ON r.id = sess.resume_id
       WHERE sess.id = $1 AND sess.user_id = $2`,
      [session_id, req.user.id]
    );
    if (sessionRes.rows.length === 0)
      return res.status(404).json({ error: 'Session not found' });

    const { extracted_text, interview_type } = sessionRes.rows[0];

    // Get full Q&A
    const qaRes = await pool.query(
      'SELECT question, answer FROM interview_qa WHERE session_id = $1 ORDER BY question_order',
      [session_id]
    );

    // Evaluate via Gemini
    const evaluation = await evaluateSession(extracted_text, qaRes.rows, interview_type);

    // Save analytics
    const analyticsRes = await pool.query(
      `INSERT INTO analytics (session_id, overall_score, technical_score, communication_score, feedback_json)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        session_id,
        evaluation.overall_score,
        evaluation.technical_score,
        evaluation.communication_score,
        JSON.stringify(evaluation),
      ]
    );

    // Mark session completed
    await pool.query(
      'UPDATE interview_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
      ['completed', session_id]
    );

    res.json({ analytics_id: analyticsRes.rows[0].id, evaluation });
  } catch (err) {
    console.error('End interview error:', err);
    res.status(500).json({ error: 'Failed to evaluate session: ' + err.message });
  }
});

// GET /api/interview/sessions — list user's sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sess.id, sess.interview_type, sess.status, sess.started_at, sess.ended_at,
              r.filename, a.overall_score, a.technical_score, a.communication_score
       FROM interview_sessions sess
       LEFT JOIN resumes r ON r.id = sess.resume_id
       LEFT JOIN analytics a ON a.session_id = sess.id
       WHERE sess.user_id = $1
       ORDER BY sess.started_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List sessions error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch sessions' });
  }
});

// GET /api/interview/sessions/:id — get full detail of one session
router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const sessionRes = await pool.query(
      `SELECT sess.*, r.filename, r.skills_json FROM interview_sessions sess
       LEFT JOIN resumes r ON r.id = sess.resume_id
       WHERE sess.id = $1 AND sess.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const qaRes = await pool.query(
      'SELECT id, question, answer, question_order FROM interview_qa WHERE session_id = $1 ORDER BY question_order',
      [req.params.id]
    );

    const analyticsRes = await pool.query(
      'SELECT * FROM analytics WHERE session_id = $1',
      [req.params.id]
    );

    res.json({
      session: sessionRes.rows[0],
      qa: qaRes.rows,
      analytics: analyticsRes.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session detail' });
  }
});

module.exports = router;
