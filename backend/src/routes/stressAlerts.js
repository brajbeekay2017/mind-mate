const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const stressEvaluator = require('../services/stressEvaluator');
const llm = require('../services/llm');

const router = express.Router();
const DATA_PATH = path.join(__dirname, '..', 'data', 'data.json');

async function readData() {
  await fs.ensureFile(DATA_PATH);
  const raw = await fs.readFile(DATA_PATH, 'utf8').catch(() => '{}');
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function writeData(obj) {
  await fs.ensureFile(DATA_PATH);
  await fs.writeFile(DATA_PATH, JSON.stringify(obj, null, 2));
}

// POST /alerts/stress-check
router.post('/stress-check', async (req, res) => {
  const userId = req.body.userId || req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const googleFitData = req.body.googleFitData || {};
  try {
    const all = await readData();
    const entries = Array.isArray(all[userId]) ? all[userId] : [];

    const detector = stressEvaluator.evaluate(entries, googleFitData);

    const ai = await llm.generateStressAssessment({
      userId,
      entries,
      googleFitData,
      severity: detector.severity,
      avgStress: detector.avgStress,
      avgMood: detector.avgMood
    });

    // persist last alert in dashboardData
    try {
      all.dashboardData = all.dashboardData || {};
      all.dashboardData[userId] = all.dashboardData[userId] || {};
      all.dashboardData[userId].lastStressAlert = {
        at: new Date().toISOString(),
        severity: detector.severity,
        reasons: detector.reasons,
        assessment: ai.assessment
      };
      await writeData(all);
    } catch (e) {
      console.error('Failed to persist stress alert', e.message || e);
    }

    return res.json({
      severity: detector.severity,
      reasons: detector.reasons,
      assessment: ai.assessment,
      spoken: ai.spoken
    });
  } catch (err) {
    console.error('Stress check error:', err.message || err);
    return res.status(500).json({ error: 'Failed to run stress check' });
  }
});

module.exports = router;
