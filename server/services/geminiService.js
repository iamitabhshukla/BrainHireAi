const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ─────────────────────────────────────────────────────────────
// Helper: strip markdown fences Gemini sometimes adds anyway
// ─────────────────────────────────────────────────────────────
const cleanJSON = (text) =>
  text.replace(/```json/gi, '').replace(/```/g, '').trim();

// ─────────────────────────────────────────────────────────────
// FUNCTION 1 — generateInterviewQuestions
// Input : skills array e.g. ["React", "Node.js", "SQL"]
// Output: array of 5 question objects
// ─────────────────────────────────────────────────────────────
const generateInterviewQuestions = async (skills) => {
  if (!skills || skills.length === 0) {
    throw new Error('No skills provided to generate questions.');
  }

  const skillList = skills.join(', ');

  const prompt = `You are an expert technical interviewer. 
Generate exactly 5 interview questions for a candidate with these skills: ${skillList}

Return ONLY a valid JSON array — no markdown, no explanation, no extra text.
Use exactly this structure:

[
  {
    "id": 1,
    "type": "technical",
    "difficulty": "medium",
    "question": "your question here",
    "topic": "which skill this tests"
  },
  {
    "id": 2,
    "type": "technical",
    "difficulty": "hard",
    "question": "your question here",
    "topic": "which skill this tests"
  },
  {
    "id": 3,
    "type": "behavioral",
    "difficulty": "medium",
    "question": "your question here",
    "topic": "teamwork or communication"
  },
  {
    "id": 4,
    "type": "behavioral",
    "difficulty": "medium",
    "question": "your question here",
    "topic": "problem solving under pressure"
  },
  {
    "id": 5,
    "type": "problem-solving",
    "difficulty": "hard",
    "question": "your question here",
    "topic": "system design or algorithm"
  }
]

Rules:
- Technical questions must be specific to the listed skills
- Behavioral questions must use the STAR method format
- Problem-solving question should be open-ended and realistic
- Do NOT repeat topics`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const questions = JSON.parse(cleanJSON(raw));

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Gemini returned an unexpected format for questions.');
    }

    return questions;
  } catch (err) {
    if (err.message.includes("API_KEY_INVALID")) {
      throw new Error("AI service unavailable. Please check API key.");
    }
    throw new Error(`generateInterviewQuestions failed: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// FUNCTION 2 — evaluateAnswer
// Input : question string, candidate's answer string
// Output: evaluation object with score, feedback, strengths, improvements
// ─────────────────────────────────────────────────────────────
const evaluateAnswer = async (question, answer) => {
  if (!question || !answer) {
    throw new Error('Both question and answer are required for evaluation.');
  }

  if (answer.trim().length < 10) {
    return {
      score: 1,
      feedback: 'Answer is too short to evaluate. Please provide a detailed response.',
      strengths: [],
      improvements: ['Provide a complete, detailed answer'],
      communicationScore: 1,
      technicalScore: 1,
    };
  }

  const prompt = `You are a strict but fair interview evaluator.

Evaluate this interview answer and return ONLY valid JSON — no markdown, no explanation.

Question: "${question}"

Candidate's Answer: "${answer}"

Return exactly this JSON structure:
{
  "score": ,
  "technicalScore": ,
  "communicationScore": ,
  "feedback": "<2-3 sentences of overall feedback>",
  "strengths": ["", ""],
  "improvements": ["", ""],
  "idealAnswerHint": ""
}

Scoring guide:
1-3  = Incorrect or very incomplete
4-5  = Partially correct, missing key points
6-7  = Good answer with minor gaps
8-9  = Strong, well-structured answer
10   = Exceptional — covers all aspects with clear examples`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const evaluation = JSON.parse(cleanJSON(raw));

    // Clamp scores to 1-10 in case Gemini hallucinates out-of-range values
    evaluation.score            = Math.min(10, Math.max(1, evaluation.score));
    evaluation.technicalScore   = Math.min(10, Math.max(1, evaluation.technicalScore));
    evaluation.communicationScore = Math.min(10, Math.max(1, evaluation.communicationScore));

    return evaluation;
  } catch (err) {
    if (err.message.includes("API_KEY_INVALID")) {
      throw new Error("AI service unavailable. Please check API key.");
    }
    throw new Error(`evaluateAnswer failed: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// FUNCTION 3 — generateFollowUpQuestion
// Input : original question, candidate's answer
// Output: a single follow-up question string
// ─────────────────────────────────────────────────────────────
const generateFollowUpQuestion = async (question, answer) => {
  if (!question || !answer) {
    throw new Error('Both question and answer are required for follow-up generation.');
  }

  const prompt = `You are a senior technical interviewer conducting a live interview.

The candidate just answered a question. Generate ONE smart follow-up question that:
- Probes deeper into something they said
- Clarifies a vague or incomplete part of their answer
- Tests whether they truly understand the concept or just memorised it

Original Question: "${question}"
Candidate's Answer: "${answer}"

Return ONLY a JSON object — no markdown, no explanation:
{
  "followUpQuestion": "",
  "reason": ""
}`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = JSON.parse(cleanJSON(raw));

    if (!parsed.followUpQuestion) {
      throw new Error('No followUpQuestion field in Gemini response.');
    }

    return parsed;
  } catch (err) {
    if (err.message.includes("API_KEY_INVALID")) {
      throw new Error("AI service unavailable. Please check API key.");
    }
    throw new Error(`generateFollowUpQuestion failed: ${err.message}`);
  }
};

module.exports = {
  generateInterviewQuestions,
  evaluateAnswer,
  generateFollowUpQuestion,
};
