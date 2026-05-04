const {
  generateInterviewQuestions,
  evaluateAnswer,
  generateFollowUpQuestion,
} = require('./services/geminiService');

async function runTests() {
  console.log('--- Testing generateInterviewQuestions ---');
  try {
    const questions = await generateInterviewQuestions(["React", "Node.js"]);
    console.log('✅ Success! Generated questions:', JSON.stringify(questions, null, 2));
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }

  console.log('\n--- Testing evaluateAnswer ---');
  try {
    const evaluation = await evaluateAnswer(
      "What is React and what is the virtual DOM?", 
      "React is a JavaScript library for building user interfaces. It uses a virtual DOM to optimize rendering by only updating the parts of the actual DOM that have changed."
    );
    console.log('✅ Success! Evaluation:', JSON.stringify(evaluation, null, 2));
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }

  console.log('\n--- Testing generateFollowUpQuestion ---');
  try {
    const followUp = await generateFollowUpQuestion(
      "What is React and what is the virtual DOM?", 
      "React is a JavaScript library for building user interfaces. It uses a virtual DOM to optimize rendering."
    );
    console.log('✅ Success! Follow-up:', JSON.stringify(followUp, null, 2));
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

runTests();
