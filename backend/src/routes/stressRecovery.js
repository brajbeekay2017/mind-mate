const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();
const broadcaster = require('../services/broadcast');
const { generateRecoveryChallenge } = require('../services/stressRecovery');
const { getLatestGoogleFitData } = require('../services/googleFit');

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

// Generate a 3-day stress recovery challenge using AI, mood history, and Google Fit data
router.post('/generate', async (req, res) => {
  const userId = req.body.userId || req.query.userId || 'anonymous';
  try {
    // Fetch user's mood history from data.json
    const allData = await readData();
    const moodHistory = getUserData(allData, userId).slice(-30); // Last 30 entries
    
    // Get latest stress level
    const latestEntry = moodHistory[moodHistory.length - 1];
    const latestStress = latestEntry ? latestEntry.stress : 3;
    
    // Build comprehensive contextual info
    let context = {
      moodData: {},
      googleFitData: {},
      workContext: req.body.workContext || 'office', // 'office', 'remote', 'hybrid'
      companyRole: req.body.companyRole || 'general', // for personalization
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
        latestMood: latestEntry?.mood || 3,
        latestStress: latestEntry?.stress || 3,
        totalEntries: moodHistory.length,
        trend: stressLevels.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, stressLevels.length) > 
               stressLevels.slice(-15, -10).reduce((a, b) => a + b, 0) / Math.min(5, stressLevels.length - 10) ? 'increasing' : 'decreasing'
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
- Stress level: ${context.moodData.avgStress || 3}/5 (latest: ${context.moodData.latestStress || 3}/5)
- Mood: ${context.moodData.avgMood || 3}/5 (latest: ${context.moodData.latestMood || 3}/5)
- Stress trend: ${context.moodData.trend || 'stable'}
- Work setting: ${context.workContext}
- Historical entries: ${context.moodData.totalEntries || 0}`;

    if (Object.keys(context.googleFitData).length > 0) {
      contextStr += `
- Steps today: ${context.googleFitData.stepsToday}
- Sleep: ${context.googleFitData.sleepHours}h
- Active minutes: ${context.googleFitData.activeMinutes}`;
    }
    
    const challenge = await generateRecoveryChallenge(
      userId, 
      latestStress, 
      moodHistory, 
      contextStr,
      context // pass full context object
    );
    
    res.json({ challenge });
  } catch (e) {
    console.error('Recovery generation error:', e);
    res.status(500).json({ error: e.message || 'Failed to generate challenge' });
  }
});

// Start a challenge and track it
router.post('/start', async (req, res) => {
  const userId = req.body.userId;
  const challenge = req.body.challenge || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  try {
    // Store challenge progress in data.json
    const allData = await readData();
    if (!allData.challenges) allData.challenges = {};
    if (!allData.challenges[userId]) allData.challenges[userId] = [];
    
    const challengeEntry = {
      id: Date.now().toString(),
      name: challenge.challengeName || 'Challenge',
      startTime: Date.now(),
      status: 'active',
      days: challenge.days?.map(d => ({
        day: d.day,
        completed: false,
        tasks: d.tasks?.map(t => ({ name: t.name, completed: false })) || []
      })) || [],
      dailyProgress: {},
      generatedBy: challenge.generatedBy || 'unknown'
    };
    
    allData.challenges[userId].push(challengeEntry);
    await fs.writeFile(DATA_PATH, JSON.stringify(allData, null, 2));
    
    console.log(`✅ [Challenge] Started: ${challenge.challengeName} for ${userId}`);
    
    broadcaster.publish('stress-recovery', { 
      type: 'start', 
      userId, 
      challengeId: challengeEntry.id,
      challengeName: challenge.challengeName,
      timestamp: Date.now() 
    }, (meta) => {
      return meta && (meta.userId === userId || meta.isAdmin);
    });
    
    res.json({ ok: true, challengeId: challengeEntry.id });
  } catch (e) {
    console.error('Start challenge error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Update task progress
router.post('/task-progress', async (req, res) => {
  const { userId, challengeId, dayNumber, taskName, completed } = req.body;
  if (!userId || !challengeId) return res.status(400).json({ error: 'userId and challengeId required' });
  
  try {
    const allData = await readData();
    if (allData.challenges && allData.challenges[userId]) {
      const challenge = allData.challenges[userId].find(c => c.id === challengeId);
      if (challenge) {
        const day = challenge.days?.find(d => d.day === dayNumber);
        if (day) {
          const task = day.tasks?.find(t => t.name === taskName);
          if (task) {
            task.completed = completed;
            await fs.writeFile(DATA_PATH, JSON.stringify(allData, null, 2));
            console.log(`✅ [Challenge] Task updated: Day ${dayNumber}, ${taskName} = ${completed}`);
            res.json({ ok: true });
            return;
          }
        }
      }
    }
    res.status(404).json({ error: 'Challenge or task not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Complete a challenge day
router.post('/day-complete', async (req, res) => {
  const { userId, challengeId, dayNumber } = req.body;
  if (!userId || !challengeId) return res.status(400).json({ error: 'userId and challengeId required' });
  
  try {
    const allData = await readData();
    if (allData.challenges && allData.challenges[userId]) {
      const challenge = allData.challenges[userId].find(c => c.id === challengeId);
      if (challenge) {
        const day = challenge.days?.find(d => d.day === dayNumber);
        if (day) {
          day.completed = true;
          day.completedTime = Date.now();
          
          // Check if all days are complete
          const allComplete = challenge.days.every(d => d.completed);
          if (allComplete) {
            challenge.status = 'completed';
            challenge.completedTime = Date.now();
            console.log(`🎉 [Challenge] Completed: ${challenge.name} for ${userId}`);
            
            // Move to completed challenges in dashboard
            if (!allData.dashboardData) allData.dashboardData = {};
            if (!allData.dashboardData[userId]) allData.dashboardData[userId] = { completedChallenges: [] };
            allData.dashboardData[userId].completedChallenges = allData.dashboardData[userId].completedChallenges || [];
            allData.dashboardData[userId].completedChallenges.push({
              challengeId: challengeId,
              name: challenge.name,
              completedDate: new Date().toISOString(),
              completedTime: Date.now(),
              daysCompleted: challenge.days.length
            });
          }
          
          await fs.writeFile(DATA_PATH, JSON.stringify(allData, null, 2));
          res.json({ ok: true, allComplete });
          return;
        }
      }
    }
    res.status(404).json({ error: 'Challenge or day not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Complete a full challenge
router.post('/complete', async (req, res) => {
  const userId = req.body.userId;
  const challengeId = req.body.challengeId;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  try {
    const allData = await readData();
    if (allData.challenges && allData.challenges[userId] && challengeId) {
      const challenge = allData.challenges[userId].find(c => c.id === challengeId);
      if (challenge) {
        challenge.status = 'completed';
        challenge.completedTime = Date.now();
      }
    }
    
    await fs.writeFile(DATA_PATH, JSON.stringify(allData, null, 2));
    console.log(`🎉 [Challenge] Completed for ${userId}`);
    
    broadcaster.publish('stress-recovery', { 
      type: 'complete', 
      userId, 
      challengeId,
      timestamp: Date.now() 
    }, (meta) => {
      return meta && (meta.userId === userId || meta.isAdmin);
    });
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Discard a challenge
router.post('/discard', async (req, res) => {
  const userId = req.body.userId;
  const challengeId = req.body.challengeId;
  if (!userId || !challengeId) {
    return res.status(400).json({ error: 'userId and challengeId required' });
  }
  
  try {
    const allData = await readData();
    if (!allData.challenges || !allData.challenges[userId]) {
      return res.status(404).json({ error: 'No challenges found for user' });
    }
    
    const challenge = allData.challenges[userId].find(c => c.id === challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    // Mark as discarded
    challenge.status = 'discarded';
    challenge.discardedTime = Date.now();
    
    await fs.writeFile(DATA_PATH, JSON.stringify(allData, null, 2));
    console.log(`❌ [Challenge] Discarded: ${challenge.name} for ${userId}`);
    
    // Broadcast discard event
    broadcaster.publish('stress-recovery', { 
      type: 'discard', 
      userId, 
      challengeId,
      challengeName: challenge.name,
      timestamp: Date.now() 
    }, (meta) => {
      return meta && (meta.userId === userId || meta.isAdmin);
    });
    
    res.json({ success: true, message: 'Challenge discarded' });
  } catch (e) {
    console.error('Discard challenge error:', e);
    res.status(500).json({ error: e.message || 'Failed to discard challenge' });
  }
});

// Get active challenges
router.get('/active', async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  try {
    const allData = await readData();
    const challenges = allData.challenges?.[userId] || [];
    const active = challenges.filter(c => c.status === 'active' || c.status === 'in-progress');
    res.json({ active, total: challenges.length, completed: challenges.filter(c => c.status === 'completed').length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get challenge history
router.get('/history', async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  try {
    const allData = await readData();
    const challenges = allData.challenges?.[userId] || [];
    res.json({ challenges: challenges.slice(-10) }); // Last 10 challenges
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get dashboard data (completed challenges and stats)
router.get('/dashboard', async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  try {
    const allData = await readData();
    const dashboardData = allData.dashboardData?.[userId] || { completedChallenges: [] };
    const challenges = allData.challenges?.[userId] || [];
    const completedCount = challenges.filter(c => c.status === 'completed').length;
    
    res.json({ 
      completedChallenges: dashboardData.completedChallenges || [],
      totalCompleted: completedCount,
      inProgress: challenges.filter(c => c.status === 'active' || c.status === 'in-progress').length
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
