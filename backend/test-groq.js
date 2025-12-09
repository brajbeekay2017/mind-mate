require('dotenv').config();

async function testGroq() {
  console.log('🧪 Testing Groq AI Integration\n');
  
  // Check environment
  console.log('1️⃣  Environment Check:');
  console.log(`   GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ Found' : '❌ MISSING'}`);
  console.log(`   GROQ_MODEL: ${process.env.GROQ_MODEL || 'mixtral-8x7b-32768'}`);
  
  if (!process.env.GROQ_API_KEY) {
    console.log('\n❌ CRITICAL: GROQ_API_KEY is not set in .env');
    process.exit(1);
  }
  
  // Try to instantiate Groq
  console.log('\n2️⃣  Groq SDK Check:');
  try {
    const Groq = require('groq-sdk');
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    console.log('   ✅ Groq SDK loaded successfully');
    
    // Try actual API call
    console.log('\n3️⃣  API Connection Test:');
    const response = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: 'Say "Groq AI is working!" in 5 words or less.'
        }
      ],
      model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
      max_tokens: 50
    });
    
    console.log('   ✅ API Response received:');
    console.log(`   "${response.choices[0].message.content}"`);
    console.log('\n✅ GROQ AI IS WORKING!');
    
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   - Check GROQ_API_KEY is correct');
    console.log('   - Verify key starts with "gsk_"');
    console.log('   - Check internet connection');
    console.log('   - Verify Groq account has API access');
    process.exit(1);
  }
}

testGroq();