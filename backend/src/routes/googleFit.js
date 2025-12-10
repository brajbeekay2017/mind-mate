const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// ✅ ADD THIS UPDATED DEBUG ENDPOINT (uses com.google.heart_minutes)

router.get('/debug/heart-points-raw', async (req, res) => {
  const { accessToken, days = 7 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken required' });
  }
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('[DEBUG] HEART MINUTES RAW DATA INSPECTION');
    console.log('='.repeat(80));
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const endTime = Date.now();
    const startTime = endTime - (parseInt(days) * 24 * 60 * 60 * 1000);
    
    console.log(`[DEBUG] Date Range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
    console.log(`[DEBUG] Days: ${days}`);
    
    // Step 1: List available data sources
    console.log('\n[DEBUG STEP 1] Checking available data sources...');
    let availableDataTypes = [];
    try {
      const dataSources = await fitness.users.dataSources.list({
        userId: 'me'
      });
      
      console.log(`[DEBUG] Found ${dataSources.data.dataSource?.length || 0} data sources`);
      
      dataSources.data.dataSource?.forEach(ds => {
        console.log(`[DEBUG]   - ${ds.dataType.name}`);
        availableDataTypes.push(ds.dataType.name);
      });
    } catch (err) {
      console.warn('[DEBUG] Could not list data sources:', err.message);
    }
    
    // Check if heart_minutes is available
    const hasHeartMinutes = availableDataTypes.includes('com.google.heart_minutes');
    console.log(`[DEBUG] Has com.google.heart_minutes: ${hasHeartMinutes ? '✅ YES' : '❌ NO'}`);
    
    if (!hasHeartMinutes) {
      console.log('[DEBUG] ⚠️  Device does not support Heart Minutes!');
      console.log('[DEBUG] This device needs a heart rate sensor.');
      
      return res.json({
        success: false,
        debug: {
          message: 'Device does not support Heart Minutes',
          dataTypes: availableDataTypes,
          hasHeartMinutes: false,
          summary: {
            totalBuckets: 0,
            bucketsWithData: 0,
            totalHeartMinutes: 0
          },
          recommendation: 'User needs a smartwatch (Apple Watch, Fitbit, etc.) or Google Pixel phone with built-in heart rate sensor'
        }
      });
    }
    
    // Step 2: Fetch raw com.google.heart_minutes
    console.log('\n[DEBUG STEP 2] Fetching com.google.heart_minutes...');
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.heart_minutes'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    console.log(`[DEBUG] API Response received`);
    console.log(`[DEBUG] Buckets: ${response.data.bucket?.length || 0}`);
    
    // Step 3: Detailed bucket inspection
    console.log('\n[DEBUG STEP 3] Inspecting buckets...');
    
    let details = {
      totalBuckets: response.data.bucket?.length || 0,
      bucketsWithData: 0,
      totalHeartMinutes: 0,
      bucketDetails: []
    };
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach((bucket, bucketIdx) => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStartTime).toISOString().split('T')[0];
        let bucketData = {
          date: bucketDate,
          datasets: [],
          totalMinutesInBucket: 0
        };
        
        if (!bucket.dataset || bucket.dataset.length === 0) {
          console.log('[DEBUG] ⚠️  No datasets in bucket');
          details.bucketDetails.push(bucketData);
          return;
        }
        
        console.log(`[DEBUG] Datasets: ${bucket.dataset.length}`);
        
        bucket.dataset.forEach((dataset, dsIdx) => {
          console.log(`[DEBUG]   Dataset ${dsIdx}: ${dataset.dataTypeName}`);
          
          let datasetData = {
            type: dataset.dataTypeName,
            pointsCount: dataset.point?.length || 0,
            points: []
          };
          
          if (!dataset.point || dataset.point.length === 0) {
            console.log('[DEBUG]     ⚠️  No points in dataset');
            bucketData.datasets.push(datasetData);
            return;
          }
          
          console.log(`[DEBUG]     Points: ${dataset.point.length}`);
          
          dataset.point.forEach((point, ptIdx) => {
            const intVal = point.value?.[0]?.intVal;
            const fpVal = point.value?.[0]?.fpVal;
            const finalValue = intVal !== undefined ? intVal : fpVal;
            
            console.log(`[DEBUG]       Point ${ptIdx}: ${finalValue} minutes`);
            
            if (finalValue > 0) {
              bucketData.totalMinutesInBucket += finalValue;
              details.totalHeartMinutes += finalValue;
            }
            
            datasetData.points.push({
              value: finalValue,
              intVal,
              fpVal,
              timestamp: point.startTimeNanos
            });
          });
          
          bucketData.datasets.push(datasetData);
        });
        
        if (bucketData.totalMinutesInBucket > 0) {
          console.log(`[DEBUG] ✅ Bucket total: ${bucketData.totalMinutesInBucket} minutes`);
          details.bucketsWithData++;
        } else {
          console.log('[DEBUG] ℹ️  Bucket total: 0 minutes (no vigorous activity)');
        }
        
        details.bucketDetails.push(bucketData);
      });
    } else {
      console.log('[DEBUG] ⚠️  No buckets in response');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('[DEBUG] SUMMARY');
    console.log('='.repeat(80));
    console.log(`[DEBUG] Available Data Types: ${availableDataTypes.join(', ')}`);
    console.log(`[DEBUG] Has com.google.heart_minutes: ✅ YES`);
    console.log(`[DEBUG] Total Buckets: ${details.totalBuckets}`);
    console.log(`[DEBUG] Buckets with Data: ${details.bucketsWithData}`);
    console.log(`[DEBUG] Total Heart Minutes: ${details.totalHeartMinutes}`);
    console.log('='.repeat(80) + '\n');
    
    res.json({
      success: true,
      debug: {
        message: 'See backend console for detailed output',
        dataTypes: availableDataTypes,
        hasHeartMinutes: true,
        summary: {
          totalBuckets: details.totalBuckets,
          bucketsWithData: details.bucketsWithData,
          totalHeartMinutes: details.totalHeartMinutes
        }
      },
      fullDetails: details
    });
    
  } catch (err) {
    console.error('[DEBUG] ❌ Error:', err.message);
    
    // ✅ Check if it's a "no datasource" error
    const isNoDataSource = err.message?.includes('no default datasource');
    
    if (isNoDataSource) {
      console.log('[DEBUG] ⚠️  DIAGNOSIS: Device does not have heart rate sensor');
      return res.json({
        success: false,
        debug: {
          message: 'Device does not support Heart Minutes tracking',
          error: err.message,
          diagnosis: 'No heart rate data source found',
          solution: [
            'User needs a smartwatch (Apple Watch, Fitbit, Garmin)',
            'OR Google Pixel phone with built-in heart rate sensor',
            'OR manually log heart rate in Google Fit app'
          ]
        }
      });
    }
    
    res.json({
      success: false,
      debug: {
        message: 'Debug failed',
        error: err.message,
        type: err.constructor.name
      }
    });
  }
});

// Get steps for a specific period (default: today)
router.get('/steps', async (req, res) => {
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
    
    console.log(`[STEPS] Fetching for ${days} day(s) from ${new Date(startTime)} to ${new Date(endTime)}`);
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.step_count.delta'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    let dailySteps = [];
    let totalSteps = 0;
    
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
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
        console.log(`[STEPS] ${bucketDate}: ${daySteps}`);
      });
    }
    
    res.json({
      success: true,
      data: { 
        totalSteps: totalSteps,
        dailySteps: dailySteps,
        days: parseInt(days),
        average: Math.round(totalSteps / parseInt(days))
      },
      debug: {
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0
      }
    });
  } catch (err) {
    console.error('[STEPS] API error:', err.message);
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

// Get today's steps
router.get('/steps-today', async (req, res) => {
  const { accessToken } = req.query;
  
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
    
    // Get today's date range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const startTime = startOfToday.getTime();
    const endTime = endOfToday.getTime();
    
    console.log(`[STEPS TODAY] Fetching from ${new Date(startTime)} to ${new Date(endTime)}`);
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.step_count.delta'
          }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    console.log('[STEPS TODAY] Raw response:', JSON.stringify(response.data, null, 2));
    
    let stepsToday = 0;
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      response.data.bucket.forEach(bucket => {
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach(dataset => {
            if (dataset.point && Array.isArray(dataset.point)) {
              dataset.point.forEach(point => {
                const stepValue = point.value[0]?.intVal || 0;
                stepsToday += stepValue;
                console.log(`[STEPS TODAY] Found: ${stepValue} steps`);
              });
            }
          });
        }
      });
    }
    
    console.log(`[STEPS TODAY] Total for today: ${stepsToday}`);
    
    res.json({
      success: true,
      data: { steps: stepsToday },
      debug: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        bucketsReceived: response.data.bucket ? response.data.bucket.length : 0
      }
    });
  } catch (err) {
    console.error('[STEPS TODAY] API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ FIXED: Use com.google.heart_minutes instead of com.google.heart_points

router.get('/heart-points', async (req, res) => {
  const { accessToken, days = 1 } = req.query;
  
  if (!accessToken) {
    return res.status(400).json({ 
      success: false,
      error: 'accessToken required', 
      data: { heartPoints: 0, dailyBreakdown: [], hasData: false } 
    });
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
    
    console.log(`[HEART-MINUTES] Fetching ACTUAL Heart Minutes metric (vigorous activity)`);
    console.log(`[HEART-MINUTES] Date range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
    
    // ✅ CORRECT: Fetch com.google.heart_minutes (vigorous activity minutes)
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            // ✅ This is the CORRECT metric for Heart Minutes
            dataTypeName: 'com.google.heart_minutes'
          }
        ],
        bucketByTime: { durationMillis: 86400000 }, // 1 day buckets
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    console.log('[HEART-MINUTES] API Response:', JSON.stringify(response.data, null, 2));
    
    let totalHeartMinutes = 0;
    let dailyBreakdown = [];
    let hasData = false;
    
    // ✅ Parse Heart Minutes data
    if (response.data.bucket && Array.isArray(response.data.bucket)) {
      console.log(`[HEART-MINUTES] Received ${response.data.bucket.length} buckets`);
      
      response.data.bucket.forEach((bucket, bucketIdx) => {
        const bucketStartTime = parseInt(bucket.startTimeMillis);
        const bucketDate = new Date(bucketStartTime).toISOString().split('T')[0];
        let dayMinutes = 0;
        
        console.log(`[HEART-MINUTES] Processing bucket ${bucketIdx} for ${bucketDate}`);
        
        if (bucket.dataset && Array.isArray(bucket.dataset)) {
          bucket.dataset.forEach((dataset, dsIdx) => {
            console.log(`[HEART-MINUTES]   Dataset ${dsIdx}: ${dataset.dataTypeName}`);
            
            if (dataset.point && Array.isArray(dataset.point)) {
              console.log(`[HEART-MINUTES]     Points: ${dataset.point.length}`);
              
              dataset.point.forEach((point, ptIdx) => {
                // ✅ Heart Minutes are stored as intVal (integer) or fpVal (float)
                const hmValue = point.value[0]?.intVal || point.value[0]?.fpVal || 0;
                
                if (hmValue > 0) {
                  dayMinutes += hmValue;
                  hasData = true;
                  console.log(`[HEART-MINUTES]       Point ${ptIdx}: ${hmValue} minutes`);
                }
              });
            } else {
              console.log(`[HEART-MINUTES]     No points in this dataset`);
            }
          });
        } else {
          console.log(`[HEART-MINUTES]   No datasets in bucket ${bucketIdx}`);
        }
        
        dailyBreakdown.push({ date: bucketDate, heartMinutes: dayMinutes });
        totalHeartMinutes += dayMinutes;
        
        if (dayMinutes > 0) {
          console.log(`[HEART-MINUTES] ✅ ${bucketDate}: ${dayMinutes} minutes`);
        } else {
          console.log(`[HEART-MINUTES] ${bucketDate}: 0 minutes (no vigorous activity)`);
        }
      });
    } else {
      console.log('[HEART-MINUTES] ⚠️ No buckets received from API');
    }
    
    console.log(`[HEART-MINUTES] ✅ TOTAL: ${totalHeartMinutes} minutes`);
    
    return res.status(200).json({
      success: true,
      data: { 
        heartPoints: totalHeartMinutes,  // Keep as heartPoints for UI compatibility
        dailyBreakdown: dailyBreakdown,
        hasData: hasData,
        days: parseInt(days),
        message: hasData 
          ? `${totalHeartMinutes} vigorous minutes earned` 
          : 'No vigorous activity recorded. Heart Minutes require exercise at 70%+ max heart rate.'
      }
    });
    
  } catch (err) {
    console.error('[HEART-MINUTES] ❌ Error:', err.message);
    console.error('[HEART-MINUTES] Full error:', err);
    
    // ✅ Check if it's a "no datasource" error
    const isNoDataSource = err.message?.includes('no default datasource') || 
                          err.message?.includes('datasource');
    
    if (isNoDataSource) {
      console.log('[HEART-MINUTES] ⚠️  Device does not support Heart Minutes tracking');
      return res.status(200).json({
        success: false,
        error: 'Heart Minutes not available',
        data: { 
          heartPoints: 0,
          dailyBreakdown: [],
          hasData: false,
          message: 'Your device does not have a heart rate sensor. Heart Minutes require a wearable device (Apple Watch, Fitbit, etc.) or Google Pixel phone with built-in heart rate sensor.'
        }
      });
    }
    
    // Other errors
    return res.status(200).json({
      success: false,
      error: err.message,
      data: { 
        heartPoints: 0,
        dailyBreakdown: [],
        hasData: false,
        message: 'Failed to fetch Heart Minutes. This metric may not be available on your device.'
      }
    });
  }
});

// Get target steps (default 10000 per day)
router.get('/target-steps', async (req, res) => {
  try {
    // Google Fit default is typically 8000 steps per day
    // Some devices/accounts use 10000
    // We'll return the standard Google Fit default
    const targetSteps = 10000;
    
    res.json({
      success: true,
      data: { 
        targetSteps: targetSteps,
        dailyTarget: targetSteps
      }
    });
  } catch (err) {
    console.error('[TARGET STEPS] Error:', err.message);
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

// GET /google-fit/monthly - Fetch daily steps and heart points for a specific month
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
    
    // Calculate first and last day of the month
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0);
    
    const startTime = firstDay.getTime();
    const endTime = lastDay.getTime() + (24 * 60 * 60 * 1000); // Include entire last day
    
    const dailyData = {};
    
    // Helper to format date as YYYY-MM-DD (local time, not UTC)
    const formatLocalDateKey = (timestampMs) => {
      const d = new Date(timestampMs);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    // Fetch steps data
    const stepsResponse = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
        }],
        bucketByTime: { durationMillis: 86400000 }, // 1 day
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    if (stepsResponse.data.bucket) {
      stepsResponse.data.bucket.forEach(bucket => {
        const date = formatLocalDateKey(parseInt(bucket.startTimeMillis));
        const steps = bucket.dataset[0]?.point?.[0]?.value?.[0]?.intVal || 0;
        
        if (!dailyData[date]) {
          dailyData[date] = {};
        }
        dailyData[date].steps = steps;
      });
    }
    
    // Fetch heart points data
    try {
      const heartResponse = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.heart_minutes'
            // Removed dataSourceId to let Google Fit pick the available source automatically
          }],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: startTime,
          endTimeMillis: endTime
        }
      });
      
      if (heartResponse.data.bucket) {
        heartResponse.data.bucket.forEach(bucket => {
          const date = formatLocalDateKey(parseInt(bucket.startTimeMillis));
          const heartPoints = bucket.dataset[0]?.point?.[0]?.value?.[0]?.fpVal || bucket.dataset[0]?.point?.[0]?.value?.[0]?.intVal || 0;
          
          if (!dailyData[date]) {
            dailyData[date] = {};
          }
          dailyData[date].heartPoints = Math.round(heartPoints);
        });
      }
    } catch (heartErr) {
      console.log('Heart points not available:', heartErr.message);
    }

    // Fetch heart rate data (resting heart rate and average heart rate)
    try {
      console.log('💓 [Monthly] Attempting to fetch heart rate data...');
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
      
      console.log('💓 [Monthly] Heart rate response buckets:', heartRateResponse.data.bucket?.length || 0);
      
      if (heartRateResponse.data.bucket) {
        heartRateResponse.data.bucket.forEach((bucket, idx) => {
          const date = formatLocalDateKey(parseInt(bucket.startTimeMillis));
          
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
              console.log(`💓 [Monthly] ${date}: Resting=${Math.round(minHR)}, Avg=${Math.round(avgHR)}`);
            }
          }
        });
      }
    } catch (hrErr) {
      console.log('❌ [Monthly] Heart rate data not available:', hrErr.message);
    }

    // Fetch sleep data
    try {
      console.log('🛌 [Monthly] Attempting to fetch sleep data...');
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
      
      console.log('🛌 [Monthly] Sleep response buckets:', sleepResponse.data.bucket?.length || 0);
      
      if (sleepResponse.data.bucket) {
        sleepResponse.data.bucket.forEach((bucket, idx) => {
          const date = formatLocalDateKey(parseInt(bucket.startTimeMillis));
          
          if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
            let totalSleepMinutes = 0;
            
            console.log(`🛌 [Monthly] Bucket ${idx} (${date}): ${bucket.dataset[0].point.length} sleep points`);
            
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
              console.log(`🛌 [Monthly] ${date}: ${dailyData[date].sleepHours} hours sleep`);
            }
          }
        });
      }
    } catch (sleepErr) {
      console.log('❌ [Monthly] Sleep data not available:', sleepErr.message);
    }
    
    res.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      dailyData: dailyData
    });
  } catch (err) {
    console.error('Error fetching monthly data:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch monthly data' });
  }
});

module.exports = router;
