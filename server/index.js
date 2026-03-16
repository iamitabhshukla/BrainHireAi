require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (optional static access)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/resume', require('./routes/resume'));
app.use('/api/interview', require('./routes/interview'));
app.use('/api/analytics', require('./routes/analytics'));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BrainHire API is running 🚀', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const pool = require('./db/pool');

app.listen(PORT, async () => {
  console.log(`\n🚀 BrainHire API running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);

  // Test DB connectivity on startup
  try {
    const res = await pool.query('SELECT NOW()');
    console.log(`✅ PostgreSQL connected — server time: ${res.rows[0].now}`);

    // Check that schema has been applied
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
    );
    const existing = tables.rows.map(r => r.table_name);
    const required = ['users', 'resumes', 'interview_sessions', 'interview_qa', 'analytics'];
    const missing = required.filter(t => !existing.includes(t));

    if (missing.length > 0) {
      console.warn(`⚠️  Missing tables: ${missing.join(', ')}`);
      console.warn('   Run the schema: psql -U postgres -d brainhire_db -f server/db/schema.sql');
    } else {
      console.log('✅ All required database tables are present.\n');
    }
  } catch (dbErr) {
    console.error('\n❌ DATABASE CONNECTION FAILED:', dbErr.message);
    console.error('   Check your DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in server/.env\n');
  }
});

module.exports = app;

