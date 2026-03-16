const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Generate initial interview questions from resume text + skills
 */
async function generateQuestions(resumeText, skills, interviewType = 'technical', count = 8) {
  const typePrompt = interviewType === 'hr'
    ? 'behavioural, HR, and soft-skills'
    : interviewType === 'mixed'
      ? 'both technical and HR behavioural'
      : 'technical and problem-solving';

  const prompt = `
You are an expert interviewer. Given the following resume and extracted skills, generate exactly ${count} ${typePrompt} interview questions.

RESUME:
${resumeText.substring(0, 3000)}

SKILLS DETECTED: ${skills.join(', ')}

Rules:
- Questions must be specific to this candidate's background
- Mix easy, medium, and hard difficulty levels
- No generic questions like "Tell me about yourself" — focus on the candidate's actual skills and experience
- Return ONLY a JSON array of question strings, no extra text.

Example format: ["Question 1?", "Question 2?", ...]
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON array from response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Invalid Gemini response format for questions');
  return JSON.parse(match[0]);
}

/**
 * Generate a dynamic follow-up question based on conversation history
 */
async function generateFollowUp(resumeText, history) {
  const historyText = history
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join('\n\n');

  const prompt = `
You are an expert interviewer. Based on the following resume and conversation history, generate ONE smart follow-up question that probes deeper into the candidate's last answer or explores a related area they haven't discussed.

RESUME SUMMARY:
${resumeText.substring(0, 1500)}

CONVERSATION HISTORY:
${historyText}

Rules:
- Return ONLY the question string, nothing else.
- Make it natural and conversational.
- Probe for depth, examples, or clarification.
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim().replace(/^["']|["']$/g, '');
}

/**
 * Evaluate the full interview session — returns scores and feedback
 */
async function evaluateSession(resumeText, history, interviewType) {
  const historyText = history
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || '(No answer provided)'}`)
    .join('\n\n');

  const prompt = `
You are an expert technical interview evaluator. Evaluate the following interview session and provide detailed, actionable feedback.

CANDIDATE RESUME:
${resumeText.substring(0, 2000)}

INTERVIEW TYPE: ${interviewType}

FULL Q&A:
${historyText}

Provide a JSON response with EXACTLY this structure:
{
  "overall_score": <0-100>,
  "technical_score": <0-100>,
  "communication_score": <0-100>,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "question_feedback": [
    {
      "question": "...",
      "answer": "...",
      "score": <0-10>,
      "feedback": "Brief specific feedback on this answer"
    }
  ],
  "overall_feedback": "2-3 sentence summary of the candidate's performance",
  "recommended_resources": ["resource or topic to study 1", "resource 2"]
}

Return ONLY valid JSON, no markdown code blocks, no extra text.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Extract skills from resume text
 */
async function extractSkills(resumeText) {
  const prompt = `
Extract all technical skills, programming languages, frameworks, tools, and software mentioned in the following resume text.

RESUME:
${resumeText.substring(0, 3000)}

Return ONLY a JSON array of strings (skill names), no explanations, no categories.
Example: ["Python", "React", "PostgreSQL", "Docker"]
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  return JSON.parse(match[0]);
}

module.exports = { generateQuestions, generateFollowUp, evaluateSession, extractSkills };
