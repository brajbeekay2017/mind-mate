const llm = require('./llm');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Path to data file
const dataFilePath = path.join(__dirname, '../data/data.json');

// Helper function to read data
function readData() {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath);
        return JSON.parse(data);
    }
    return { challenges: {} };
}

// Helper function to write data
function writeData(data) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

/**
 * Generate a 3-day recovery challenge using AI as primary generator
 * Falls back to data-driven personalization only if LLM unavailable
 * 
 * @param {string} userId - User identifier
 * @param {number} latestStress - Current stress level (1-5)
 * @param {Array} moodHistory - Historical mood/stress entries
 * @param {string} contextInfo - Readable context about user's patterns
 * @param {object} fullContext - Detailed context object with mood data and google fit
 */
async function generateRecoveryChallenge(userId, latestStress = 3, moodHistory = [], contextInfo = '', fullContext = {}) {
  // Try AI generation FIRST - this should be the primary path
  try {
    if (llm && typeof llm.generateChatReply === 'function' && (process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY)) {
      // Build rich AI prompt using historical data and work context
      const aiPrompt = buildAIPrompt(moodHistory, contextInfo, fullContext, latestStress);
      
      console.log('📤 [AI Recovery] Generating challenge from historical data...');
      const response = await llm.generateChatReply(aiPrompt);
      
      // Parse JSON from response - more lenient parsing
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        let jsonText = response.slice(jsonStart, jsonEnd + 1);
        
        // Clean up common JSON issues from LLM output
        try {
          // Try direct parse first
          const challenge = JSON.parse(jsonText);
          console.log('✅ [AI Recovery] Generated challenge:', challenge.challengeName);
          challenge.generatedBy = 'AI';
          challenge.basedOnEntries = moodHistory.length;
          return challenge;
        } catch (parseErr) {
          console.warn('⚠️ [AI Recovery] JSON parse failed, attempting cleanup:', parseErr.message);
          
          // Try to fix common issues:
          // 1. Remove control characters
          jsonText = jsonText.replace(/[\x00-\x1f\x7f]/g, ' ');
          // 2. Fix unescaped newlines in strings
          jsonText = jsonText.replace(/[\n\r]/g, ' ');
          
          try {
            const challenge = JSON.parse(jsonText);
            console.log('✅ [AI Recovery] Generated challenge (after cleanup):', challenge.challengeName);
            challenge.generatedBy = 'AI';
            challenge.basedOnEntries = moodHistory.length;
            return challenge;
          } catch (e2) {
            console.warn('⚠️ [AI Recovery] Cleanup failed too, falling back to data-driven');
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ [AI Recovery] LLM generation failed:', e.message);
  }

  // Fallback: Data-driven personalization
  console.log('📊 [Recovery] Using data-driven fallback...');
  return createDataDrivenChallenge(moodHistory, fullContext || {});
}

/**
 * Build comprehensive prompt for AI challenge generation
 */
function buildAIPrompt(moodHistory, contextInfo, fullContext, latestStress) {
  const recentMoods = moodHistory.slice(-14).map(m => `mood=${m.mood},stress=${m.stress}`).join(' | ');
  
  let prompt = `You are an expert corporate wellness coach. Generate a HIGHLY PERSONALIZED 3-day stress recovery challenge.

${contextInfo}

Recent mood history (last 14): ${recentMoods || 'no data'}

IMPORTANT: Create a challenge that is:
1. SPECIFIC to this user's historical patterns (not generic)
2. PRACTICAL for a working professional (office/remote/hybrid work)
3. TIME-EFFICIENT (15-40 min total per day)
4. ACTIONABLE with clear steps they can do at work or home
5. PROGRESSIVE (each day builds on previous)

Consider if needed:
- High stress? Focus on nervous system reset and emotional release
- Low mood? Focus on activation, movement, and connection
- Increasing stress? Early intervention to prevent burnout
- Low activity? Include movement-based challenges
- Sleep issues? Include restorative practices

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "challengeName": "Specific, personalized name reflecting their situation",
  "difficulty": "easy/medium/hard",
  "description": "1-2 sentences about this personalized challenge",
  "overview": "3-4 sentences explaining why these practices are chosen for THEM specifically",
  "targetReduction": "expected % reduction",
  "duration": "total time estimate",
  "prerequisites": "what they need (quiet space, etc)",
  "workContext": "considerations for their work situation",
  "days": [
    {
      "day": 1,
      "theme": "day theme",
      "tagline": "motivational phrase",
      "objective": "specific goal",
      "workCompatibility": "how to fit this into work/remote schedule",
      "tasks": [
        {
          "name": "task name",
          "duration": "time",
          "technique": "specific method",
          "impact": "%",
          "steps": ["step1", "step2", "step3"],
          "workTip": "how to do at work or during work breaks",
          "alternatives": "options for different situations"
        }
      ],
      "expectedReduction": 15,
      "affirmation": "personalized affirmation"
    }
  ],
  "totalExpectedReduction": 35,
  "successRate": "80%+",
  "companyBenefits": ["productivity boost", "reduced burnout", "better focus"],
  "tips": ["tip1", "tip2", "tip3", "tip4"],
  "followUp": "what to do after 3 days",
  "personalization": {
    "basedOnEntries": ${moodHistory.length},
    "lastStressLevel": ${latestStress},
    "recommendation": "why this specific challenge for them"
  }
}`;

  return prompt;
}

/**
 * Data-driven fallback when LLM unavailable
 */
function createDataDrivenChallenge(moodHistory, fullContext) {
  if (!moodHistory || moodHistory.length === 0) {
    return createDefaultChallenge();
  }

  const moodData = fullContext.moodData || {};
  const googleFitData = fullContext.googleFitData || {};
  
  // Analyze patterns
  const stressLevels = moodHistory.map(h => h.stress || 0);
  const moodLevels = moodHistory.map(h => h.mood || 0);
  
  const avgStress = moodData.avgStress || (stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length);
  const avgMood = moodData.avgMood || (moodLevels.reduce((a, b) => a + b, 0) / moodLevels.length);
  const trend = moodData.trend || 'stable';
  
  const isHighStress = avgStress >= 4;
  const isLowMood = avgMood <= 2;
  const isIncreasingStress = trend === 'increasing';
  const lowActivity = googleFitData.stepsToday && googleFitData.stepsToday < 3000;
  const poorSleep = googleFitData.sleepHours && googleFitData.sleepHours < 6;
  
  // Determine challenge type
  let challenge = {
    generatedBy: 'DataDriven',
    basedOnEntries: moodHistory.length,
    personalization: {
      avgStress: avgStress.toFixed(1),
      avgMood: avgMood.toFixed(1),
      pattern: '',
      recommendation: ''
    }
  };

  if (isHighStress && isLowMood) {
    challenge = {
      ...challenge,
      challengeName: 'Deep Recovery: High Stress + Low Mood Reset',
      difficulty: 'medium',
      description: 'Your data shows sustained high stress with low mood. This intensive plan focuses on nervous system reset and mood elevation.',
      overview: `You've been experiencing average stress of ${avgStress.toFixed(1)}/5 with mood around ${avgMood.toFixed(1)}/5. This 3-day challenge combines physical release, emotional processing, and mood activation.`,
      targetReduction: '30-40%',
      totalExpectedReduction: 35,
      workContext: 'Can be done before/after work or during weekend',
      personalization: {
        ...challenge.personalization,
        pattern: 'High stress + Low mood',
        recommendation: 'Intensive approach with nervous system reset + mood elevation'
      }
    };
  } else if (isHighStress) {
    challenge = {
      ...challenge,
      challengeName: 'Stress Release Intensive',
      difficulty: 'medium',
      description: 'Your stress levels are elevated at ' + avgStress.toFixed(1) + '/5. This plan focuses on physical release and nervous system calming.',
      overview: `Recent stress trend is ${trend}. We're designing a focused 3-day intervention to discharge stress and build resilience.`,
      targetReduction: '25-35%',
      totalExpectedReduction: 30,
      workContext: 'Includes work-break compatible exercises and end-of-day rituals',
      personalization: {
        ...challenge.personalization,
        pattern: 'High stress',
        recommendation: 'Physical release + nervous system reset'
      }
    };
  } else if (isLowMood) {
    challenge = {
      ...challenge,
      challengeName: 'Mood Elevation: Connection + Activation Challenge',
      difficulty: 'easy',
      description: 'Your mood has been low recently at ' + avgMood.toFixed(1) + '/5. This plan combines movement, social connection, and gratitude.',
      overview: `Let's focus on natural mood elevators: movement, sunlight, connection, and purpose. This 3-day challenge builds momentum toward joy.`,
      targetReduction: '20-30%',
      totalExpectedReduction: 25,
      workContext: 'Includes lunch break activities and social connections with colleagues',
      personalization: {
        ...challenge.personalization,
        pattern: 'Low mood',
        recommendation: 'Activation + social connection + movement'
      }
    };
  } else if (isIncreasingStress) {
    challenge = {
      ...challenge,
      challengeName: 'Early Intervention: Stop Stress Spiral',
      difficulty: 'easy',
      description: 'Your stress is trending upward. Early intervention now prevents burnout later.',
      overview: `Your stress trend is ${trend}. This 3-day challenge helps you interrupt the spiral with boundary-setting, daily practices, and stress awareness.`,
      targetReduction: '15-25%',
      totalExpectedReduction: 20,
      workContext: 'Quick wins that fit into busy schedules',
      personalization: {
        ...challenge.personalization,
        pattern: 'Increasing stress',
        recommendation: 'Early intervention + boundary setting + daily practices'
      }
    };
  } else if (lowActivity || poorSleep) {
    challenge = {
      ...challenge,
      challengeName: 'Energy & Restoration Challenge',
      difficulty: 'easy',
      description: 'Your activity and sleep patterns suggest need for restoration. This plan restores energy through movement and sleep optimization.',
      overview: 'We\'re focusing on sustainable energy through better sleep, movement, and daily rhythms.',
      targetReduction: '20-25%',
      totalExpectedReduction: 22,
      workContext: 'Focus on work schedule optimization',
      personalization: {
        ...challenge.personalization,
        pattern: 'Low activity/sleep',
        recommendation: 'Movement + sleep + energy restoration'
      }
    };
  } else {
    return createDefaultChallenge();
  }

  // Add common structure
  challenge.successRate = challenge.difficulty === 'easy' ? '80-90%' : '70-80%';
  challenge.duration = '3 days (30-60 min total)';
  challenge.prerequisites = 'Quiet space, commitment to 15-20 min daily';
  challenge.days = generateChallengeDays(challenge, moodHistory, fullContext);
  challenge.tips = [
    'Progress over perfection—adapt to your schedule',
    'Track your mood before and after each session',
    'Repeat this monthly or when stress rises',
    'Combine with 20+ min movement for better results'
  ];
  challenge.companyBenefits = ['Improved focus', 'Better productivity', 'Reduced burnout', 'Enhanced wellbeing'];
  challenge.followUp = 'After day 3, maintain 1-2 daily practices. Repeat this challenge monthly.';

  return challenge;
}

/**
 * Generate challenge days based on challenge type
 */
function generateChallengeDays(challenge, moodHistory, fullContext) {
  const pattern = challenge.personalization.pattern;
  
  if (pattern.includes('High stress') && pattern.includes('Low mood')) {
    return generateIntensiveDays();
  } else if (pattern.includes('High stress')) {
    return generateStressReleaseDays();
  } else if (pattern.includes('Low mood')) {
    return generateMoodElevationDays();
  } else if (pattern.includes('Increasing')) {
    return generatePreventativeDays();
  } else {
    return generateBalancedDays();
  }
}

// Generate day templates
function generateIntensiveDays() {
  return [
    {
      day: 1,
      theme: 'Release',
      tagline: 'Let out what\'s been building',
      objective: 'Full nervous system reset through safe release',
      workCompatibility: 'Best done after work or on weekend',
      tasks: [
        {
          name: 'Power Release (Shaking)',
          duration: '10 min',
          technique: 'Controlled shaking to release trapped energy',
          impact: '30%',
          steps: ['Stand comfortably', 'Shake entire body vigorously', 'Let tension flow out', 'Take deep breaths'],
          workTip: 'Do privately, maybe in car or at home',
          alternatives: 'Vigorous exercise like dancing or running'
        },
        {
          name: 'Extended Exhale Breathing',
          duration: '8 min',
          technique: 'Exhale longer than inhale to calm nervous system',
          impact: '20%',
          steps: ['Breathe in 4 counts', 'Exhale 8 counts', 'Repeat 10 times'],
          workTip: 'Can do at desk with eyes closed',
          alternatives: 'Box breathing or 4-7-8 technique'
        }
      ],
      expectedReduction: 25,
      affirmation: 'I release what I cannot control'
    },
    {
      day: 2,
      theme: 'Reground',
      tagline: 'Find your center',
      objective: 'Reconnect to present moment and build resilience',
      workCompatibility: 'Lunch break or after work',
      tasks: [
        {
          name: 'Mindful Movement',
          duration: '15 min',
          technique: 'Slow, intentional movement like walk or yoga',
          impact: '20%',
          steps: ['Move slowly', 'Notice sensations', 'Engage all senses', 'Stay present'],
          workTip: 'Walk outside during lunch, notice surroundings',
          alternatives: 'Yoga, tai chi, stretching'
        },
        {
          name: 'Connection',
          duration: '10 min',
          technique: 'Meaningful interaction with someone',
          impact: '15%',
          steps: ['Call or meet someone', 'Be honest about feelings', 'Listen genuinely'],
          workTip: 'Coffee with colleague or quick call to friend',
          alternatives: 'Journal, meditation, or gratitude practice'
        }
      ],
      expectedReduction: 20,
      affirmation: 'I am grounded and resilient'
    },
    {
      day: 3,
      theme: 'Reflect & Reset',
      tagline: 'Learn and plan forward',
      objective: 'Process patterns and create sustainable change',
      workCompatibility: 'Evening reflection',
      tasks: [
        {
          name: 'Pattern Journal',
          duration: '12 min',
          technique: 'Write about stress triggers and patterns',
          impact: '15%',
          steps: ['What triggered stress?', 'What helped most?', 'What will I do differently?'],
          workTip: 'Identify work triggers specifically',
          alternatives: 'Voice memo or discussion with trusted person'
        },
        {
          name: 'Action Planning',
          duration: '8 min',
          technique: 'Define 2-3 concrete changes',
          impact: '10%',
          steps: ['Pick one work boundary to set', 'Choose one daily practice', 'Schedule it'],
          workTip: 'Set calendar reminders for daily practices',
          alternatives: 'Create accountability with colleague'
        }
      ],
      expectedReduction: 15,
      affirmation: 'I am learning, growing, and taking control'
    }
  ];
}

function generateStressReleaseDays() {
  return [
    {
      day: 1,
      theme: 'Physical Release',
      tagline: 'Move stress out of your body',
      objective: 'Discharge stress through vigorous movement',
      workCompatibility: 'After work or morning routine',
      tasks: [
        {
          name: 'Vigorous Exercise',
          duration: '15 min',
          technique: 'High-intensity activity of choice',
          impact: '25%',
          steps: ['Choose activity you enjoy', 'Go at 70% intensity', 'Push yourself', 'Breathe deeply'],
          workTip: 'Gym, run, cycling, or home workout',
          alternatives: 'HIIT, dance, sports'
        },
        {
          name: 'Cold Reset',
          duration: '2 min',
          technique: 'Cold splash or cold shower',
          impact: '10%',
          steps: ['Cold water on face or full shower', 'Breathe through it', 'Notice the reset'],
          workTip: 'Splash face at sink if at office',
          alternatives: 'Breathing exercise'
        }
      ],
      expectedReduction: 18,
      affirmation: 'My body is strong and capable'
    },
    {
      day: 2,
      theme: 'Recentering',
      tagline: 'Return to calm',
      objective: 'Stabilize nervous system and find peace',
      workCompatibility: 'Lunch or evening',
      tasks: [
        {
          name: 'Nature or Grounding',
          duration: '15 min',
          technique: 'Be outside, preferably barefoot on earth',
          impact: '18%',
          steps: ['Go outside', 'Barefoot if possible', 'Engage senses', 'Breathe naturally'],
          workTip: 'Park walk during lunch, notice trees and sky',
          alternatives: 'Indoor meditation or indoor plants'
        },
        {
          name: 'Guided Meditation',
          duration: '10 min',
          technique: 'Follow guided audio',
          impact: '12%',
          steps: ['Use app (Calm, Headspace, Insight Timer)', 'Follow along', 'Let thoughts pass'],
          workTip: 'Use headphones at desk or after work',
          alternatives: 'Peaceful music and breathing'
        }
      ],
      expectedReduction: 15,
      affirmation: 'I am calm and grounded'
    },
    {
      day: 3,
      theme: 'Planning & Prevention',
      tagline: 'Build resilience',
      objective: 'Create sustainable practices',
      workCompatibility: 'Weekly planning session',
      tasks: [
        {
          name: 'Trigger Identification',
          duration: '10 min',
          technique: 'Identify stress sources you can control',
          impact: '12%',
          steps: ['List top 3 stressors', 'Which can you control?', 'Plan actions for those'],
          workTip: 'Identify work-specific triggers and boundaries',
          alternatives: 'Discussion with manager/mentor'
        },
        {
          name: 'Daily Practice Commitment',
          duration: '5 min',
          technique: 'Choose and schedule one practice',
          impact: '8%',
          steps: ['Pick 1 practice from days 1-2', 'Schedule daily (same time)', 'Set reminder', 'Commit for 21 days'],
          workTip: 'Morning or lunch break practice',
          alternatives: 'Weekly team wellness activity'
        }
      ],
      expectedReduction: 12,
      affirmation: 'I am building a resilient, balanced life'
    }
  ];
}

function generateMoodElevationDays() {
  return [
    {
      day: 1,
      theme: 'Activation',
      tagline: 'Wake up and feel alive',
      objective: 'Break inertia and activate body and mind',
      workCompatibility: 'Morning routine',
      tasks: [
        {
          name: 'Sunlight + Movement',
          duration: '15 min',
          technique: 'Get natural light and move your body',
          impact: '20%',
          steps: ['Get outside in morning light', 'Move for 10 minutes', 'Breathe fresh air', 'Feel the aliveness'],
          workTip: 'Walk to work or morning jog, or stand by window',
          alternatives: 'Light therapy lamp + indoor movement'
        },
        {
          name: 'Cold Water Activation',
          duration: '3 min',
          technique: 'Cold water splash',
          impact: '10%',
          steps: ['Splash face with cold water', 'Feel the jolt', 'Notice alertness increase'],
          workTip: 'Cold shower or splash at sink',
          alternatives: 'Splash with cool water'
        }
      ],
      expectedReduction: 15,
      affirmation: 'I am awake and alive'
    },
    {
      day: 2,
      theme: 'Connection',
      tagline: 'Feel supported and valued',
      objective: 'Elevate mood through genuine connection',
      workCompatibility: 'Work relationships',
      tasks: [
        {
          name: 'Meaningful Interaction',
          duration: '20 min',
          technique: 'Quality time with someone you value',
          impact: '20%',
          steps: ['Connect with colleague or friend', 'Have real conversation', 'Share authentically', 'Listen deeply'],
          workTip: 'Lunch with colleague, team coffee, or phone call',
          alternatives: 'Online group, community activity'
        },
        {
          name: 'Acts of Kindness',
          duration: '10 min',
          technique: 'Help someone or do something kind',
          impact: '15%',
          steps: ['Help colleague', 'Buy coffee for someone', 'Give genuine compliment'],
          workTip: 'Help team member, give recognition, mentor junior',
          alternatives: 'Volunteer, community service'
        }
      ],
      expectedReduction: 17,
      affirmation: 'I am connected and valued'
    },
    {
      day: 3,
      theme: 'Momentum',
      tagline: 'Build positive energy',
      objective: 'Create momentum toward joy',
      workCompatibility: 'Weekly planning',
      tasks: [
        {
          name: 'Small Wins Planning',
          duration: '10 min',
          technique: 'Plan 3 small, enjoyable activities this week',
          impact: '12%',
          steps: ['List things you WANT to do', 'Make them achievable', 'Schedule them', 'Anticipate enjoyment'],
          workTip: 'Include work social events or hobbies',
          alternatives: 'Create vision board or goals'
        },
        {
          name: 'Gratitude & Vision',
          duration: '10 min',
          technique: 'Gratitude + positive future vision',
          impact: '12%',
          steps: ['List 3 things you\'re grateful for', 'Include small wins from this week', 'Visualize good future', 'Feel the shift'],
          workTip: 'Include appreciation for colleagues/work wins',
          alternatives: 'Write thank you notes, appreciation emails'
        }
      ],
      expectedReduction: 14,
      affirmation: 'I am building momentum and moving toward joy'
    }
  ];
}

function generatePreventativeDays() {
  return [
    {
      day: 1,
      theme: 'Interrupt',
      tagline: 'Stop the spiral before it escalates',
      objective: 'Immediate de-escalation',
      workCompatibility: 'During work as needed',
      tasks: [
        {
          name: 'Quick Reset',
          duration: '10 min',
          technique: 'Immediate stress interrupt',
          impact: '15%',
          steps: ['Box breathing 5 min', 'Quick walk 5 min', 'Notice the shift'],
          workTip: 'Do in office bathroom, quiet space, or during break',
          alternatives: 'Cold water splash, step outside'
        },
        {
          name: 'Boundary Setting',
          duration: '5 min',
          technique: 'Set one boundary TODAY',
          impact: '10%',
          steps: ['Identify what\'s adding stress', 'Say no to one non-essential thing', 'Protect your energy'],
          workTip: 'Decline a meeting, delegate a task, or set office hours',
          alternatives: 'Talk to manager about workload'
        }
      ],
      expectedReduction: 12,
      affirmation: 'I am taking control now'
    },
    {
      day: 2,
      theme: 'Protect',
      tagline: 'Build daily defenses',
      objective: 'Create daily practices',
      workCompatibility: 'Built into work day',
      tasks: [
        {
          name: 'Morning Centering',
          duration: '10 min',
          technique: 'Start day with intention',
          impact: '12%',
          steps: ['Before email/messages', 'Breathing + intention', 'Visualize handling day calmly'],
          workTip: 'Before opening computer or arriving at office',
          alternatives: 'Journaling or meditation'
        },
        {
          name: 'Midday Reset',
          duration: '5 min',
          technique: 'Quick reset in afternoon',
          impact: '8%',
          steps: ['Lunch time pause', 'Quick walk or breathing', 'Reset before afternoon'],
          workTip: 'During lunch or 3pm slump',
          alternatives: 'Micro-meditation, stretch break'
        }
      ],
      expectedReduction: 10,
      affirmation: 'I am protecting my peace'
    },
    {
      day: 3,
      theme: 'Sustain',
      tagline: 'Build long-term resilience',
      objective: 'Design sustainable practices',
      workCompatibility: 'Weekly practice',
      tasks: [
        {
          name: 'Weekly Review',
          duration: '15 min',
          technique: 'Plan week with stress buffers',
          impact: '8%',
          steps: ['Look at week', 'Identify peak stress times', 'Schedule breaks before them', 'Add 2-3 self-care activities'],
          workTip: 'Friday afternoon or Sunday evening planning',
          alternatives: 'Use calendar to block recovery time'
        },
        {
          name: 'Practice Commitment',
          duration: '5 min',
          technique: 'Commit to daily 15-min practice',
          impact: '8%',
          steps: ['Choose one practice', 'Schedule daily', 'Set phone reminder', 'Track for 21 days'],
          workTip: 'Calendar block, team accountability, or app reminder',
          alternatives: 'Team wellness challenge'
        }
      ],
      expectedReduction: 8,
      affirmation: 'I am committed to my wellbeing'
    }
  ];
}

function generateBalancedDays() {
  return [
    {
      day: 1,
      theme: 'Ground',
      tagline: 'Find your center',
      objective: 'Baseline centering practice',
      workCompatibility: 'Anytime',
      tasks: [
        {
          name: 'Grounding Meditation',
          duration: '10 min',
          technique: '5-4-3-2-1 sensory technique',
          impact: '15%',
          steps: ['5 things you see', '4 things you feel', '3 things you hear', '2 things you smell', '1 thing you taste'],
          workTip: 'Can do at desk or break room',
          alternatives: 'Mindful walking'
        },
        {
          name: 'Breathing Practice',
          duration: '5 min',
          technique: 'Simple box breathing',
          impact: '10%',
          steps: ['Inhale 4, hold 4, exhale 4, hold 4', 'Repeat 5 times'],
          workTip: 'Morning or before important meetings',
          alternatives: 'Other breathing techniques'
        }
      ],
      expectedReduction: 12,
      affirmation: 'I am grounded and calm'
    },
    {
      day: 2,
      theme: 'Move',
      tagline: 'Energize and reset',
      objective: 'Movement for mental clarity',
      workCompatibility: 'Work break or after work',
      tasks: [
        {
          name: 'Mindful Movement',
          duration: '15 min',
          technique: 'Yoga, walking, or stretching',
          impact: '15%',
          steps: ['Choose activity', 'Move with intention', 'Notice how you feel'],
          workTip: 'Lunch walk or after-work yoga',
          alternatives: 'Dance, sports, or gym'
        },
        {
          name: 'Hydration & Nutrition',
          duration: '5 min',
          technique: 'Nourish your body',
          impact: '8%',
          steps: ['Drink water', 'Eat nutritious snack', 'Notice energy shift'],
          workTip: 'Mid-morning or afternoon snack',
          alternatives: 'Tea break with healthy options'
        }
      ],
      expectedReduction: 11,
      affirmation: 'I am energized and clear'
    },
    {
      day: 3,
      theme: 'Reflect',
      tagline: 'Plan your week',
      objective: 'Integration and planning',
      workCompatibility: 'Weekly planning',
      tasks: [
        {
          name: 'Journaling',
          duration: '10 min',
          technique: 'Reflect on week and feelings',
          impact: '10%',
          steps: ['What went well?', 'What was challenging?', 'What will I focus on next week?'],
          workTip: 'Sunday evening or Friday afternoon',
          alternatives: 'Voice memo or discussion'
        },
        {
          name: 'Commitment',
          duration: '5 min',
          technique: 'Choose one practice to continue',
          impact: '7%',
          steps: ['Pick favorite from days 1-2', 'Schedule for next week', 'Commit to daily practice'],
          workTip: 'Calendar reminder or app',
          alternatives: 'Share commitment with colleague'
        }
      ],
      expectedReduction: 9,
      affirmation: 'I am planning for wellbeing'
    }
  ];
}

function createDefaultChallenge() {
  return {
    challengeName: '3-Day Wellness Foundation',
    difficulty: 'easy',
    description: 'A balanced 3-day introduction to stress recovery practices.',
    overview: 'This foundational challenge teaches core wellness techniques: grounding, movement, and reflection.',
    targetReduction: '15-20%',
    duration: '3 days (20-30 min per day)',
    prerequisites: 'Quiet space, commitment to 15 min daily',
    totalExpectedReduction: 18,
    successRate: '85%+',
    workContext: 'Designed for working professionals',
    days: generateBalancedDays(),
    tips: [
      'Pick practices you enjoy - consistency matters',
      'Adapt timing to your schedule',
      'Track your mood before and after',
      'Share with colleagues for accountability'
    ],
    companyBenefits: ['Improved focus', 'Better decision-making', 'Enhanced collaboration', 'Reduced absenteeism'],
    followUp: 'After day 3, choose 1-2 practices to continue daily. Repeat challenge monthly.',
    generatedBy: 'Default',
    basedOnEntries: 0
  };
}

/**
 * Route to start a challenge
 */
router.post('/start', (req, res) => {
    const { userId, challengeId } = req.body;

    if (!userId || !challengeId) {
        return res.status(400).json({ error: 'Missing userId or challengeId' });
    }

    const data = readData();

    if (!data.challenges[userId]) {
        data.challenges[userId] = {};
    }

    data.challenges[userId][challengeId] = {
        startDate: new Date().toISOString(),
        progress: [],
    };

    writeData(data);

    res.status(200).json({ message: 'Challenge started successfully', challenge: data.challenges[userId][challengeId] });
});

module.exports = { generateRecoveryChallenge, router };
