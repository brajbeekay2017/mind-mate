// Provider detection and clients (Groq, OpenAI, or Claude via HTTP)

// Ensure dotenv loads before anything else
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let groqClient = null;
let openaiClient = null;
let hasGroq = false;
let hasOpenAI = false;

try {
  const Groq = require('groq-sdk');
  if (process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    hasGroq = true;
    console.log('✅ Groq AI integration ENABLED');
    console.log(`   Model: ${process.env.GROQ_MODEL || 'mixtral-8x7b-32768'}`);
  } else {
    console.log('⚠️  GROQ_API_KEY not found in .env — Groq DISABLED');
  }
} catch (err) {
  console.log('⚠️  Groq SDK failed to load:', err.message);
  hasGroq = false;
}

try {
  const { OpenAI } = require('openai');
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    hasOpenAI = true;
    console.log('✅ OpenAI integration ENABLED');
    console.log(`   Model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
  } else {
    console.log('⚠️  OPENAI_API_KEY not found in .env — OpenAI DISABLED');
  }
} catch (err) {
  console.log('⚠️  OpenAI SDK failed to load:', err.message);
  hasOpenAI = false;
}

const GROQ_MODEL = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'auto').toLowerCase();
const GROQ_SYSTEM_PROMPT = `You are Mind Mate, an empathetic workplace wellness assistant. 
Your role is to:
- Listen actively and validate emotions
- Provide supportive, non-medical guidance
- Keep responses concise (under 70 words) and warm
- Suggest breathing exercises or brief breaks when appropriate
- Never provide medical diagnosis or treatment
- Maintain a calm, understanding tone
- Focus on emotional wellbeing and workplace stress management

IMPORTANT FORMATTING GUIDELINES:
- If the user asks for a list, use markdown bullet points (-)
- If the user asks for numbered steps, use markdown ordered lists (1. 2. 3.)
- If the user asks for a table/comparison, use markdown tables (| header | header |)
- Use **bold** for emphasis and important keywords
- Use clear markdown formatting for readability
- Keep markdown simple and clean
- Always maintain empathetic tone even in formatted content`;

// ============================================
// MAIN: Generate Chat Reply (multi-provider)
// ============================================
async function generateChatReply(message) {
  const tryProviders = LLM_PROVIDER === 'auto' ? ['groq', 'openai', 'claude'] : [LLM_PROVIDER];

  // Helper: attempt Groq
  async function tryGroq() {
    if (!hasGroq || !groqClient) return null;
    try {
      console.log('📤 [Groq] Attempting to generate reply...');
      // Increase token limit for challenge generation
      const isChallenge = message.includes('stress recovery challenge') || message.includes('PERSONALIZED');
      const maxTokens = isChallenge ? 2000 : 500;
      
      const response = await groqClient.chat.completions.create({
        messages: [
          { role: 'system', content: GROQ_SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: 1,
        stream: false
      });
      const reply = response.choices[0]?.message?.content || '';
      console.log(`✅ [Groq] SUCCESS - ${reply.length} chars`);
      return reply.trim();
    } catch (err) {
      console.error('❌ [Groq] ERROR:', err.message || err);
      return null;
    }
  }

  // Helper: attempt OpenAI
  async function tryOpenAI() {
    if (!hasOpenAI || !openaiClient) return null;
    try {
      console.log('📤 [OpenAI] Attempting to generate reply...');
      // Increase token limit for challenge generation
      const isChallenge = message.includes('stress recovery challenge') || message.includes('PERSONALIZED');
      const maxTokens = isChallenge ? 2000 : 500;
      
      const resp = await openaiClient.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: GROQ_SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      });
      const reply = resp.choices?.[0]?.message?.content || '';
      console.log(`✅ [OpenAI] SUCCESS - ${reply.length} chars`);
      return reply.trim();
    } catch (err) {
      console.error('❌ [OpenAI] ERROR:', err.message || err);
      return null;
    }
  }

  // Helper: attempt Claude via generic HTTP call
  async function tryClaude() {
    if (!process.env.CLAUDE_API_KEY || !process.env.CLAUDE_API_URL) return null;
    try {
      let fetchFn = globalThis.fetch;
      if (!fetchFn) {
        try { fetchFn = require('node-fetch'); } catch (e) { fetchFn = null; }
      }
      if (!fetchFn) {
        console.warn('⚠️ No fetch available to call Claude API');
        return null;
      }

      const body = {
        model: process.env.CLAUDE_MODEL || 'claude-4.5-haiku',
        prompt: `${GROQ_SYSTEM_PROMPT}\nUser: ${message}`,
        max_tokens: 500
      };

      const resp = await fetchFn(process.env.CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}`
        },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      // Try to extract a sensible text field from common APIs
      const text = data.output || data.completion || data.response || data.text || (data?.choices?.[0]?.text) || '';
      if (text) {
        console.log('✅ [Claude] SUCCESS');
        return String(text).trim();
      }
      return null;
    } catch (err) {
      console.error('❌ [Claude] ERROR:', err.message || err);
      return null;
    }
  }

  for (const p of tryProviders) {
    let result = null;
    if (p === 'groq') result = await tryGroq();
    if (p === 'openai') result = await tryOpenAI();
    if (p === 'claude') result = await tryClaude();
    if (result) return result;
  }

  // Fallback: Deterministic responses
  console.log('📌 Using FALLBACK response');
  const fallbacks = [
    `Thanks for sharing — I hear you. Take a moment to notice your breath. If you'd like, tell me more and I can help reflect on what might help next.`,
    `It sounds like you're going through something. Remember, it's okay to feel this way. What's one small thing that usually helps you feel better?`,
    `I appreciate you opening up. Your feelings are valid. Consider taking a short break — even 2 minutes of deep breathing can help reset your mind.`,
    `Thank you for trusting me with this. You're doing great by checking in with yourself. What would feel most supportive right now?`
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ============================================
// Generate Summary (Groq Primary)
// ============================================
async function generateSummary(entries) {
  const tryProviders = LLM_PROVIDER === 'auto' ? ['groq', 'openai', 'claude'] : [LLM_PROVIDER];

  const promptSystem = `You are a wellness insights analyst. Analyze mood entries and provide a 4-part summary:\n1. Overview (1-2 sentences about overall pattern)\n2. Trends (observable patterns or changes)\n3. Suggestions (practical, brief wellness tips)\n4. Resources (encourage use of breathing exercise or break)\n\nKeep each section to 1-2 sentences. Be supportive and non-clinical.`;

  const entriesSummary = entries
    .slice(-12)
    .map((e, i) => `Entry ${i + 1}: Mood ${e.mood}/5, Stress ${e.stress}/5`)
    .join('\n');

  async function tryGroqSummary() {
    if (!hasGroq || !groqClient) return null;
    try {
      const response = await groqClient.chat.completions.create({
        messages: [{ role: 'system', content: promptSystem }, { role: 'user', content: `Please analyze these mood entries:\n\n${entriesSummary}` }],
        model: GROQ_MODEL,
        temperature: 0.5,
        max_tokens: 400,
        top_p: 1,
        stream: false
      });
      const summary = response.choices[0]?.message?.content || '';
      return summary.trim();
    } catch (err) {
      console.error('❌ [Groq] Summary error:', err.message || err);
      return null;
    }
  }

  async function tryOpenAISummary() {
    if (!hasOpenAI || !openaiClient) return null;
    try {
      const resp = await openaiClient.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'system', content: promptSystem }, { role: 'user', content: `Please analyze these mood entries:\n\n${entriesSummary}` }],
        temperature: 0.5,
        max_tokens: 600
      });
      const summary = resp.choices?.[0]?.message?.content || '';
      return summary.trim();
    } catch (err) {
      console.error('❌ [OpenAI] Summary error:', err.message || err);
      return null;
    }
  }

  async function tryClaudeSummary() {
    if (!process.env.CLAUDE_API_KEY || !process.env.CLAUDE_API_URL) return null;
    try {
      let fetchFn = globalThis.fetch;
      if (!fetchFn) {
        try { fetchFn = require('node-fetch'); } catch (e) { fetchFn = null; }
      }
      if (!fetchFn) return null;
      const body = {
        model: process.env.CLAUDE_MODEL || 'claude-4.5-haiku',
        prompt: `${promptSystem}\n\nPlease analyze these mood entries:\n\n${entriesSummary}`,
        max_tokens: 800
      };
      const resp = await fetchFn(process.env.CLAUDE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}` },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      const text = data.output || data.completion || data.response || data.text || (data?.choices?.[0]?.text) || '';
      return text ? String(text).trim() : null;
    } catch (err) {
      console.error('❌ [Claude] Summary error:', err.message || err);
      return null;
    }
  }

  for (const p of tryProviders) {
    let result = null;
    if (p === 'groq') result = await tryGroqSummary();
    if (p === 'openai') result = await tryOpenAISummary();
    if (p === 'claude') result = await tryClaudeSummary();
    if (result) return result;
  }

  // Fallback summary
  const count = entries.length;
  const fallbackSummary = `\nOverview: I reviewed your last ${count} entries and noticed some patterns in your mood and stress levels.\n\nTrends: Overall mood shows gentle fluctuations; stress has occasional spikes. You seem to have good and challenging moments throughout your week.\n\nSuggestions: Try short breathing breaks (2-3 min) during peak stress times. A quick walk or stretch can help reset your mind and energy.\n\nResources: A guided breathing exercise is available in the app. Use it anytime you need to pause and recenter.`;

  return fallbackSummary.trim();
}

// ============================================
// Get Provider Info
// ============================================
function getProviderInfo() {
  const provider = (LLM_PROVIDER === 'auto')
    ? (hasGroq ? 'groq' : (hasOpenAI ? 'openai' : (process.env.CLAUDE_API_KEY ? 'claude' : 'fallback')))
    : LLM_PROVIDER;

  return {
    provider,
    model: provider === 'groq' ? GROQ_MODEL : (provider === 'openai' ? OPENAI_MODEL : (process.env.CLAUDE_MODEL || 'claude-4.5-haiku')),
    status: (provider === 'groq' && hasGroq) || (provider === 'openai' && hasOpenAI) || (provider === 'claude' && !!process.env.CLAUDE_API_KEY) ? 'connected' : 'disconnected',
    apiKeyConfigured: provider === 'groq' ? !!process.env.GROQ_API_KEY : (provider === 'openai' ? !!process.env.OPENAI_API_KEY : !!process.env.CLAUDE_API_KEY)
  };
}

module.exports = { 
  generateChatReply, 
  generateSummary,
  getProviderInfo
};
