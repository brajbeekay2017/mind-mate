const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const llm = require('../services/llm');

const router = express.Router();
const DATA_PATH = path.join(__dirname, '..', 'data', 'data.json');

// Middleware to extract userId from query
function extractUserId(req, res, next) {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(401).json({ error: 'userId required' });
  }
  req.userId = userId;
  next();
}

router.use(extractUserId);

async function readData() {
  await fs.ensureFile(DATA_PATH);
  const raw = await fs.readFile(DATA_PATH, 'utf8').catch(() => '{}');
  try {
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function getUserData(allData, userId) {
  return allData[userId] || [];
}

router.get('/', async (req, res) => {
  const allData = await readData();
  const entries = getUserData(allData, req.userId);
  const last12 = entries.slice(-10);
  
  console.log(`📊 [SUMMARY] User: ${req.userId}, Total entries: ${entries.length}, Using last 12: ${last12.length}`);
  console.log(`📊 [SUMMARY] Last 10 entries:`, last12.map(e => ({ mood: e.mood, stress: e.stress, date: e.timestamp })));
  
  // Calculate mood and stress statistics
  const moodScores = last12.map(e => e.mood);
  const stressScores = last12.map(e => e.stress);
  const avgMood = moodScores.length > 0 ? (moodScores.reduce((a, b) => a + b, 0) / moodScores.length).toFixed(2) : 0;
  const avgStress = stressScores.length > 0 ? (stressScores.reduce((a, b) => a + b, 0) / stressScores.length).toFixed(2) : 0;
  const maxStress = stressScores.length > 0 ? Math.max(...stressScores) : 0;
  const minMood = moodScores.length > 0 ? Math.min(...moodScores) : 0;
  const maxMood = moodScores.length > 0 ? Math.max(...moodScores) : 0;
  
  // Count mood distribution
  const moodDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  moodScores.forEach(m => moodDist[m]++);
  
  const dataContext = {
    entriesCount: last12.length,
    avgMood: parseFloat(avgMood),
    avgStress: parseFloat(avgStress),
    maxStress,
    minMood,
    maxMood,
    moodDistribution: moodDist,
    trendDirection: last12.length > 1 ? (moodScores[last12.length - 1] > moodScores[0] ? 'improving' : 'declining') : 'stable'
  };
  
  try {
    const summaryText = await llm.generateSummary(last12, dataContext);
    
    res.json({ 
      summary: summaryText,
      success: true,
      entriesAnalyzed: last12.length,
      stats: dataContext
    });
  } catch (err) {
    console.error('Summary generation error:', err);
    res.status(500).json({ 
      error: 'Failed to generate summary',
      details: err.message
    });
  }
});

module.exports = router;
