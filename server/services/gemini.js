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
 * LOCAL resume parser — works 100% offline, no Gemini API needed.
 * Scans the raw PDF text for known skills, degree keywords, and section headers.
 * Used as primary fallback when Gemini API is unavailable or rate-limited.
 */
function localParseResume(text) {
  const lower = text.toLowerCase();

  // ── Skills dictionaries ────────────────────────────────────────────
  const LANGUAGES = ['python','javascript','typescript','java','c++','c#','c','go','golang','rust','kotlin','swift','ruby','php','scala','r','matlab','bash','shell','sql','html','css'];
  const FRAMEWORKS = ['react','next.js','nextjs','vue','angular','svelte','node.js','nodejs','express','fastapi','flask','django','spring','laravel','rails','nestjs','nuxt','redux','tailwind','bootstrap','material-ui','chakra-ui'];
  const TOOLS = ['git','github','gitlab','docker','kubernetes','aws','azure','gcp','firebase','vercel','netlify','nginx','linux','postgresql','mysql','mongodb','redis','elasticsearch','graphql','rest','webpack','vite','jest','cypress','terraform','jenkins','ci/cd','figma','postman'];
  const SOFT = ['leadership','communication','teamwork','problem solving','critical thinking','agile','scrum','project management','collaboration','time management'];
  const ALL_SKILLS = [...LANGUAGES, ...FRAMEWORKS, ...TOOLS];

  const found = { languages: [], frameworks: [], tools: [], soft: [], technical: [] };

  for (const s of LANGUAGES) {
    const re = new RegExp(`\\b${s.replace(/[.+]/g, '\\$&')}\\b`, 'i');
    if (re.test(text)) found.languages.push(s.charAt(0).toUpperCase() + s.slice(1));
  }
  for (const s of FRAMEWORKS) {
    const re = new RegExp(`\\b${s.replace(/[.+]/g, '\\$&')}\\b`, 'i');
    if (re.test(text)) found.frameworks.push(s.charAt(0).toUpperCase() + s.slice(1));
  }
  for (const s of TOOLS) {
    const re = new RegExp(`\\b${s.replace(/[.+/]/g, '\\$&').replace('ci/cd','ci')}\\b`, 'i');
    if (re.test(text)) found.tools.push(s.toUpperCase().length <= 4 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1));
  }
  for (const s of SOFT) {
    if (lower.includes(s)) found.soft.push(s.replace(/\b\w/g, c => c.toUpperCase()));
  }

  const allFlat = [...new Set([...found.languages, ...found.frameworks, ...found.tools])];

  // ── Education: find degree lines ───────────────────────────────────
  const DEGREES = ['b.tech','b.e.','b.sc','b.com','m.tech','m.sc','m.e.','mba','bca','mca','bachelor','master','phd','diploma','b.tech.','be ','me '];
  const education = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (DEGREES.some(d => l.includes(d))) {
      const yearMatch = lines[i].match(/\b(19|20)\d{2}\b/g);
      education.push({
        degree: lines[i].substring(0, 100),
        institution: lines[i + 1] ? lines[i + 1].substring(0, 80) : '',
        year: yearMatch ? yearMatch.join(' - ') : '',
        grade: '',
        highlights: [],
      });
    }
  }

  // ── Experience: find company/role blocks after "experience" heading ─
  const experience = [];
  const expIdx = lower.indexOf('experience');
  if (expIdx > -1) {
    const expBlock = text.substring(expIdx, expIdx + 2000);
    const expLines = expBlock.split('\n').map(l => l.trim()).filter(Boolean);
    let current = null;
    for (const line of expLines.slice(1)) {
      const low = line.toLowerCase();
      if (low.includes('experience') || low.includes('education') || low.includes('project') || low.includes('skill')) break;
      const dateMatch = line.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)[\w\s,]*\d{4}/i);
      if (dateMatch || line.match(/\b20\d{2}\b.*\b(20\d{2}|present|current)\b/i)) {
        if (current) experience.push(current);
        current = { company: '', role: '', duration: line, type: 'Full-time', highlights: [], technologies: found.languages.slice(0, 3) };
      } else if (current) {
        if (!current.role && line.length < 60) current.role = line;
        else if (!current.company && line.length < 60) current.company = line;
        else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('·')) {
          current.highlights.push(line.replace(/^[•\-·]\s*/, ''));
        }
      }
    }
    if (current) experience.push(current);
  }

  return {
    summary: `Candidate profile extracted from resume. ${allFlat.length} skills detected including ${allFlat.slice(0, 5).join(', ')}.`,
    skills: found,
    education: education.slice(0, 5),
    experience: experience.slice(0, 5),
    projects: [],
    certifications: [],
    all_skills_flat: allFlat,
    _source: 'local', // marks this as locally parsed (not Gemini)
  };
}

/**
 * Extract skills from resume text via Gemini API
 * @deprecated use parseResume() for full structured extraction
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


/**
 * Robustly extracts the first complete JSON object from a string.
 * Uses brace-counting — immune to surrounding markdown, text, or partial wrapping.
 */
function extractJSON(text) {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in Gemini response');
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('JSON object not properly closed in Gemini response');
  return JSON.parse(text.substring(start, end + 1));
}

/**
 * Full structured resume parser — returns skills, education, experience, summary
 * Pipeline: extracted PDF text -> Gemini API -> structured JSON -> caller
 */
async function parseResume(resumeText) {
  // NOTE: prompt is built with string concat to avoid backtick conflicts in template literals
  const prompt = [
    'You are an expert resume parser. Analyze the following resume and extract structured information.',
    '',
    'RESUME TEXT:',
    resumeText.substring(0, 4000),
    '',
    'Return a SINGLE valid JSON object with EXACTLY this structure. No markdown, no explanation:',
    '{',
    '  "summary": "2-3 sentence professional summary",',
    '  "skills": {',
    '    "technical": ["skill1"],',
    '    "languages": ["Python"],',
    '    "frameworks": ["React"],',
    '    "tools": ["Docker"],',
    '    "soft": ["Leadership"]',
    '  },',
    '  "education": [{',
    '    "degree": "B.Tech CS", "institution": "University",',
    '    "year": "2020-2024", "grade": "8.5 CGPA",',
    '    "highlights": ["coursework"]',
    '  }],',
    '  "experience": [{',
    '    "company": "Company", "role": "Engineer",',
    '    "duration": "2023-Present", "type": "Full-time",',
    '    "highlights": ["Built X"], "technologies": ["React"]',
    '  }],',
    '  "projects": [{',
    '    "name": "Project", "description": "desc",',
    '    "technologies": ["tech"], "link": ""',
    '  }],',
    '  "certifications": ["Cert 1"],',
    '  "all_skills_flat": ["Python", "React", "Docker"]',
    '}',
    '',
    'RULES: Return ONLY the JSON object. Use [] for missing sections. all_skills_flat = all skills in one flat array.',
  ].join('\n');

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    console.log('\n[Gemini] Raw response (first 300 chars):', raw.substring(0, 300));

    const parsed = extractJSON(raw);
    const skillsObj = parsed.skills || {};
    const flat = (parsed.all_skills_flat && parsed.all_skills_flat.length > 0)
      ? parsed.all_skills_flat
      : [
          ...(skillsObj.technical || []),
          ...(skillsObj.languages || []),
          ...(skillsObj.frameworks || []),
          ...(skillsObj.tools || []),
        ];

    console.log(`[Gemini] Parsed OK — skills:${flat.length} edu:${(parsed.education||[]).length} exp:${(parsed.experience||[]).length}`);

    return {
      summary: parsed.summary || '',
      skills: {
        technical: skillsObj.technical || [],
        languages: skillsObj.languages || [],
        frameworks: skillsObj.frameworks || [],
        tools: skillsObj.tools || [],
        soft: skillsObj.soft || [],
      },
      education: parsed.education || [],
      experience: parsed.experience || [],
      projects: parsed.projects || [],
      certifications: parsed.certifications || [],
      all_skills_flat: flat,
    };
  } catch (err) {
    console.error('[Gemini] parseResume error:', err.message);
    // Gemini failed — use the local offline parser so users still get real data
    console.log('[Local] Falling back to local regex-based resume parser...');
    const local = localParseResume(resumeText);
    console.log(`[Local] Extracted ${local.all_skills_flat.length} skills, ${local.education.length} education, ${local.experience.length} experience`);
    return local;
  }
}

module.exports = { generateQuestions, generateFollowUp, evaluateSession, extractSkills, parseResume };
