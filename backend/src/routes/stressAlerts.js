const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const router = express.Router();
const DATA_PATH = path.join(__dirname, '..', 'data', 'data.json');

async function readData() {
  await fs.ensureFile(DATA_PATH);
  const raw = await fs.readFile(DATA_PATH, 'utf8').catch(() => '{}');
  try {
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function calculateStressLevel(entries, googleFitData) {
  if (!entries || entries.length === 0) {
    return { level: 'low', score: 0, reasons: [], avgStress: 0, avgMood: 0 };
  }

  const reasons = [];
  let score = 0;

  // Analyze mood history - last 7 entries for trend
  const recentEntries = entries.slice(-7);
  const avgMood = recentEntries.reduce((s, e) => s + (e.mood || 0), 0) / recentEntries.length;
  const avgStress = recentEntries.reduce((s, e) => s + (e.stress || 0), 0) / recentEntries.length;

  // Check mood trend - is it declining?
  if (recentEntries.length >= 3) {
    const lastThree = recentEntries.slice(-3);
    const moodTrend = lastThree[2].mood - lastThree[0].mood; // latest - oldest
    if (moodTrend < -1) {
      reasons.push('Mood trending downward');
      score += 15;
    }
  }

  // Analyze stress levels
  if (avgStress >= 4) {
    reasons.push(`High avg stress: ${avgStress.toFixed(1)}/5`);
    score += 30;
  } else if (avgStress >= 3) {
    reasons.push(`Moderate stress: ${avgStress.toFixed(1)}/5`);
    score += 18;
  } else if (avgStress >= 2) {
    reasons.push(`Mild stress: ${avgStress.toFixed(1)}/5`);
    score += 8;
  }

  // Analyze mood levels (be more lenient)
  if (avgMood <= 0.5) {
    reasons.push(`Very low mood: ${avgMood.toFixed(1)}/4`);
    score += 25;
  } else if (avgMood <= 1.5) {
    reasons.push(`Low mood: ${avgMood.toFixed(1)}/4`);
    score += 12;
  }

  // Check Google Fit biometric data (only if data actually exists)
  if (googleFitData && typeof googleFitData === 'object' && Object.keys(googleFitData).length > 0) {
    const restingHR = googleFitData.restingHeartRate || googleFitData.restingHR;
    const avgHeartRate = googleFitData.avgHeartRate;
    const steps = googleFitData.stepsToday || googleFitData.steps;
    const heartMinutes = googleFitData.heartMinutes;

    // Resting heart rate assessment
    if (restingHR) {
      if (restingHR > 95) {
        reasons.push(`Elevated RHR: ${restingHR} bpm (resting)`);
        score += 20;
      } else if (restingHR > 85) {
        reasons.push(`Slightly elevated RHR: ${restingHR} bpm`);
        score += 8;
      }
    }

    // Average heart rate (indicates activity/stress)
    if (avgHeartRate && avgHeartRate > 110) {
      reasons.push(`High avg heart rate: ${avgHeartRate} bpm`);
      score += 12;
    }

    // Low activity indicators
    if (steps !== undefined && steps < 3000) {
      reasons.push(`Very low activity: ${steps} steps today`);
      score += 8;
    } else if (steps !== undefined && steps < 5000) {
      reasons.push(`Low activity: ${steps} steps today`);
      score += 4;
    }

    // Vigorous activity (stress recovery indicator)
    if (heartMinutes && heartMinutes > 0) {
      // Vigorous activity is positive - reduce stress score
      score = Math.max(0, score - 8);
    }
  }

  let level = 'low';
  if (score >= 55) {
    level = 'very_high';
  } else if (score >= 40) {
    level = 'high';
  } else if (score >= 25) {
    level = 'moderate';
  }

  return { level, score, reasons, avgStress, avgMood, dataPoints: { entries: recentEntries.length, googleFit: googleFitData ? Object.keys(googleFitData).length : 0 } };
}

// POST /alerts/stress-check - calculate stress level for today
router.post('/stress-check', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;
    if (!userId) {
      return res.status(401).json({ error: 'userId required' });
    }

    const allData = await readData();
    const entries = allData[userId] || [];
    const googleFitData = req.body.googleFitData || {};

    console.log(`🚨 [STRESS] User: ${userId}, Total entries: ${entries.length}`);
    const recentEntries = entries.slice(-7);
    console.log(`🚨 [STRESS] Using last 7 entries:`, recentEntries.map(e => ({ mood: e.mood, stress: e.stress, date: e.timestamp })));
    console.log(`🚨 [STRESS] Google Fit data:`, googleFitData);

    const stressAnalysis = calculateStressLevel(entries, googleFitData);

    console.log(`🚨 [STRESS] Result: level=${stressAnalysis.level}, score=${stressAnalysis.score}, reasons=${JSON.stringify(stressAnalysis.reasons)}`);

    return res.json({
      success: true,
      ...stressAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error in stress-check:', e);
    return res.status(500).json({ error: 'Failed to calculate stress level' });
  }
});

module.exports = router;
