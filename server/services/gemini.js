const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Generate the NEXT question dynamically by evaluating the previous answer
 * (Handles FIRST question as a special case if history is empty)
 */
async function generateNextQuestion(resumeText, skills, interviewType, history) {
  const isFirst = history.length === 0;
  
  const historyText = isFirst ? 'None' : history.map((qa, i) => {
    let evalStr = qa.evaluation_json ? JSON.stringify(qa.evaluation_json) : 'N/A';
    return `--- Q${i + 1} ---\nQuestion: ${qa.question}\nAnswer: ${qa.answer}\nPrevious Evaluation: ${evalStr}`;
  }).join('\n\n');

  const topicsCovered = isFirst ? 'None' : history.map(qa => {
    try {
      return (typeof qa.evaluation_json === 'string' ? JSON.parse(qa.evaluation_json) : qa.evaluation_json)?.topic;
    } catch(e) { return null; }
  }).filter(Boolean);

  const currentDifficulty = history.length > 0 ? (
    (typeof history[history.length - 1].evaluation_json === 'string' 
      ? JSON.parse(history[history.length - 1].evaluation_json) 
      : history[history.length - 1].evaluation_json)?.difficulty || 'N/A'
  ) : 'N/A';

  const firstQuestionPrompt = isFirst ? `
This is the FIRST question.
- For Technical → start with medium-level resume-based or fundamental question
- For HR → start with "Tell me about yourself"
- For Mixed → start with HR warm-up
  ` : '';

  const evaluationPrompt = isFirst ? `
Because this is the first question, you do not need to evaluate any previous answer. Provide 0 for correctness, clarity, and depth.
  ` : `
Before generating the next question, evaluate the LAST answer:
Return:
- correctness (0–10)
- clarity (0–10)
- depth (0–10)

Also classify:
- topic
- difficulty level (easy / medium / hard)

Use this evaluation to decide the next question.
  `;

  const prompt = `
🔷 🔹 SYSTEM / INSTRUCTION PROMPT
You are an expert AI interviewer conducting a realistic mock interview.

Your job is to generate the NEXT question based on:
- The candidate's resume
- Their skills
- The interview type (Technical / HR / Mixed)
- The full history of previous questions, answers, and evaluations

You must behave like a real interviewer:
- Ask only ONE question at a time
- Adapt based on candidate performance
- Avoid repeating topics or questions
- Maintain a natural conversational tone
- Avoid generic questions. Make questions specific to the candidate whenever possible.

IMPORTANT RULES:
1. Always return a JSON object ONLY (no extra text)
2. Do NOT include explanations outside JSON
3. Question must be clear, concise, and professional
4. Follow adaptive difficulty rules strictly
5. Prefer resume-based personalization when possible

🔷 🔹 INPUT CONTEXT TEMPLATE
CANDIDATE RESUME:
${resumeText.substring(0, 1500)}

SKILLS:
${skills.join(', ')}

INTERVIEW TYPE:
${interviewType}

CURRENT STATE:
- Question Number: ${history.length + 1}
- Topics Covered: ${isFirst ? 'None' : topicsCovered.join(', ')}
- Difficulty Level: ${currentDifficulty}

HISTORY:
${historyText}
${firstQuestionPrompt}

🔷 🔹 ADAPTIVE LOGIC RULES
1. If interview type is TECHNICAL:
   - Evaluate last answer performance
   - If score >= 7 → increase difficulty
   - If score 4–6 → maintain difficulty
   - If score < 4 → simplify or switch topic

   Question categories:
   - DSA / Coding
   - CS Fundamentals (OS, DBMS, CN)
   - Resume-based technical
   - System Design (only if advanced)
   - Debugging / Code reasoning

2. If interview type is HR:
   - Ask behavioral questions
   - Use STAR method (Situation, Task, Action, Result)
   - Always generate follow-up questions based on last answer
   - Focus on: teamwork, conflict, leadership, failure, motivation

3. If interview type is MIXED:
   - Dynamically switch between: HR ↔ Technical ↔ Resume ↔ Situational
   - Do NOT follow a fixed sequence
   - Balance both technical depth and behavioral evaluation

🔷 🔹 EVALUATION LOGIC (VERY IMPORTANT)
${evaluationPrompt}

🔷 🔹 OUTPUT FORMAT (STRICT JSON)
{
  "question": "string",
  "type": "technical | hr | mixed",
  "topic": "DSA | OS | DBMS | Resume | Behavioral | System Design | Debugging",
  "difficulty": "easy | medium | hard",
  "expected_answer_points": ["point1", "point2", "point3"],
  "evaluation": {
    "correctness": number,
    "clarity": number,
    "depth": number
  },
  "follow_up": boolean
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return extractJSON(text);
  } catch (err) {
    console.error('[Gemini] generateNextQuestion failed:', err.message);
    // Graceful fallback if API fails
    return {
      question: isFirst ? 
        (interviewType === 'hr' ? "Tell me about yourself and your background." : "Could you explain a complex problem you've solved recently?") : 
        "That's interesting. Could you elaborate more on that point or provide a specific example?",
      type: interviewType,
      topic: isFirst ? "Introduction" : "Follow-up",
      difficulty: "easy",
      expected_answer_points: ["Candidate provides a structured response"],
      evaluation: {
        correctness: 5,
        clarity: 5,
        depth: 5
      },
      follow_up: !isFirst
    };
  }
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

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code blocks if present
    const cleaned = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[Gemini] evaluateSession failed:', err.message);
    // Graceful fallback if API fails
    return {
      overall_score: 50,
      technical_score: 50,
      communication_score: 50,
      strengths: ["Completed the interview session"],
      improvements: ["Due to API rate limits, a detailed evaluation could not be generated"],
      question_feedback: history.map(qa => ({
        question: qa.question,
        answer: qa.answer || "",
        score: 5,
        feedback: "Feedback unavailable due to API rate limit."
      })),
      overall_feedback: "The interview was completed, but detailed AI evaluation is temporarily unavailable because the API quota was exceeded. Please try reviewing your answers manually.",
      recommended_resources: ["Review the topics covered in this session"]
    };
  }
}

/**
 * Splits raw resume text into named sections by detecting common header patterns.
 * Returns a map of { sectionName: sectionText }
 */
function splitSections(text) {
  const lines = text.split('\n');
  const HEADERS = [
    { key: 'experience',     re: /^(work\s+)?experience|professional\s+experience|employment(\s+history)?|work\s+history/i },
    { key: 'projects',       re: /^projects?|personal\s+projects?|academic\s+projects?|key\s+projects?|notable\s+projects?/i },
    { key: 'education',      re: /^education|academic\s+(background|qualifications?)/i },
    { key: 'skills',         re: /^(technical\s+)?skills?|core\s+competencies|technologies|tech\s+stack/i },
    { key: 'certifications', re: /^certifications?|certificates?|licen[sc]es?|credentials?|achievements?/i },
    { key: 'summary',        re: /^(professional\s+)?(summary|profile|objective|about(\s+me)?)/i },
    { key: 'publications',   re: /^publications?|research|papers?/i },
  ];

  const sections = {};
  let current = 'header';
  let currentLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect section header: short line (< 60 chars) matching a known header pattern
    const isHeader = trimmed.length < 60 && HEADERS.some(h => {
      if (h.re.test(trimmed)) { current = h.key; currentLines = []; return true; }
      return false;
    });
    if (!isHeader) currentLines.push(line);
    // Save lines to section
    sections[current] = (sections[current] || '') + (isHeader ? '' : line + '\n');
  }
  return sections;
}

/**
 * LOCAL resume parser — 100% offline, uses section-header splitting + regex.
 * Covers: skills, education, experience, projects, certifications.
 * Used as fallback when Gemini API is unavailable or rate-limited.
 */
function localParseResume(text) {
  const lower = text.toLowerCase();
  const sections = splitSections(text);

  // ── 1. SKILLS (keyword match across whole document) ─────────────────
  const LANGUAGES  = ['Python','JavaScript','TypeScript','Java','C++','C#','Go','Golang','Rust','Kotlin','Swift','Ruby','PHP','Scala','R','MATLAB','Bash','Shell','SQL','HTML','CSS','Dart'];
  const FRAMEWORKS = ['React','Next.js','Vue','Angular','Svelte','Node.js','Express','FastAPI','Flask','Django','Spring','Laravel','Rails','NestJS','Nuxt','Redux','Tailwind','Bootstrap','Flutter','React Native'];
  const TOOLS      = ['Git','GitHub','GitLab','Docker','Kubernetes','AWS','Azure','GCP','Firebase','Vercel','Netlify','Nginx','Linux','PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch','GraphQL','REST','Webpack','Vite','Jest','Cypress','Terraform','Jenkins','Figma','Postman','Pandas','NumPy','TensorFlow','PyTorch','Scikit-learn','Power BI','Tableau','Excel','Jira','Linux'];
  const SOFT       = ['Leadership','Communication','Teamwork','Problem Solving','Critical Thinking','Agile','Scrum','Project Management','Collaboration','Time Management'];

  const found = { languages: [], frameworks: [], tools: [], soft: [], technical: [] };

  for (const s of LANGUAGES) {
    if (new RegExp('\\b' + s.replace(/[.+]/g, '\\$&') + '\\b', 'i').test(text)) found.languages.push(s);
  }
  for (const s of FRAMEWORKS) {
    if (new RegExp('\\b' + s.replace(/[.+]/g, '\\$&') + '\\b', 'i').test(text)) found.frameworks.push(s);
  }
  for (const s of TOOLS) {
    if (new RegExp('\\b' + s.replace(/[.+]/g, '\\$&') + '\\b', 'i').test(text)) found.tools.push(s);
  }
  for (const s of SOFT) {
    if (lower.includes(s.toLowerCase())) found.soft.push(s);
  }
  const allFlat = [...new Set([...found.languages, ...found.frameworks, ...found.tools])];

  // ── 2. EDUCATION ────────────────────────────────────────────────────
  const DEGREES = ['b.tech','b.e','b.sc','b.com','m.tech','m.sc','m.e','mba','bca','mca','bachelor','master','phd','ph.d','diploma','be ','me ','b.a','m.a'];
  const education = [];
  const eduText = sections.education || text;
  const allLines = eduText.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < allLines.length; i++) {
    const l = allLines[i].toLowerCase();
    if (DEGREES.some(d => l.includes(d))) {
      const yearMatch = allLines[i].match(/\b(19|20)\d{2}\b/g);
      const gradeMatch = allLines[i].match(/(\d+\.?\d*)\s*(cgpa|gpa|%|percent)/i)
                      || (allLines[i+1] || '').match(/(\d+\.?\d*)\s*(cgpa|gpa|%|percent)/i);
      // Clean institution: strip box/unknown chars, truncate at coursework noise
      let rawInst = allLines[i+1] && !DEGREES.some(d => allLines[i+1].toLowerCase().includes(d)) ? allLines[i+1] : '';
      // Remove non-printable / box characters (PDF artifacts like □, \uFFFD, etc.)
      rawInst = rawInst.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD\u25A1\uFFFE\uFFFF]/g, '').trim();
      // Truncate at coursework/noise phrases
      const noiseRe = /\s*(with relevant|relevant coursework|coursework in|courses:|including:|\(see below\))/i;
      const noiseIdx = rawInst.search(noiseRe);
      if (noiseIdx > -1) rawInst = rawInst.substring(0, noiseIdx).trim();
      // Skip if line looks like coursework, not an institution
      const looksLikeNoise = /^(relevant|coursework|gpa|grade|cgpa|\d|•|-)/i.test(rawInst);
      education.push({
        degree: allLines[i]
          .replace(/[\(\[]\s*(19|20)\d{2}\s*[-–]\s*(19|20)?\d{0,4}\s*[\)\]]/g, '') // remove (2022-2026)
          .replace(/\b(19|20)\d{2}\s*[-–]\s*(19|20)?\d{2,4}\b/g, '')               // remove bare 2022-2026
          .replace(/\s{2,}/g, ' ').trim().substring(0, 120),
        institution: looksLikeNoise ? '' : rawInst.substring(0, 100),
        year: yearMatch ? [...new Set(yearMatch)].join(' - ') : '',
        grade: gradeMatch ? gradeMatch[0] : '',
        highlights: [],
      });
    }
  }

  // ── 3. EXPERIENCE ───────────────────────────────────────────────────
  const experience = [];
  const expText = sections.experience || '';
  if (expText.trim()) {
    const expLines = expText.split('\n').map(l => l.trim()).filter(Boolean);
    let current = null;
    const DATE_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{4}|\b20\d{2}\b.{0,10}(20\d{2}|present|current|now)/i;
    const ROLE_KEYWORDS = /engineer|developer|analyst|intern(ship)?|trainee|associate|manager|designer|consultant|scientist|architect|lead|director|head/i;

    for (const line of expLines) {
      if (DATE_RE.test(line)) {
        if (current) experience.push(current);
        current = { company: '', role: '', duration: line, type: 'Full-time', highlights: [], technologies: found.languages.slice(0, 4) };
      } else if (current) {
        if (!current.role && ROLE_KEYWORDS.test(line) && line.length < 80) {
          current.role = line;
        } else if (!current.company && line.length < 80 && !line.match(/^[•\-·▪]/)) {
          current.company = line;
        } else if (line.match(/^[•\-·▪]/) || (line.length > 20 && current.role)) {
          current.highlights.push(line.replace(/^[•\-·▪]\s*/, '').substring(0, 200));
        }
      } else {
        // Before any date found — check if line looks like company/role
        if (ROLE_KEYWORDS.test(line) && line.length < 80) {
          current = { company: '', role: line, duration: '', type: 'Full-time', highlights: [], technologies: found.languages.slice(0, 4) };
        }
      }
    }
    if (current) experience.push(current);
  }

  // ── 4. PROJECTS ─────────────────────────────────────────────────────
  const projects = [];
  const projText = sections.projects || '';
  if (projText.trim()) {
    const projLines = projText.split('\n').map(l => l.trim()).filter(Boolean);
    let current = null;
    const TECH_LINE = /\b(tech|built with|stack|technologies|tools used|using)\b/i;
    const BULLET = /^[•\-·▪]/;
    const GITHUB_RE = /github\.com\/[\w\-]+\/[\w\-]+/i;

    for (const line of projLines) {
      const githubMatch = line.match(GITHUB_RE);
      if (line.length < 80 && !BULLET.test(line) && !TECH_LINE.test(line) && line.length > 3) {
        // Looks like a project title
        if (current) projects.push(current);
        current = { name: line, description: '', technologies: [], link: githubMatch ? githubMatch[0] : '' };
      } else if (current) {
        if (BULLET.test(line)) {
          const clean = line.replace(/^[•\-·▪]\s*/, '');
          if (TECH_LINE.test(clean)) {
            // Extract tech names from this line
            const techFound = [...LANGUAGES, ...FRAMEWORKS, ...TOOLS].filter(t =>
              new RegExp('\\b' + t.replace(/[.+]/g, '\\$&') + '\\b', 'i').test(clean)
            );
            current.technologies = techFound.length > 0 ? techFound : current.technologies;
          } else {
            current.description += (current.description ? ' ' : '') + clean;
          }
        } else if (githubMatch && !current.link) {
          current.link = githubMatch[0];
        } else if (line.length > 20 && !current.description) {
          current.description = line.substring(0, 200);
        }
        // Detect technologies by scanning each project line
        const detected = [...LANGUAGES, ...FRAMEWORKS, ...TOOLS].filter(t =>
          new RegExp('\\b' + t.replace(/[.+]/g, '\\$&') + '\\b', 'i').test(line)
        );
        if (detected.length > 0) current.technologies = [...new Set([...current.technologies, ...detected])];
      }
    }
    if (current) projects.push(current);
  }

  // ── 5. CERTIFICATIONS ───────────────────────────────────────────────
  const certifications = [];
  const certText = sections.certifications || '';
  const CERT_KEYWORDS = /certif|certified|aws certified|google cloud|microsoft|oracle|cisco|comptia|pmp|scrum master|coursera|udemy|nptel|hackerrank|leetcode/i;

  if (certText.trim()) {
    const certLines = certText.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of certLines) {
      if (line.length > 5 && line.length < 200) {
        certifications.push(line.replace(/^[•\-·▪\d.]\s*/, ''));
      }
    }
  } else {
    // If no certifications section, scan full text for cert-like lines
    const allTextLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of allTextLines) {
      if (CERT_KEYWORDS.test(line) && line.length < 150 && line.length > 8) {
        certifications.push(line.replace(/^[•\-·▪\d.]\s*/, ''));
      }
    }
  }

  return {
    summary: `${allFlat.length} skills detected including ${allFlat.slice(0, 5).join(', ')}. ${education.length} education entr${education.length === 1 ? 'y' : 'ies'}, ${experience.length} experience entr${experience.length === 1 ? 'y' : 'ies'}.`,
    skills: found,
    education: education.slice(0, 6),
    experience: experience.slice(0, 6),
    projects: projects.slice(0, 8),
    certifications: [...new Set(certifications)].slice(0, 10),
    all_skills_flat: allFlat,
    _source: 'local',
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

module.exports = { generateNextQuestion, evaluateSession, extractSkills, parseResume };
