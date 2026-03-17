require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try multiple models
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-pro'];
    
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say hello');
        console.log(`✅ Model ${modelName} works:`, result.response.text().substring(0, 50));
      } catch (e) {
        console.log(`❌ Model ${modelName} failed:`, e.message.substring(0, 100));
      }
    }
  } catch (e) {
    console.error('Fatal:', e.message);
  }
  process.exit(0);
}
test();
