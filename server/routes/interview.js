const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { generateNextQuestion, evaluateSession } = require('../services/gemini');

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

    // Generate FIRST question via Gemini
    const initialData = await generateNextQuestion(extracted_text, skills, interview_type, []);

    // Save question to DB
    await pool.query(
      'INSERT INTO interview_qa (session_id, question, evaluation_json, question_order) VALUES ($1, $2, $3, $4)',
      [sessionId, initialData.question, JSON.stringify({ 
         topic: initialData.topic, 
         difficulty: initialData.difficulty,
         expected_answer_points: initialData.expected_answer_points,
         type: initialData.type,
         follow_up: initialData.follow_up
       }), 1]
    );

    // Fetch saved QA rows
    const qaResult = await pool.query(
      'SELECT id, question, question_order FROM interview_qa WHERE session_id = $1 ORDER BY question_order',
      [sessionId]
    );

    // Determine max questions
    const max_questions = interview_type === 'hr' ? 6 : interview_type === 'technical' ? 7 : 8;

    res.status(201).json({
      session_id: sessionId,
      interview_type,
      max_questions,
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

// POST /api/interview/next — generate the next dynamic question
router.post('/next', authenticateToken, async (req, res) => {
  const { session_id, qa_id, answer } = req.body;
  if (!session_id || !qa_id || answer === undefined) 
    return res.status(400).json({ error: 'session_id, qa_id, and answer required' });

  try {
    // 1. Save current answer
    await pool.query('UPDATE interview_qa SET answer = $1 WHERE id = $2', [answer, qa_id]);

    // 2. Get session + resume
    const sessionRes = await pool.query(
      `SELECT sess.resume_id, sess.interview_type, r.extracted_text, r.skills_json 
       FROM interview_sessions sess
       JOIN resumes r ON r.id = sess.resume_id
       WHERE sess.id = $1 AND sess.user_id = $2`,
      [session_id, req.user.id]
    );
    if (sessionRes.rows.length === 0)
      return res.status(404).json({ error: 'Session not found' });

    const { extracted_text, skills_json, interview_type } = sessionRes.rows[0];
    const skills = Array.isArray(skills_json) ? skills_json : JSON.parse(skills_json || '[]');

    // 3. Get current Q&A history
    const qaRes = await pool.query(
      'SELECT id, question, answer, evaluation_json, question_order FROM interview_qa WHERE session_id = $1 ORDER BY question_order',
      [session_id]
    );
    const history = qaRes.rows;

    const max_questions = interview_type === 'hr' ? 6 : interview_type === 'technical' ? 7 : 8;
    
    // End interview if we hit the limit or performance dictates early exit (can be added to prompt logic later)
    if (history.length >= max_questions) {
      return res.json({ completed: true });
    }

    // 4. Generate next question and evaluation
    const nextData = await generateNextQuestion(extracted_text, skills, interview_type, history);

    // 5. Update previous QA with evaluation
    if (nextData.evaluation) {
       const prevQa = history.find(q => q.id === qa_id);
       const existingEval = typeof prevQa.evaluation_json === 'string' ? JSON.parse(prevQa.evaluation_json) : (prevQa.evaluation_json || {});
       const mergedEval = { ...existingEval, ...nextData.evaluation };
       await pool.query('UPDATE interview_qa SET evaluation_json = $1 WHERE id = $2', [JSON.stringify(mergedEval), qa_id]);
    }

    // 6. Save new question
    const lastOrder = history.length + 1;
    const newQA = await pool.query(
      'INSERT INTO interview_qa (session_id, question, evaluation_json, question_order) VALUES ($1, $2, $3, $4) RETURNING id, question, question_order',
      [session_id, nextData.question, JSON.stringify({ 
         topic: nextData.topic, 
         difficulty: nextData.difficulty,
         expected_answer_points: nextData.expected_answer_points,
         type: nextData.type,
         follow_up: nextData.follow_up
       }), lastOrder]
    );

    res.json(newQA.rows[0]);
  } catch (err) {
    console.error('Next question error:', err);
    res.status(500).json({ error: 'Failed to generate next question: ' + err.message });
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
      max_questions: sessionRes.rows[0].interview_type === 'hr' ? 6 : sessionRes.rows[0].interview_type === 'technical' ? 7 : 8,
      qa: qaRes.rows,
      analytics: analyticsRes.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session detail' });
  }
});

module.exports = router;
