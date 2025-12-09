const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const { generateSmartRecommendations } = require('../services/smartRecommendations');

const DATA_PATH = path.join(__dirname, '..', 'data', 'data.json');

async function readData() {
  await fs.ensureFile(DATA_PATH);
  const raw = await fs.readFile(DATA_PATH, 'utf8').catch(()=> '{}');
  try {
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function getUserData(allData, userId) {
  return allData[userId] || [];
}

// Generate smart recommendations based on mood history and Google Fit data
router.post('/generate', async (req, res) => {
  const userId = req.body.userId || req.query.userId || 'anonymous';
  try {
    // Fetch user's mood history from data.json
    const allData = await readData();
    const moodHistory = getUserData(allData, userId).slice(-30); // Last 30 entries
    
    // Get latest entry
    const latestEntry = moodHistory[moodHistory.length - 1];
    const latestMood = latestEntry ? latestEntry.mood : 3;
    const latestStress = latestEntry ? latestEntry.stress : 3;
    
    // Build comprehensive contextual info
    let context = {
      moodData: {},
      googleFitData: {},
      workContext: req.body.workContext || 'office',
      companyRole: req.body.companyRole || 'general'
    };
    
    // Analyze mood history
    if (moodHistory.length > 0) {
      const stressLevels = moodHistory.map(e => e.stress || 0);
      const moodLevels = moodHistory.map(e => e.mood || 0);
      
      context.moodData = {
        avgMood: (moodLevels.reduce((a, b) => a + b, 0) / moodLevels.length).toFixed(1),
        avgStress: (stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length).toFixed(1),
        maxStress: Math.max(...stressLevels),
        minMood: Math.min(...moodLevels),
        latestMood: latestMood,
        latestStress: latestStress,
        totalEntries: moodHistory.length,
        trend: stressLevels.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, stressLevels.length) > 
               stressLevels.slice(-15, -10).reduce((a, b) => a + b, 0) / Math.min(5, Math.max(1, stressLevels.length - 10)) ? 'increasing' : 'decreasing'
      };
    }
    
    // Add Google Fit data if provided
    if (req.body.googleFitData && Object.keys(req.body.googleFitData).length > 0) {
      context.googleFitData = {
        stepsToday: req.body.googleFitData.steps || 0,
        sleepHours: req.body.googleFitData.sleep || 0,
        activeMinutes: req.body.googleFitData.activeMinutes || 0,
        heartRate: req.body.googleFitData.heartRate || 0
      };
    }
    
    // Create a readable context string for AI
    let contextStr = `User context:
- Mood level: ${context.moodData.avgMood || 3}/5 (latest: ${context.moodData.latestMood || 3}/5)
- Stress level: ${context.moodData.avgStress || 3}/5 (latest: ${context.moodData.latestStress || 3}/5)
- Stress trend: ${context.moodData.trend || 'stable'}
- Work setting: ${context.workContext}
- Historical entries: ${context.moodData.totalEntries || 0}`;

    if (Object.keys(context.googleFitData).length > 0) {
      contextStr += `
- Steps today: ${context.googleFitData.stepsToday}
- Sleep: ${context.googleFitData.sleepHours}h
- Active minutes: ${context.googleFitData.activeMinutes}`;
    }
    
    const mode = req.body.mode || 'full';
    const recommendations = await generateSmartRecommendations(userId, moodHistory, contextStr, context, { mode });
    // Ensure response is structured and include generatedAt
    const out = (recommendations && typeof recommendations === 'object') ? recommendations : { summary: String(recommendations) };
    if (!out.generatedAt) out.generatedAt = new Date().toISOString();
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to generate recommendations' });
  }
});

module.exports = router;
