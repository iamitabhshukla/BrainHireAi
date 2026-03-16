const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

// GET /api/analytics/dashboard — summary stats for dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Total sessions
    const totalSessions = await pool.query(
      'SELECT COUNT(*) FROM interview_sessions WHERE user_id = $1',
      [userId]
    );

    // Completed sessions
    const completedSessions = await pool.query(
      "SELECT COUNT(*) FROM interview_sessions WHERE user_id = $1 AND status = 'completed'",
      [userId]
    );

    // Average scores
    const avgScores = await pool.query(
      `SELECT
         ROUND(AVG(a.overall_score)) AS avg_overall,
         ROUND(AVG(a.technical_score)) AS avg_technical,
         ROUND(AVG(a.communication_score)) AS avg_communication
       FROM analytics a
       JOIN interview_sessions sess ON sess.id = a.session_id
       WHERE sess.user_id = $1`,
      [userId]
    );

    // Recent 5 sessions
    const recentSessions = await pool.query(
      `SELECT sess.id, sess.interview_type, sess.status, sess.started_at, sess.ended_at,
              r.filename,
              a.overall_score, a.technical_score, a.communication_score
       FROM interview_sessions sess
       LEFT JOIN resumes r ON r.id = sess.resume_id
       LEFT JOIN analytics a ON a.session_id = sess.id
       WHERE sess.user_id = $1
       ORDER BY sess.started_at DESC
       LIMIT 5`,
      [userId]
    );

    // Latest resume skills
    const latestResume = await pool.query(
      'SELECT skills_json FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1',
      [userId]
    );

    res.json({
      total_sessions: parseInt(totalSessions.rows[0].count),
      completed_sessions: parseInt(completedSessions.rows[0].count),
      avg_scores: avgScores.rows[0],
      recent_sessions: recentSessions.rows,
      skills: latestResume.rows[0]?.skills_json || [],
    });
  } catch (err) {
    console.error('Dashboard analytics error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard analytics' });
  }
});

// GET /api/analytics/session/:id — full breakdown for one session
router.get('/session/:id', authenticateToken, async (req, res) => {
  try {
    const analyticsRes = await pool.query(
      `SELECT a.*, sess.interview_type, sess.started_at, sess.ended_at, r.filename
       FROM analytics a
       JOIN interview_sessions sess ON sess.id = a.session_id
       LEFT JOIN resumes r ON r.id = sess.resume_id
       WHERE a.session_id = $1 AND sess.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (analyticsRes.rows.length === 0)
      return res.status(404).json({ error: 'Analytics not found for this session' });

    res.json(analyticsRes.rows[0]);
  } catch (err) {
    console.error('Session analytics error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch session analytics' });
  }
});

module.exports = router;
