const pool = require('../db/pool');
const {
  generateInterviewQuestions,
  evaluateAnswer,
  generateFollowUpQuestion,
} = require('../services/geminiService');

// POST /api/interview/questions
// Body: { skills: ["React", "Node.js", "SQL"] }
// Returns: array of 5 questions
const getQuestions = async (req, res) => {
  try {
    const { skills } = req.body;
    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ error: 'skills must be an array' });
    }
    const questions = await generateInterviewQuestions(skills);
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/interview/evaluate
// Body: { sessionId, question, answer }
// Returns: evaluation object + saves to DB
const evaluate = async (req, res) => {
  try {
    const { sessionId, question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'question and answer are required' });
    }

    const evaluation = await evaluateAnswer(question, answer);

    // Save Q&A + score to responses table
    if (sessionId) {
      await pool.query(
        `INSERT INTO responses
          (session_id, question, answer, evaluation_score)
         VALUES ($1, $2, $3, $4)`,
        [sessionId, question, answer, evaluation.score]
      );
    }

    res.json({ evaluation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/interview/followup
// Body: { question, answer }
// Returns: { followUpQuestion, reason }
const followUp = async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'question and answer are required' });
    }
    const result = await generateFollowUpQuestion(question, answer);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getQuestions, evaluate, followUp };
