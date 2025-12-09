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
  const last12 = entries.slice(-12);
  try {
    const summaryText = await llm.generateSummary(last12);
    
    // ✅ Return summary as plain text string, not wrapped
    res.json({ 
      summary: summaryText,  // Plain string from Groq
      success: true,
      entriesAnalyzed: last12.length
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
