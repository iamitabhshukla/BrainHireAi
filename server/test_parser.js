require('dotenv').config();
const { parseResume } = require('./services/gemini');

const sample = `John Doe - Software Engineer

Experience
Software Engineer - Google
Jan 2022 - Present
- Built scalable APIs using Python and FastAPI
- Led team of 5 engineers on cloud migration

Data Analyst Intern - Microsoft
Jun 2021 - Dec 2021
- Analyzed data using Pandas and NumPy

Projects
BrainHire AI
An AI-powered interview prep platform
- Built with React, Node.js, PostgreSQL, Gemini API
- github.com/johndoe/brainhire

Weather Dashboard
Real-time weather application using Flask

Education
B.Tech Computer Science
Delhi Technological University 2018-2022
8.5 CGPA

Certifications
- AWS Certified Solutions Architect
- Google Cloud Professional Data Engineer
- Coursera: Deep Learning Specialization

Skills: Python, JavaScript, React, Node.js, PostgreSQL, Docker, Git`;

parseResume(sample).then(r => {
  console.log('=== PARSE RESULTS ===');
  console.log('Skills flat:', r.all_skills_flat.length, '→', r.all_skills_flat.join(', '));
  console.log('Education:', r.education.length);
  r.education.forEach(e => console.log('  -', e.degree));
  console.log('Experience:', r.experience.length);
  r.experience.forEach(e => console.log('  -', e.role, '@', e.company));
  console.log('Projects:', r.projects.length);
  r.projects.forEach(p => console.log('  -', p.name, '| tech:', p.technologies.join(',')));
  console.log('Certifications:', r.certifications.length);
  r.certifications.forEach(c => console.log('  -', c));
  console.log('Source:', r._source || 'gemini');
  process.exit(0);
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
