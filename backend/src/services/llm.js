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
async function generateSummary(entries, dataContext) {
  const tryProviders = LLM_PROVIDER === 'auto' ? ['groq', 'openai', 'claude'] : [LLM_PROVIDER];

  const promptSystem = `You are a wellness insights analyst for a mood & stress tracking app. Analyze mood entries and provide helpful, data-informed insights.\n\nBe specific, supportive, and non-clinical. Use the provided statistics to ground your analysis.`;

  const entriesSummary = entries
    .slice(-12)
    .map((e, i) => `Entry ${i + 1}: Mood ${e.mood}/4, Stress ${e.stress}/5`)
    .join('\n');
  
  // Build enhanced context with stats
  let statsContext = '';
  if (dataContext) {
    statsContext = `\n\n**Your Stats (last ${dataContext.entriesCount} entries):**
- Average Mood: ${dataContext.avgMood}/4
- Average Stress: ${dataContext.avgStress}/5
- Mood Range: ${dataContext.minMood} to ${dataContext.maxMood}/4
- Peak Stress: ${dataContext.maxStress}/5
- Mood Trend: ${dataContext.trendDirection}
- Mood Distribution: Very Happy: ${dataContext.moodDistribution[4]}, Happy: ${dataContext.moodDistribution[3]}, Neutral: ${dataContext.moodDistribution[2]}, Concerned: ${dataContext.moodDistribution[1]}, Very Sad: ${dataContext.moodDistribution[0]}`;
  }

  const userPrompt = `Please analyze these mood entries and provide insights:\n\n${entriesSummary}${statsContext}\n\nProvide:\n1. Overview of mood and stress patterns\n2. Observable trends and what may be driving them\n3. Practical wellness suggestions based on the data\n4. Encouragement and next steps`;

  async function tryGroqSummary() {
    if (!hasGroq || !groqClient) return null;
    try {
      const response = await groqClient.chat.completions.create({
        messages: [{ role: 'system', content: promptSystem }, { role: 'user', content: userPrompt }],
        model: GROQ_MODEL,
        temperature: 0.6,
        max_tokens: 600,
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
        messages: [{ role: 'system', content: promptSystem }, { role: 'user', content: userPrompt }],
        temperature: 0.6,
        max_tokens: 800
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
        prompt: `${promptSystem}\n\n${userPrompt}`,
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

  // Fallback summary with actual stats
  const count = entries.length;
  const avgM = dataContext?.avgMood || 2;
  const avgS = dataContext?.avgStress || 2.5;
  const trend = dataContext?.trendDirection || 'stable';
  
  const fallbackSummary = `## Your Wellness Summary

**Overview:** I reviewed your last ${count} entries. Your average mood is ${avgM}/4 with an average stress level of ${avgS}/5. Your mood trend is currently ${trend}.

**Patterns & Trends:** You're showing a mix of emotional experiences with occasional stress peaks. This is normal and human—what matters is how you respond to it.

**Wellness Suggestions:** 
- Practice 2-3 minute breathing breaks during stressful moments
- Take short walks or stretch when stress rises above 4/5
- Notice what helps you feel better and do more of that

**Next Steps:** Keep logging your mood—patterns become clearer with more data. Try one small wellness action today (breathing, movement, rest). You've got this! 💪`;

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
  getProviderInfo,
  // generateStressAssessment: returns { assessment, spoken }
  async generateStressAssessment(ctx = {}) {
    const { severity, avgStress, avgMood, googleFitData = {}, entries = [] } = ctx;
    const prompt = `You are an empathetic workplace wellness coach. Produce a JSON object ONLY with two keys: "assessment" and "spoken".\n\nReturn something like:\n{ "assessment": "bullet points or short sentences", "spoken": "one paragraph friendly spoken summary" }\n\nDATA:\n- severity: ${severity}\n- avgStress: ${avgStress}\n- avgMood: ${avgMood}\n- heartPoints: ${googleFitData.heartPoints || googleFitData.heartPointsTotal || ''}\n- restingHR: ${googleFitData.restingHeartRate || googleFitData.restingHeartRateAvg || ''}\nRecent entries (up to 6):\n${(entries || []).slice(-6).map(e => `- ${e.timestamp || ''} mood:${e.mood ?? ''} stress:${e.stress ?? ''}`).join('\n')}\n\nRespond with JSON only.`;
    try {
      const raw = await generateChatReply(prompt);
      // try parse JSON first
      try {
        const parsed = JSON.parse(raw);
        return { assessment: parsed.assessment || JSON.stringify(parsed), spoken: parsed.spoken || '' };
      } catch (e) {
        // fallback: return raw text as assessment and a truncated spoken
        const assessment = raw.split('\n').slice(0, 6).join('\n');
        const spoken = raw.replace(/\n+/g, ' ').trim().slice(0, 800);
        return { assessment, spoken };
      }
    } catch (err) {
      console.error('generateStressAssessment error:', err?.message || err);
      return { assessment: 'Unable to generate AI assessment at this time.', spoken: 'Unable to generate assessment.' };
    }
  }
};
