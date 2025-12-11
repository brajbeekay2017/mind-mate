const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// ✅ Helper: Create OAuth2 client
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// ✅ Helper: Refresh token if expired
async function refreshTokenIfNeeded(oauth2Client, refreshToken) {
  try {
    if (refreshToken) {
      console.log('[Token] Attempting to refresh with refresh_token');
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('[Token] ✅ Token refreshed successfully');
      return credentials.access_token;
    }
  } catch (err) {
    console.log('[Token] ❌ Refresh failed:', err.message);
  }
  return null;
}

// ✅ FIXED: Get today's steps (Timezone-aware - UTC boundary)
router.get('/steps-today', async (req, res) => {
  const { accessToken, refreshToken } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    const oauth2Client = createOAuth2Client();
    let token = accessToken;
    
    oauth2Client.setCredentials({ access_token: token });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    // ✅ CRITICAL FIX: Calculate "today" using UTC midnight boundary
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowUTC = new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000);
    
    const startTime = todayUTC.getTime();
    const endTime = tomorrowUTC.getTime();
    
    console.log(`[STEPS TODAY] 📅 Timezone-aware fetch`);
    console.log(`[STEPS TODAY] Today (UTC): ${todayUTC.toISOString().split('T')[0]}`);
    console.log(`[STEPS TODAY] Local time: ${now.toLocaleString()}`);
    console.log(`[STEPS TODAY] 🌍 Time range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
    
    let response;
    try {
      response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime,
          endTimeMillis: endTime
        }
      });
    } catch (apiErr) {
      // Try token refresh if 401
      if ((apiErr.code === 401 || apiErr.status === 401) && refreshToken) {
        console.log('[STEPS TODAY] Token expired, refreshing...');
        const newToken = await refreshTokenIfNeeded(oauth2Client, refreshToken);
        
        if (newToken) {
          token = newToken;
          oauth2Client.setCredentials({ access_token: newToken });
          const fitnessRefreshed = google.fitness({ version: 'v1', auth: oauth2Client });
          
          response = await fitnessRefreshed.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
              aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
              bucketByTime: { durationMillis: 86400000 },
              startTimeMillis: startTime,
              endTimeMillis: endTime
            }
          });
          console.log('[STEPS TODAY] ✅ Retry successful with refreshed token');
        } else {
          throw new Error('Token refresh failed');
        }
      } else {
        throw apiErr;
      }
    }
    
    let stepsToday = 0;
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach((bucket, idx) => {
        const bucketStart = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStart).toISOString().split('T')[0];
        
        console.log(`[STEPS TODAY] Bucket ${idx}: ${bucketDate}`);
        
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                const stepValue = point.value[0]?.intVal || 0;
                stepsToday += stepValue;
                if (stepValue > 0) {
                  console.log(`[STEPS TODAY] ✅ Found: ${stepValue} steps`);
                }
              });
            }
          });
        }
      });
    }
    
    console.log(`[STEPS TODAY] ✅ TOTAL: ${stepsToday}`);
    
    res.json({
      success: true,
      data: { steps: stepsToday },
      debug: {
        dateUTC: todayUTC.toISOString().split('T')[0],
        dateLocal: new Date().toLocaleDateString(),
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0
      }
    });
  } catch (err) {
    console.error('[STEPS TODAY] ❌ Error:', err.message);
    
    if (err.code === 401 || err.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        requiresReauth: true
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// ✅ FIXED: Get heart points (Timezone-aware - UTC boundary)
router.get('/heart-points', async (req, res) => {
  const { accessToken, refreshToken, days = 1 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ 
      success: false,
      error: 'accessToken required', 
      data: { heartPoints: 0, dailyBreakdown: [], hasData: false } 
    });
  }
  
  try {
    const oauth2Client = createOAuth2Client();
    let token = accessToken;
    
    oauth2Client.setCredentials({ access_token: token });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    // ✅ CRITICAL FIX: Calculate date range using UTC midnight boundaries
    const now = new Date();
    const endTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).getTime();
    const startTime = endTime - (parseInt(days) * 24 * 60 * 60 * 1000);
    
    console.log(`[HEART-MINUTES] 📅 Fetching last ${days} day(s)`);
    console.log(`[HEART-MINUTES] 🌍 UTC Range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
    console.log(`[HEART-MINUTES] 🕐 Local time: ${now.toLocaleString()}`);
    
    let response;
    try {
      response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{ dataTypeName: 'com.google.heart_minutes' }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime,
          endTimeMillis: endTime
        }
      });
    } catch (apiErr) {
      // Try token refresh if 401
      if ((apiErr.code === 401 || apiErr.status === 401) && refreshToken) {
        console.log('[HEART-MINUTES] Token expired, refreshing...');
        const newToken = await refreshTokenIfNeeded(oauth2Client, refreshToken);
        
        if (newToken) {
          token = newToken;
          oauth2Client.setCredentials({ access_token: newToken });
          const fitnessRefreshed = google.fitness({ version: 'v1', auth: oauth2Client });
          
          response = await fitnessRefreshed.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
              aggregateBy: [{ dataTypeName: 'com.google.heart_minutes' }],
              bucketByTime: { durationMillis: 86400000 },
              startTimeMillis: startTime,
              endTimeMillis: endTime
            }
          });
          console.log('[HEART-MINUTES] ✅ Retry successful with refreshed token');
        } else {
          throw new Error('Token refresh failed');
        }
      } else {
        throw apiErr;
      }
    }
    
    let totalHeartMinutes = 0;
    let dailyBreakdown = [];
    let hasData = false;
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      console.log(`[HEART-MINUTES] ✅ Received ${response.data.bucket.length} buckets`);
      
      response.data.bucket.forEach((bucket, idx) => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStartTime).toISOString().split('T')[0];
        let dayMinutes = 0;
        
        console.log(`[HEART-MINUTES] Bucket ${idx}: ${bucketDate}`);
        
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                const hmValue = point.value[0]?.intVal || point.value[0]?.fpVal || 0;
                
                if (hmValue > 0) {
                  dayMinutes += hmValue;
                  hasData = true;
                  console.log(`[HEART-MINUTES]   ✅ ${hmValue} minutes`);
                }
              });
            }
          });
        }
        
        dailyBreakdown.push({ date: bucketDate, heartMinutes: dayMinutes });
        totalHeartMinutes += dayMinutes;
        
        if (dayMinutes > 0) {
          console.log(`[HEART-MINUTES] 💓 ${bucketDate}: ${dayMinutes} vigorous minutes`);
        }
      });
    } else {
      console.log('[HEART-MINUTES] ⚠️  No buckets in response');
    }
    
    console.log(`[HEART-MINUTES] ✅ TOTAL: ${totalHeartMinutes} minutes`);
    
    return res.status(200).json({
      success: true,
      data: { 
        heartPoints: totalHeartMinutes,
        dailyBreakdown: dailyBreakdown,
        hasData: hasData,
        days: parseInt(days),
        message: hasData 
          ? `${totalHeartMinutes} vigorous minutes` 
          : 'No vigorous activity recorded'
      }
    });
    
  } catch (err) {
    console.error('[HEART-MINUTES] ❌ Error:', err.message);
    
    const isNoDataSource = err.message?.includes('no default datasource') || 
                          err.message?.includes('datasource');
    
    if (isNoDataSource) {
      return res.status(200).json({
        success: false,
        error: 'Device not supported',
        data: { 
          heartPoints: 0,
          dailyBreakdown: [],
          hasData: false,
          message: 'Heart Minutes require a wearable device with heart rate sensor.'
        }
      });
    }
    
    if (err.code === 401 || err.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        requiresReauth: true
      });
    }
    
    return res.status(500).json({ error: err.message });
  }
});

// ✅ FIXED: Get steps for a period (Timezone-aware - UTC boundary)
router.get('/steps', async (req, res) => {
  const { accessToken, refreshToken, days = 7 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    const oauth2Client = createOAuth2Client();
    let token = accessToken;
    
    oauth2Client.setCredentials({ access_token: token });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    // ✅ CRITICAL FIX: Use UTC boundaries instead of local time
    const now = new Date();
    const endTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).getTime();
    const startTime = endTime - (parseInt(days) * 24 * 60 * 60 * 1000);
    
    console.log(`[STEPS] 📅 Fetching last ${days} days`);
    console.log(`[STEPS] 🌍 UTC Range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
    
    let response;
    try {
      response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startTime,
          endTimeMillis: endTime
        }
      });
    } catch (apiErr) {
      // Try token refresh if 401
      if ((apiErr.code === 401 || apiErr.status === 401) && refreshToken) {
        console.log('[STEPS] Token expired, refreshing...');
        const newToken = await refreshTokenIfNeeded(oauth2Client, refreshToken);
        
        if (newToken) {
          token = newToken;
          oauth2Client.setCredentials({ access_token: newToken });
          const fitnessRefreshed = google.fitness({ version: 'v1', auth: oauth2Client });
          
          response = await fitnessRefreshed.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
              aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
              bucketByTime: { durationMillis: 86400000 },
              startTimeMillis: startTime,
              endTimeMillis: endTime
            }
          });
        } else {
          throw new Error('Token refresh failed');
        }
      } else {
        throw apiErr;
      }
    }
    
    let dailySteps = [];
    let totalSteps = 0;
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      console.log(`[STEPS] ✅ Received ${response.data.bucket.length} days`);
      
      response.data.bucket.forEach(bucket => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStartTime).toISOString().split('T')[0];
        let daySteps = 0;
        
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                const stepValue = point.value[0]?.intVal || 0;
                daySteps += stepValue;
              });
            }
          });
        }
        
        dailySteps.push({ date: bucketDate, steps: daySteps });
        totalSteps += daySteps;
        console.log(`[STEPS] 🚶 ${bucketDate}: ${daySteps} steps`);
      });
    }
    
    res.json({
      success: true,
      data: { 
        totalSteps: totalSteps,
        dailySteps: dailySteps,
        days: parseInt(days),
        average: Math.round(totalSteps / parseInt(days))
      }
    });
  } catch (err) {
    console.error('[STEPS] ❌ Error:', err.message);
    
    if (err.code === 401 || err.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        requiresReauth: true
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// Get heart rate for a specific period
router.get('/heart-rate', async (req, res) => {
  const { accessToken, days = 1 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const endTime = Date.now();
    const startTime = endTime - (parseInt(days) * 24 * 60 * 60 * 1000);
    
    console.log(`[HEART RATE] Fetching for ${days} day(s) from ${new Date(startTime)} to ${new Date(endTime)}`);
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.heart_rate.bpm'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    let heartRates = [];
    let dailyHeartRates = [];
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach(bucket => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStartTime).toISOString().split('T')[0];
        let dayHeartRates = [];
        
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                const hrValue = point.value[0]?.fpVal || 0;
                if (hrValue > 0) {
                  heartRates.push(hrValue);
                  dayHeartRates.push(hrValue);
                }
              });
            }
          });
        }
        
        if (dayHeartRates.length > 0) {
          const avgHR = Math.round(dayHeartRates.reduce((a, b) => a + b) / dayHeartRates.length);
          dailyHeartRates.push({ date: bucketDate, average: avgHR, dataPoints: dayHeartRates.length });
          console.log(`[HEART RATE] ${bucketDate}: avg=${avgHR}, points=${dayHeartRates.length}`);
        }
      });
    }
    
    const avgHeartRate = heartRates.length > 0 
      ? Math.round(heartRates.reduce((a, b) => a + b) / heartRates.length)
      : 0;
    
    res.json({
      success: true,
      data: { 
        average: avgHeartRate,
        dailyAverages: dailyHeartRates,
        totalDataPoints: heartRates.length,
        days: parseInt(days)
      },
      debug: {
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0,
        totalHeartRateReadings: heartRates.length
      }
    });
  } catch (err) {
    console.error('[HEART RATE] API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Original endpoint (kept for compatibility)
router.get('/data', async (req, res) => {
  const { accessToken, days = 7 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const endTime = Date.now();
    const startTime = endTime - (parseInt(days) * 24 * 60 * 60 * 1000);
    
    console.log(`[DATA] Fetching from ${new Date(startTime)} to ${new Date(endTime)}`);
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.step_count.delta'
          },
          {
            dataTypeName: 'com.google.heart_rate.bpm'
          },
          {
            dataTypeName: 'com.google.active_minutes'
          },
          {
            dataTypeName: 'com.google.calories.expended'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    console.log('[DATA] Raw response:', JSON.stringify(response.data, null, 2));
    
    let totalSteps = 0;
    let heartRates = [];
    let activeMinutes = 0;
    let caloriesExpended = 0;
    let dateRanges = [];
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach(bucket => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStartTime).toISOString().split('T')[0];
        dateRanges.push(bucketDate);
        
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                if (dataset.dataTypeName === 'com.google.step_count.delta' && point.value) {
                  const stepValue = point.value[0]?.intVal || 0;
                  totalSteps += stepValue;
                  console.log(`[DATA] Steps: ${stepValue}`);
                } 
                else if (dataset.dataTypeName === 'com.google.heart_rate.bpm' && point.value) {
                  const hrValue = point.value[0]?.fpVal || 0;
                  if (hrValue > 0) {
                    heartRates.push(hrValue);
                    console.log(`[DATA] Heart Rate: ${hrValue}`);
                  }
                }
                else if (dataset.dataTypeName === 'com.google.active_minutes' && point.value) {
                  const activeValue = point.value[0]?.intVal || 0;
                  activeMinutes += activeValue;
                  console.log(`[DATA] Active Minutes: ${activeValue}`);
                }
                else if (dataset.dataTypeName === 'com.google.calories.expended' && point.value) {
                  const calorieValue = point.value[0]?.fpVal || 0;
                  caloriesExpended += calorieValue;
                  console.log(`[DATA] Calories: ${calorieValue}`);
                }
              });
            }
          });
        }
      });
    }
    
    const avgHeartRate = heartRates.length > 0 
      ? Math.round(heartRates.reduce((a, b) => a + b) / heartRates.length) 
      : 0;
    
    const result = {
      success: true, 
      data: { 
        steps: totalSteps,
        heartRate: heartRates,
        avgHeartRate: avgHeartRate,
        activeMinutes: activeMinutes,
        calories: Math.round(caloriesExpended),
        dateRange: `${dateRanges[0]} to ${dateRanges[dateRanges.length - 1]}`,
        daysWithData: dateRanges.length
      },
      debug: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0
      }
    };
    
    console.log('[DATA] Google Fit Result:', result);
    res.json(result);
  } catch (err) {
    console.error('[DATA] Google Fit API error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch Google Fit data' });
  }
});

// GET /google-fit/monthly - Fetch daily steps and heart points for a specific month (FIXED UTC)
router.get('/monthly', async (req, res) => {
  const { accessToken, year, month } = req.query;
  
  if (!accessToken || !year || !month) {
    return res.status(400).json({ error: 'accessToken, year, and month are required' });
  }
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    // ✅ CRITICAL FIX: Calculate month boundaries using UTC, not local time
    const firstDayUTC = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
    const lastDayUTC = new Date(Date.UTC(parseInt(year), parseInt(month), 0));
    
    // Start: first day at 00:00 UTC
    // End: last day at 23:59:59 UTC (next day 00:00 UTC)
    const startTime = firstDayUTC.getTime();
    const endTime = new Date(lastDayUTC.getTime() + (24 * 60 * 60 * 1000)).getTime();
    
    console.log(`🗓️ [Monthly] Fetching ${parseInt(year)}-${String(parseInt(month)).padStart(2, '0')}`);
    console.log(`🗓️ [Monthly] UTC boundaries: ${firstDayUTC.toISOString()} to ${new Date(endTime).toISOString()}`);
    
    const dailyData = {};
    
    // ✅ Helper: Convert UTC timestamp to local YYYY-MM-DD date string
    // This ensures the date matches the user's local calendar
    const formatLocalDateKey = (timestampMs) => {
      const d = new Date(timestampMs);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    // Fetch steps data
    console.log('🚶 [Monthly] Fetching steps...');
    const stepsResponse = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta'
        }],
        bucketByTime: { durationMillis: 86400000 }, // 1 day
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    console.log(`🚶 [Monthly] Steps buckets: ${stepsResponse.data.bucket?.length || 0}`);
    
    if (stepsResponse.data.bucket) {
      stepsResponse.data.bucket.forEach((bucket, idx) => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const date = formatLocalDateKey(bucketStartTime);
        
        console.log(`🚶 [Monthly] Bucket ${idx}: UTC=${new Date(bucketStartTime).toISOString()} → Local=${date}`);
        
        const steps = bucket.dataset[0]?.point?.[0]?.value?.[0]?.intVal || 0;
        
        if (!dailyData[date]) {
          dailyData[date] = {};
        }
        dailyData[date].steps = steps;
        
        if (steps > 0) {
          console.log(`✅ [Monthly] ${date}: ${steps} steps`);
        }
      });
    }
    
    // Fetch heart points data
    console.log('💓 [Monthly] Fetching heart points...');
    try {
      const heartResponse = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.heart_minutes'
          }],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: startTime,
          endTimeMillis: endTime
        }
      });
      
      console.log(`💓 [Monthly] Heart buckets: ${heartResponse.data.bucket?.length || 0}`);
      
      if (heartResponse.data.bucket) {
        heartResponse.data.bucket.forEach((bucket, idx) => {
          const bucketStartTime = parseInt(bucket.startTimeMillis);
          const date = formatLocalDateKey(bucketStartTime);
          
          console.log(`💓 [Monthly] Bucket ${idx}: UTC=${new Date(bucketStartTime).toISOString()} → Local=${date}`);
          
          const heartPoints = bucket.dataset[0]?.point?.[0]?.value?.[0]?.fpVal || 
                             bucket.dataset[0]?.point?.[0]?.value?.[0]?.intVal || 0;
          
          if (!dailyData[date]) {
            dailyData[date] = {};
          }
          dailyData[date].heartPoints = Math.round(heartPoints);
          
          if (heartPoints > 0) {
            console.log(`✅ [Monthly] ${date}: ${heartPoints} heart minutes`);
          }
        });
      }
    } catch (heartErr) {
      console.log('⚠️ [Monthly] Heart points not available:', heartErr.message);
    }

    // Fetch heart rate data (resting heart rate and average heart rate)
    console.log('💗 [Monthly] Fetching heart rate...');
    try {
      const heartRateResponse = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [
            { dataTypeName: 'com.google.heart_rate.bpm' }
          ],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: startTime,
          endTimeMillis: endTime
        }
      });
      
      console.log(`💗 [Monthly] Heart rate buckets: ${heartRateResponse.data.bucket?.length || 0}`);
      
      if (heartRateResponse.data.bucket) {
        heartRateResponse.data.bucket.forEach((bucket, idx) => {
          const bucketStartTime = parseInt(bucket.startTimeMillis);
          const date = formatLocalDateKey(bucketStartTime);
          
          if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point && bucket.dataset[0].point.length > 0) {
            const points = bucket.dataset[0].point;
            let sumHR = 0;
            let minHR = Infinity;
            let maxHR = 0;
            let validPoints = 0;
            
            points.forEach(point => {
              const hr = point.value?.[0]?.fpVal || point.value?.[0]?.intVal;
              if (hr !== undefined && hr > 0) {
                sumHR += hr;
                minHR = Math.min(minHR, hr);
                maxHR = Math.max(maxHR, hr);
                validPoints++;
              }
            });
            
            if (validPoints > 0) {
              if (!dailyData[date]) {
                dailyData[date] = {};
              }
              const avgHR = sumHR / validPoints;
              // Resting HR is typically the minimum HR (at rest)
              dailyData[date].restingHeartRate = Math.round(minHR);
              dailyData[date].avgHeartRate = Math.round(avgHR);
              console.log(`✅ [Monthly] ${date}: Resting=${Math.round(minHR)}, Avg=${Math.round(avgHR)}`);
            }
          }
        });
      }
    } catch (hrErr) {
      console.log('⚠️ [Monthly] Heart rate data not available:', hrErr.message);
    }

    // Fetch sleep data
    console.log('😴 [Monthly] Fetching sleep...');
    try {
      const sleepResponse = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.sleep.segment'
          }],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: startTime,
          endTimeMillis: endTime
        }
      });
      
      console.log(`😴 [Monthly] Sleep buckets: ${sleepResponse.data.bucket?.length || 0}`);
      
      if (sleepResponse.data.bucket) {
        sleepResponse.data.bucket.forEach((bucket, idx) => {
          const bucketStartTime = parseInt(bucket.startTimeMillis);
          const date = formatLocalDateKey(bucketStartTime);
          
          if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
            let totalSleepMinutes = 0;
            
            console.log(`😴 [Monthly] Bucket ${idx} (${date}): ${bucket.dataset[0].point.length} sleep segments`);
            
            bucket.dataset[0].point.forEach(point => {
              if (point.startTimeNanos && point.endTimeNanos) {
                const startNanos = parseInt(point.startTimeNanos);
                const endNanos = parseInt(point.endTimeNanos);
                const durationMinutes = (endNanos - startNanos) / (1000000 * 60); // Convert nanoseconds to minutes
                totalSleepMinutes += durationMinutes;
              }
            });
            
            if (totalSleepMinutes > 0) {
              if (!dailyData[date]) {
                dailyData[date] = {};
              }
              dailyData[date].sleepMinutes = Math.round(totalSleepMinutes);
              dailyData[date].sleepHours = (totalSleepMinutes / 60).toFixed(1);
              console.log(`✅ [Monthly] ${date}: ${dailyData[date].sleepHours} hours sleep`);
            }
          }
        });
      }
    } catch (sleepErr) {
      console.log('⚠️ [Monthly] Sleep data not available:', sleepErr.message);
    }
    
    res.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      dailyData: dailyData,
      debug: {
        startTimeUTC: firstDayUTC.toISOString(),
        endTimeUTC: new Date(endTime).toISOString(),
        daysInResponse: Object.keys(dailyData).length
      }
    });
  } catch (err) {
    console.error('❌ [Monthly] Error fetching monthly data:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch monthly data' });
  }
});

// Get target steps (default 10000)
router.get('/target-steps', async (req, res) => {
  try {
    res.json({
      success: true,
      data: { targetSteps: 10000 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
