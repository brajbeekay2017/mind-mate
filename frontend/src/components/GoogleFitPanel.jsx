import React, { useState, useEffect } from 'react';

export default function GoogleFitPanel({ entries = [] }) {
  const [stepsToday, setStepsToday] = useState(0);
  const [heartPoints, setHeartPoints] = useState(0);
  const [targetSteps, setTargetSteps] = useState(10000);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenExpired, setTokenExpired] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [timePeriod, setTimePeriod] = useState('today'); // 'today' or '7days'
  const [sevenDayData, setSevenDayData] = useState(null);

  useEffect(() => {
    // Check immediately on mount (this runs when App loads after login)
    const token = localStorage.getItem('googlefit_token');
    console.log('[GoogleFitPanel] ========================================');
    console.log('[GoogleFitPanel] Component mounted!');
    console.log('[GoogleFitPanel] Token check:', token ? `Token found (${token.substring(0, 20)}...)` : 'NO TOKEN FOUND');
    console.log('[GoogleFitPanel] All localStorage keys:', Object.keys(localStorage));
    console.log('[GoogleFitPanel] ========================================');
    
    if (token) {
      console.log('[GoogleFitPanel] ✅ Token found on mount, fetching data...');
      setIsConnected(true);
      setShowDetails(true);
      fetchGoogleFitData(token);
    } else {
      console.log('[GoogleFitPanel] ⚠️ No token found on mount. User needs to connect Google Fit.');
    }

    // Listen for storage changes (when token is added by LoginPage)
    const handleStorageChange = (e) => {
      if (e.key === 'googlefit_token' && e.newValue) {
        console.log('[GoogleFitPanel] Storage event: token added');
        checkGoogleFitConnection();
      }
    };

    // Listen for custom event (when LoginPage adds token)
    const handleTokenAdded = (e) => {
      console.log('[GoogleFitPanel] Custom event: googlefit_token_added', e.detail);
      checkGoogleFitConnection();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('googlefit_token_added', handleTokenAdded);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('googlefit_token_added', handleTokenAdded);
    };
  }, []);

  const checkGoogleFitConnection = () => {
    const token = localStorage.getItem('googlefit_token');
    console.log('[GoogleFitPanel] checkGoogleFitConnection called, token:', token ? 'exists' : 'missing');
    if (token) {
      setIsConnected(true);
      setShowDetails(true); // Auto-expand to show data
      fetchGoogleFitData(token);
    }
  };

  const connectToGoogleFit = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await fetch('http://localhost:4000/google-auth/auth-url');
      
      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }
      
      const { authUrl } = await response.json();
      
      if (!authUrl) {
        throw new Error('No authorization URL received');
      }

      const authWindow = window.open(authUrl, 'googleFitAuth', 'width=500,height=600');
      
      const handleMessage = (event) => {
        if (event.data.type === 'GOOGLE_FIT_AUTH') {
          const { accessToken, error: authError } = event.data;
          
          if (authError) {
            setError(`Authorization failed: ${authError}`);
            setLoading(false);
          } else if (accessToken) {
            localStorage.setItem('googlefit_token', accessToken);
            setIsConnected(true);
            setShowDetails(true); // Auto-expand to show data
            setError('');
            fetchGoogleFitData(accessToken);
            // Notify other components in the same window that Google Fit is connected
            try { window.dispatchEvent(new CustomEvent('googlefit_connected', { detail: { accessToken } })); } catch(e) {}
            window.removeEventListener('message', handleMessage);
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
      }, 5 * 60 * 1000);
      
    } catch (err) {
      console.error('Failed to connect Google Fit:', err);
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleFitData = async (accessToken) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all three metrics in parallel for today
      const [stepsRes, heartRes, targetRes] = await Promise.all([
        fetch(`http://localhost:4000/google-fit/steps-today?accessToken=${accessToken}`),
        fetch(`http://localhost:4000/google-fit/heart-points?accessToken=${accessToken}`),
        fetch(`http://localhost:4000/google-fit/target-steps?accessToken=${accessToken}`)
      ]);
      
      // If any response is 401, mark tokenExpired but do not remove token from storage.
      if (stepsRes.status === 401 || heartRes.status === 401 || targetRes.status === 401) {
        console.warn('[GoogleFitPanel] Received 401 from Google Fit endpoints - token may be expired');
        setTokenExpired(true);
        setError('Google Fit authorization expired. Click Reconnect to re-authorize (token will be kept until you explicitly disconnect).');
        // still attempt to parse responses if available, but avoid removing token
      }
      if (!stepsRes.ok || !heartRes.ok || !targetRes.ok) {
        // If non-auth related failure, surface a generic error but keep token as well
        if (!tokenExpired) throw new Error('Failed to fetch one or more metrics');
      }
      
      const stepsData = await stepsRes.json();
      const heartData = await heartRes.json();
      const targetData = await targetRes.json();
      
      console.log('[GoogleFitPanel] Steps:', stepsData);
      console.log('[GoogleFitPanel] Heart:', heartData);
      console.log('[GoogleFitPanel] Target:', targetData);
      
      if (stepsData.success) {
        setStepsToday(stepsData.data.steps || 0);
      }
      if (heartData.success) {
        setHeartPoints(heartData.data.heartPoints || 0);
      }
      if (targetData.success) {
        setTargetSteps(targetData.data.targetSteps || 10000);
      }
      
      // Store Google Fit data to localStorage for stress indicator
      const googleFitLatest = {
        stepsToday: stepsData.data?.steps || 0,
        heartPoints: heartData.data?.heartPoints || 0,
        heartMinutes: heartData.data?.heartMinutes || 0,
        restingHeartRate: heartData.data?.restingHeartRate,
        avgHeartRate: heartData.data?.avgHeartRate,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('googlefit_latest', JSON.stringify(googleFitLatest));
      
      // Also fetch 7-day data for comparison
      await fetchSevenDayData(accessToken);
    } catch (err) {
      console.error('Failed to fetch Google Fit data:', err);
      // Do not treat fetch errors as an immediate logout. Keep token until user disconnects.
      setError(`Data fetch error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSevenDayData = async (accessToken) => {
    try {
      const [stepsRes, heartRes] = await Promise.all([
        fetch(`http://localhost:4000/google-fit/steps?accessToken=${accessToken}&days=7`),
        fetch(`http://localhost:4000/google-fit/heart-rate?accessToken=${accessToken}&days=7`)
      ]);
      
      if (!stepsRes.ok || !heartRes.ok) {
        throw new Error('Failed to fetch 7-day metrics');
      }
      
      const stepsData = await stepsRes.json();
      const heartData = await heartRes.json();
      
      console.log('[GoogleFitPanel 7Days] Steps:', stepsData);
      console.log('[GoogleFitPanel 7Days] Heart:', heartData);
      
      setSevenDayData({
        steps: stepsData.data,
        heart: heartData.data
      });
      
      // Update localStorage with resting heart rate estimate (minimum daily average)
      if (heartData.success && heartData.data?.dailyAverages?.length > 0) {
        const dailyAverages = heartData.data.dailyAverages;
        const minHeartRate = Math.min(...dailyAverages.map(d => d.average));
        
        // Update googlefit_latest with resting HR estimate
        const googleFitLatest = JSON.parse(localStorage.getItem('googlefit_latest') || '{}');
        googleFitLatest.restingHeartRate = minHeartRate;
        googleFitLatest.avgHeartRate = Math.round(dailyAverages.reduce((sum, d) => sum + d.average, 0) / dailyAverages.length);
        localStorage.setItem('googlefit_latest', JSON.stringify(googleFitLatest));
      }
    } catch (err) {
      console.error('Failed to fetch 7-day data:', err);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect Google Fit? You can reconnect anytime.')) {
      localStorage.removeItem('googlefit_token');
      setIsConnected(false);
      setStepsToday(0);
      setHeartPoints(0);
      setTargetSteps(10000);
      setError('');
      setShowDetails(false);
    }
  };

  const handleRefresh = async () => {
    const token = localStorage.getItem('googlefit_token');
    if (token) {
      await fetchGoogleFitData(token);
      try { window.dispatchEvent(new CustomEvent('googlefit_connected', { detail: { accessToken: token } })); } catch(e) {}
    }
  };

  return (
    <div style={{ padding: 12, fontSize: '13px', lineHeight: '1.6' }}>
      {!isConnected ? (
        <div>
          <button
            onClick={connectToGoogleFit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              background: '#EA4335',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s ease',
              marginBottom: error ? '10px' : 0
            }}
            onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
          >
            {loading ? ' Connecting...' : ' Connect Google Fit'}
          </button>
          
          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '8px 10px',
              borderRadius: 6,
              marginTop: '8px',
              fontSize: '12px',
              textAlign: 'left'
            }}>
               {error}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <h5 style={{ margin: '0 0 4px 0', color: '#0F4761', fontSize: '14px', fontWeight: 600 }}>
                ✅ Google Fit Connected
              </h5>
              {stepsToday > 0 && (
                <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                  {/* ✅ UPDATED: Show Heart Points (HP) instead of vigorous mins */}
                  {stepsToday.toLocaleString()} / {targetSteps.toLocaleString()} steps • {heartPoints} HP
                </p>
              )}
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6FA8F1',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 4px'
              }}
            >
              {showDetails ? '▼' : '▶'}
            </button>
          </div>

          {showDetails && (
            <>
              {/* Period Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                <button
                  onClick={() => setTimePeriod('today')}
                  style={{
                    background: timePeriod === 'today' ? '#4FD1C5' : '#f0f0f0',
                    color: timePeriod === 'today' ? '#fff' : '#666',
                    border: 'none',
                    borderRadius: 4,
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimePeriod('7days')}
                  style={{
                    background: timePeriod === '7days' ? '#6FA8F1' : '#f0f0f0',
                    color: timePeriod === '7days' ? '#fff' : '#666',
                    border: 'none',
                    borderRadius: 4,
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Past 7 Days
                </button>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
                padding: 10,
                borderRadius: 8,
                marginBottom: '10px'
              }}>
                {loading ? (
                  <p style={{ margin: 0, color: '#888' }}>Loading health data...</p>
                ) : timePeriod === 'today' ? (
                  <>
                    <p style={{ margin: '6px 0', fontSize: '12px' }}>
                      <strong>Today's Steps:</strong> {stepsToday.toLocaleString()} / {targetSteps.toLocaleString()}
                    </p>
                    <div style={{
                      background: '#fff',
                      height: '4px',
                      borderRadius: '2px',
                      marginTop: '4px',
                      marginBottom: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        background: stepsToday >= targetSteps ? '#4FD1C5' : '#6FA8F1',
                        height: '100%',
                        width: `${Math.min((stepsToday / targetSteps) * 100, 100)}%`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    
                    {/* ✅ UPDATED: Heart Points instead of Vigorous Minutes */}
                    <p style={{ margin: '8px 0 6px 0', fontSize: '12px' }}>
                      <strong>❤️ Heart Points:</strong> {heartPoints} HP
                    </p>
                    {heartPoints === 0 && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#999', fontStyle: 'italic' }}>
                        No vigorous activity recorded today. Requires 70%+ max heart rate exercise.
                      </p>
                    )}
                  </>
                ) : sevenDayData ? (
                  <>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#0F4761' }}>
                      7-Day Summary
                    </p>
                    <p style={{ margin: '6px 0', fontSize: '12px' }}>
                      <strong>Total Steps:</strong> {sevenDayData.steps.totalSteps.toLocaleString()}
                    </p>
                    <p style={{ margin: '6px 0', fontSize: '12px' }}>
                      <strong>Daily Average:</strong> {sevenDayData.steps.average.toLocaleString()} steps
                    </p>
                    
                    {/* ✅ UPDATED: Heart Points instead of Vigorous Minutes */}
                    {sevenDayData.heart && (
                      <p style={{ margin: '6px 0', fontSize: '12px' }}>
                        <strong>Heart Points:</strong> {sevenDayData.heart.totalHeartMinutes || 0} HP
                      </p>
                    )}
                    
                    {sevenDayData.steps.dailySteps.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '11px' }}>
                        <p style={{ margin: '6px 0', fontWeight: 600 }}>Daily Breakdown:</p>
                        {sevenDayData.steps.dailySteps.map((day, idx) => (
                          <div key={idx} style={{ margin: '4px 0', color: '#666' }}>
                            <span>{day.date}:</span> <strong>{day.steps.toLocaleString()}</strong> steps
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>No 7-day data available yet</p>
                )}
              </div>
            </>
          )}

          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '8px 10px',
              borderRadius: 6,
              marginBottom: '10px',
              fontSize: '12px'
            }}>
               {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh health data from Google Fit"
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                background: '#4FD1C5',
                color: '#fff',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
            >
              {loading ? '' : ''} Refresh
            </button>
            
            <button
              onClick={connectToGoogleFit}
              title="Reconnect with a different Google account"
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                background: '#6FA8F1',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
               Reconnect
            </button>

            <button
              onClick={handleDisconnect}
              title="Disconnect Google Fit"
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 6,
                background: '#ff6b6b',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
               Disconnect
            </button>
          </div>

          <p style={{
            margin: '8px 0 0 0',
            fontSize: '11px',
            fontStyle: 'italic',
            color: '#888'
          }}>
             Tip: Click "Refresh" to sync latest health data, or "Reconnect" to use a different account.
          </p>
        </div>
      )}
    </div>
  );
}
