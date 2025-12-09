const { google } = require('googleapis');
const { OAuth2 } = google.auth;

let oauth2Client = null;

function initializeOAuth2Client() {
  oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getGoogleFitData(accessToken, startTime, endTime) {
  if (!oauth2Client) initializeOAuth2Client();
  
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
  
  try {
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          {
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
          },
          {
            dataTypeName: 'com.google.heart_rate.bpm',
            dataSourceId: 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm'
          },
          {
            dataTypeName: 'com.google.active_minutes',
            dataSourceId: 'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes'
          }
        ],
        bucketByTime: { durationMillis: 86400000 }, // 1 day
        startTimeMillis: startTime,
        endTimeMillis: endTime
      }
    });
    
    return parseGoogleFitData(response.data);
  } catch (err) {
    console.error('Google Fit API error:', err.message);
    throw err;
  }
}

function parseGoogleFitData(data) {
  const parsed = {
    steps: 0,
    heartRate: [],
    activeMinutes: 0,
    dates: []
  };
  
  if (data.bucket) {
    data.bucket.forEach(bucket => {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      
      bucket.dataset.forEach(dataset => {
        dataset.point.forEach(point => {
          if (dataset.dataSourceId?.includes('step_count')) {
            parsed.steps += point.value[0]?.intVal || 0;
          } else if (dataset.dataSourceId?.includes('heart_rate')) {
            parsed.heartRate.push(point.value[0]?.fpVal || 0);
          } else if (dataset.dataSourceId?.includes('active_minutes')) {
            parsed.activeMinutes += point.value[0]?.intVal || 0;
          }
        });
      });
      
      parsed.dates.push(date);
    });
  }
  
  return parsed;
}

module.exports = { initializeOAuth2Client, getGoogleFitData };
