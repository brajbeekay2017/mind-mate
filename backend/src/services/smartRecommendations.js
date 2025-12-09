const llm = require('./llm');

async function generateSmartRecommendations(userId, moodData = [], contextInfo = '', fullContext = {}, opts = {}) {
  // Comprehensive fallback recommendations with more variety and detail
  const fallback = {
    recommendations: [
      {
        priority: 'high',
        category: 'Quick Wins',
        title: '5-Minute Breathing Reset',
        description: 'Short breathing breaks reduce acute stress and reset attention.',
        technique: 'Find a quiet spot. Inhale 4s, hold 4s, exhale 6s. Repeat 5 times.',
        duration: '5 min',
        timeOfDay: 'afternoon',
        expectedBenefit: 'Reduce peak stress by ~10%',
        effort: 'easy',
        when: 'When feeling overwhelmed',
        alternatives: 'Try humming (activates vagus nerve)',
        workTip: 'Use during a work break or bathroom break'
      },
      {
        priority: 'high',
        category: 'Movement',
        title: 'Energizing 10-Minute Walk',
        description: 'Movement improves mood, circulation, and reduces stress hormones.',
        technique: 'Walk at brisk pace, swing arms, notice surroundings.',
        duration: '10 min',
        timeOfDay: 'morning or midday',
        expectedBenefit: 'Improve mood by ~12%',
        effort: 'easy',
        when: 'Energy slump or afternoon anxiety',
        alternatives: 'Dancing, stretching, or jumping jacks',
        workTip: 'Take a walk during lunch break or between meetings'
      },
      {
        priority: 'medium',
        category: 'Mindfulness',
        title: 'Body Scan Meditation',
        description: 'Increases body awareness and releases muscle tension.',
        technique: 'Lie down, slowly scan from toes to head, noticing sensations.',
        duration: '10-15 min',
        timeOfDay: 'evening',
        expectedBenefit: 'Improve sleep quality by ~15%',
        effort: 'easy',
        when: 'Before bed or during anxious moments',
        alternatives: 'Guided meditation app (Calm, Headspace)',
        workTip: 'Practice after work to decompress'
      },
      {
        priority: 'medium',
        category: 'Social Connection',
        title: 'Reach Out to Someone',
        description: 'Social connection reduces stress and improves mental health.',
        technique: 'Call, text, or meet a friend. Share how you\'re feeling.',
        duration: '15-30 min',
        timeOfDay: 'flexible',
        expectedBenefit: 'Reduce loneliness, boost mood by ~15%',
        effort: 'medium',
        when: 'Feeling isolated or overwhelmed',
        alternatives: 'Join online community, attend group class',
        workTip: 'Connect with a colleague or team member'
      },
      {
        priority: 'medium',
        category: 'Self-Care',
        title: 'Hydration & Nutrition Check',
        description: 'Dehydration and poor nutrition amplify stress. Small changes matter.',
        technique: 'Drink 1-2 glasses of water. Eat protein-rich snack (nuts, yogurt).',
        duration: '5 min',
        timeOfDay: 'anytime',
        expectedBenefit: 'Stabilize mood and energy by ~8%',
        effort: 'easy',
        when: 'Before/after stressful tasks',
        alternatives: 'Green tea, herbal tea, fresh fruit',
        workTip: 'Keep water and healthy snacks at your desk'
      },
      {
        priority: 'low',
        category: 'Creative',
        title: 'Journaling or Art',
        description: 'Creative expression processes emotions and reduces anxiety.',
        technique: 'Write freely for 10 min, or sketch/paint without judgment.',
        duration: '15-20 min',
        timeOfDay: 'evening',
        expectedBenefit: 'Process emotions, clarify thoughts',
        effort: 'medium',
        when: 'Feeling confused, overwhelmed, or creative',
        alternatives: 'Music, photography, crafting',
        workTip: 'Journal during lunch or after work'
      }
    ],
    summary: 'Start with ONE high-priority recommendation today. Small, consistent actions compound into big changes. You\'ve got this!',
    nextSteps: [
      'Pick your top 3 from above',
      'Schedule them in your calendar',
      'Track how you feel before and after',
      'Adjust based on what works for you'
    ],
    generatedBy: 'Fallback',
    basedOnEntries: moodData.length
  };

  try {
    // Lightweight mode: return a short AI-like summary and one quick recommendation
    if (opts.mode === 'lightweight') {
      const last = moodData[moodData.length - 1];
      const recentMood = last ? last.mood : null;
      const quick = {
        summary: 'Quick coaching: small, immediate actions can help — try a 3–5 minute breathing break and a short walk.',
        analysis: recentMood !== null ? `Latest mood: ${recentMood}/4 — consider immediate quick wins (breathing, hydration).` : 'No mood entries — try a short breathing pause.',
        recommendations: [fallback.recommendations[0]],
        nextSteps: ['Try the breathing reset now', 'Take a 5–10 minute walk']
      };
      quick.generatedBy = 'heuristic';
      quick.basedOnEntries = moodData.length;
      return quick;
    }

    if (llm && (process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY)) {
      const recentMoods = moodData.slice(-14).map(m => `mood:${m.mood},stress:${m.stress}`).join('; ');
      
      // Build AI prompt with full context
      const prompt = `${contextInfo || ''}
Recent mood history (last 14): ${recentMoods}

Generate 6 HIGHLY PERSONALIZED wellness recommendations based on this user's mood patterns, stress levels, activity, and work situation.
Categories: quick wins, movement, mindfulness, social connection, self-care, creative.

IMPORTANT: Make each recommendation:
1. SPECIFIC to their current situation (not generic)
2. PRACTICAL for a working professional
3. TIME-EFFICIENT (5-30 min total)
4. ACTIONABLE with clear steps
5. INCLUDE work-compatible tips

Respond ONLY with valid JSON (no other text):
{
  "recommendations": [
    {
      "priority": "high/medium/low",
      "category": "category name",
      "title": "specific title",
      "description": "why this matters for THEM specifically",
      "technique": "how to do it",
      "duration": "time estimate",
      "timeOfDay": "when to do it",
      "expectedBenefit": "expected outcome",
      "effort": "easy/medium/hard",
      "when": "when to use this",
      "alternatives": "other options",
      "workTip": "how to fit this into work or work breaks"
    }
  ],
  "summary": "personalized encouraging summary",
  "nextSteps": ["step 1", "step 2", "step 3", "step 4"],
  "personalization": {
    "basedOnMood": "why these recommendations",
    "companyBenefit": "how this helps at work"
  }
}`;
      
      console.log('📤 [AI Recommendations] Generating from historical data...');
      const reply = await llm.generateChatReply(prompt);
      const idx = reply.indexOf('{');
      const lastIdx = reply.lastIndexOf('}');
      
      if (idx >= 0 && lastIdx > idx) {
        let jsonStr = reply.slice(idx, lastIdx + 1);
        
        // Clean up common JSON issues
        try {
          const json = JSON.parse(jsonStr);
          console.log('✅ [AI Recommendations] Generated', json.recommendations?.length, 'personalized recommendations');
          json.generatedBy = 'AI';
            if (!json.generatedAt) json.generatedAt = new Date().toISOString();
          json.basedOnEntries = moodData.length;
          return json;
        } catch (parseErr) {
          console.warn('⚠️ [AI Recommendations] JSON parse failed, attempting cleanup:', parseErr.message);
          // Remove control characters and excessive whitespace
          jsonStr = jsonStr.replace(/[\x00-\x1f\x7f]/g, ' ');
          jsonStr = jsonStr.replace(/[\n\r]/g, ' ');
          try {
            const json = JSON.parse(jsonStr);
            console.log('✅ [AI Recommendations] Generated (after cleanup)', json.recommendations?.length, 'recommendations');
            json.generatedBy = 'AI';
              if (!json.generatedAt) json.generatedAt = new Date().toISOString();
            json.basedOnEntries = moodData.length;
            return json;
          } catch (e2) {
            console.warn('⚠️ [AI Recommendations] Cleanup failed too, falling back');
          }
        }
      }
    }
  } catch (e) {
    console.warn('Smart recommendations LLM failed:', e.message);
  }

  return fallback;
}

module.exports = { generateSmartRecommendations };
