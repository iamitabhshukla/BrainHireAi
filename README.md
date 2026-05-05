# BrainHire AI — Interview & Hiring Platform

> AI-powered technical & HR interview coach and recruiter hiring platform powered by Google Gemini, built on the PERN stack.

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router, Recharts, Tailwind CSS |
| Backend | Node.js, Express, Multer, pdf-parse, JWT |
| AI | Google Gemini 1.5 Flash |
| Database | PostgreSQL |
| Speech | Web Speech API (browser-native STT + TTS) |

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL running locally

### 2. Database Setup
```sql
-- In psql:
CREATE DATABASE brainhire_db;
\c brainhire_db
\i server/db/schema.sql
```

### 3. Backend
```bash
cd server
copy .env.example .env
# Edit .env — fill in your GEMINI_API_KEY and DB credentials
npm run dev
```
API runs at → `http://localhost:5000`

### 4. Frontend
```bash
cd client
npm run dev
```
App runs at → `http://localhost:5173`

## 📁 Project Structure

```
BrainHireAi/
├── server/
│   ├── db/
│   │   ├── pool.js          # PostgreSQL connection pool
│   │   └── schema.sql       # Database schema
│   ├── middleware/
│   │   └── auth.js          # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js          # Register / Login
│   │   ├── resume.js        # PDF upload + skill extraction
│   │   ├── interview.js     # Session management + Gemini Q generation
│   │   ├── analytics.js     # Scores + dashboard stats
│   │   └── jobs.js          # Recruiter job postings & candidate application flow
│   ├── services/
│   │   └── gemini.js        # Gemini AI: questions, follow-ups, evaluation
│   ├── uploads/             # Uploaded resume PDFs (auto-created)
│   ├── index.js             # Express entry point
│   └── .env.example
│
└── client/
    └── src/
        ├── api/axios.js          # Axios + JWT interceptor
        ├── context/AuthContext.jsx
        ├── components/Navbar.jsx
        ├── pages/
        │   ├── Login.jsx         # Register + Login split-pane
        │   ├── Dashboard.jsx     # Stats, interview type cards, recent sessions
        │   ├── ResumeUpload.jsx  # Drag-and-drop PDF + skill display
        │   ├── Interview.jsx     # AI Q&A with STT/TTS
        │   ├── Analytics.jsx     # Scores, charts, feedback
        │   ├── RecruiterDashboard.jsx # Recruiter job listing panel
        │   ├── PostJob.jsx       # Form to post new jobs
        │   ├── ApplicantsList.jsx# Candidate tracking and AI score sorting
        │   └── ApplyJob.jsx      # Public candidate application flow
        └── index.css             # Dark theme design system
```

## 🎯 Candidate Interview Flow

1. **Apply to Job** — Candidate submits basic info and resume via public invite link
2. **Shadow Account** — System auto-generates a secure temporary account for the candidate
3. **Extract Skills** — Gemini AI identifies skills from the uploaded PDF
4. **Generate Questions** — Personalized questions from Gemini 1.5 Flash
5. **Answer** — Type or speak (Web Speech API STT)
6. **AI Scores** — Gemini evaluates all answers sequentially
7. **Score Routing** — Final AI score is automatically beamed to the Recruiter Dashboard

## 💼 Recruiter Hiring Flow

1. **Post a Job** — Define role, requirements, and capacity limits
2. **Invite Candidates** — Share the generated unique application link
3. **Track Applicants** — View real-time leaderboard of candidates sorted by their AI Interview scores
4. **Actionable Insights** — Click "Details" on any applicant to view full AI feedback, communication scores, and technical breakdown
5. **Make Decisions** — Easily Shortlist or Reject candidates directly from the dashboard

## 🔑 Environment Variables

### `/server/.env`
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brainhire_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey)
