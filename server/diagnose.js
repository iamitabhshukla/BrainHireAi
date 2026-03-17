require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runDiagnostic() {
  console.log('\n====== BRAINHIRE UPLOAD DIAGNOSTIC ======\n');

  // 1. Check ENV
  console.log('1. ENV VARIABLES:');
  console.log('   GEMINI_API_KEY set:', !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  console.log('   DB_NAME:', process.env.DB_NAME);
  console.log('   DB_USER:', process.env.DB_USER);

  // 2. Test pdf-parse
  console.log('\n2. PDF-PARSE:');
  try {
    const pdfParse = require('@cyber2024/pdf-parse-fixed');
    console.log('   Type:', typeof pdfParse);
    console.log('   ✅ Import OK');
  } catch (e) {
    console.error('   ❌ Import FAILED:', e.message);
  }

  // 3. Test DB
  console.log('\n3. POSTGRESQL:');
  try {
    const pool = require('./db/pool');
    const res = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name=$1', ['resumes']);
    const cols = res.rows.map(r => r.column_name);
    console.log('   Columns on resumes table:', cols.join(', '));
    console.log('   parsed_json exists:', cols.includes('parsed_json') ? '✅ YES' : '❌ NO — migration not applied');
  } catch (e) {
    console.error('   ❌ DB error:', e.message);
  }

  // 4. Test Gemini
  console.log('\n4. GEMINI API:');
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Reply with exactly: {"ok": true}');
    const text = result.response.text().trim();
    console.log('   Raw response:', text);
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      console.log('   ✅ JSON extracted OK:', match[0]);
    } else {
      console.log('   ❌ No JSON in response');
    }
  } catch (e) {
    console.error('   ❌ Gemini error:', e.message);
  }

  console.log('\n====== END DIAGNOSTIC ======\n');
  process.exit(0);
}

runDiagnostic();
