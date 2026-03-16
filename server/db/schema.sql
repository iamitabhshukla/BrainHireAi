-- BrainHire Database Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  extracted_text TEXT,
  skills_json JSONB DEFAULT '[]',
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
  interview_type VARCHAR(50) DEFAULT 'technical', -- 'technical' | 'hr' | 'mixed'
  status VARCHAR(20) DEFAULT 'in_progress',        -- 'in_progress' | 'completed'
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interview_qa (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT DEFAULT '',
  question_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
  overall_score INTEGER DEFAULT 0,
  technical_score INTEGER DEFAULT 0,
  communication_score INTEGER DEFAULT 0,
  feedback_json JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
