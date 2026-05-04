const express = require('express');
const { getQuestions, evaluate, followUp } = require('../controllers/interviewController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/questions', authenticateToken, getQuestions);  // POST /api/interview/questions
router.post('/evaluate',  authenticateToken, evaluate);     // POST /api/interview/evaluate
router.post('/followup',  authenticateToken, followUp);     // POST /api/interview/followup

module.exports = router;
