# BrainHire AI — Interview Preparation Platform

> AI-powered technical & HR interview coach powered by Google Gemini, built on the PERN stack.

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
│
├── server/
│   ├── db/
│   │   ├── pool.js          # PostgreSQL connection pool
│   │   └── schema.sql       # Database schema
│   │
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   │
│   ├── routes/
│   │   ├── auth.js          # Register / Login APIs
│   │   ├── resume.js        # Resume upload + skill extraction
│   │   ├── interview.js     # Interview session + AI question generation
│   │   └── analytics.js     # Score tracking + dashboard analytics
│   │
│   ├── services/
│   │   └── gemini.js        # Gemini AI service (questions, follow-ups, evaluation)
│   │
│   ├── uploads/             # Uploaded resume PDFs (auto-created)
│   │
│   ├── index.js             # Express server entry point
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── client/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   │
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js           # Axios instance + JWT interceptor
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Login / Register UI
│   │   │   ├── Dashboard.jsx      # Interview dashboard
│   │   │   ├── ResumeUpload.jsx   # Resume upload + skill detection
│   │   │   ├── Interview.jsx      # AI interview session
│   │   │   └── Analytics.jsx      # Performance analytics
│   │   │
│   │   ├── main.jsx
│   │   └── index.css              # Global styles / dark theme
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 🎯 7-Step Interview Flow

1. **Login** — JWT-secured auth
2. **Upload Resume** — PDF parsed by multer + pdf-parse
3. **Extract Skills** — Gemini AI identifies skills from resume text
4. **Generate Questions** — Personalized questions from Gemini 1.5 Flash
5. **Answer** — Type or speak (Web Speech API STT)
6. **AI Scores** — Gemini evaluates all answers post-session
7. **Dashboard Feedback** — Recharts visualizations + actionable tips

## 🔑 Environment Variables

### `/server/.env`
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brainhire_db
DB_USER=postgres
DB_PASSWORD=your_database_password
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey)
