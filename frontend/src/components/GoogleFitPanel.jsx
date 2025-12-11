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
  const [timePeriod, setTimePeriod] = useState('today');
  const [sevenDayData, setSevenDayData] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  useEffect(() => {
    // Check immediately on mount
    const token = localStorage.getItem('googlefit_token');
    console.log('[GoogleFitPanel] ========================================');
    console.log('[GoogleFitPanel] Component mounted!');
    console.log('[GoogleFitPanel] Token check:', token ? `Token found (${token.substring(0, 20)}...)` : 'NO TOKEN FOUND');
    
    if (token) {
      console.log('[GoogleFitPanel] ✅ Token found on mount, fetching data...');
      setIsConnected(true);
      setShowDetails(true);
      fetchGoogleFitData(token);
    }

    // Listen for storage changes
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

  // ✅ Auto-refresh every 10 minutes
  useEffect(() => {
    if (!autoRefreshEnabled || !isConnected) return;

    const token = localStorage.getItem('googlefit_token');
    if (!token) return;

    console.log('[GoogleFitPanel] 🔄 Auto-refresh scheduled (every 10 minutes)');
    
    // First refresh after 10 minutes
    const autoRefreshInterval = setInterval(() => {
      const currentToken = localStorage.getItem('googlefit_token');
      if (currentToken && autoRefreshEnabled) {
        console.log('[GoogleFitPanel] 🔄 Auto-refresh triggered...');
        fetchGoogleFitData(currentToken);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(autoRefreshInterval);
  }, [autoRefreshEnabled, isConnected]);

  const checkGoogleFitConnection = () => {
    const token = localStorage.getItem('googlefit_token');
    console.log('[GoogleFitPanel] checkGoogleFitConnection called, token:', token ? 'exists' : 'missing');
    if (token) {
      setIsConnected(true);
      setShowDetails(true);
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
            setShowDetails(true);
            setError('');
            fetchGoogleFitData(accessToken);
            window.removeEventListener('message', handleMessage);
            if (authWindow && !authWindow.closed) authWindow.close();
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
      
      console.log('[GoogleFitPanel] Starting data fetch with token:', accessToken.substring(0, 20) + '...');

      // Fetch steps, heart points, and target steps
      const stepsRes = await fetch(`http://localhost:4000/google-fit/steps-today?accessToken=${encodeURIComponent(accessToken)}`);
      console.log('[GoogleFitPanel] Steps endpoint response:', stepsRes.status);
      
      const heartRes = await fetch(`http://localhost:4000/google-fit/heart-points?accessToken=${encodeURIComponent(accessToken)}`);
      console.log('[GoogleFitPanel] Heart points endpoint response:', heartRes.status);
      
      const targetRes = await fetch(`http://localhost:4000/google-fit/target-steps?accessToken=${encodeURIComponent(accessToken)}`);
      console.log('[GoogleFitPanel] Target steps endpoint response:', targetRes.status);
      
      // Check for 401 errors (token expired)
      if (stepsRes.status === 401 || heartRes.status === 401) {
        console.warn('[GoogleFitPanel] Received 401 - Token expired');
        setTokenExpired(true);
        setError('🔄 Google Fit authorization expired. Please reconnect.');
        setIsConnected(false);
        setLoading(false);
        return;
      }
      
      // Check response status and log errors
      if (!stepsRes.ok) {
        const stepsError = await stepsRes.text();
        console.error('[GoogleFitPanel] ❌ Steps fetch failed:', stepsRes.status, stepsError);
        setError(`Steps fetch failed (${stepsRes.status})`);
        setLoading(false);
        return;
      }
      
      if (!heartRes.ok) {
        const heartError = await heartRes.text();
        console.error('[GoogleFitPanel] ❌ Heart points fetch failed:', heartRes.status, heartError);
        setError(`Heart data fetch failed (${heartRes.status})`);
        setLoading(false);
        return;
      }
      
      if (!targetRes.ok) {
        const targetError = await targetRes.text();
        console.error('[GoogleFitPanel] ❌ Target steps fetch failed:', targetRes.status, targetError);
        // Don't fail entirely if target-steps fails, as it's optional
        console.warn('[GoogleFitPanel] Target steps fetch failed, using default 10000');
      }
      
      // Parse successful responses
      try {
        const stepsData = await stepsRes.json();
        const heartData = await heartRes.json();
        const targetData = targetRes.ok ? await targetRes.json() : { data: { targetSteps: 10000 } };
        
        console.log('[GoogleFitPanel] ✅ Parsed responses:', { stepsData, heartData, targetData });
        
        if (stepsData.success) {
          setStepsToday(stepsData.data.steps || 0);
          console.log('[GoogleFitPanel] Steps set to:', stepsData.data.steps || 0);
        }
        
        if (heartData.success) {
          setHeartPoints(heartData.data.heartPoints || 0);
          console.log('[GoogleFitPanel] Heart points set to:', heartData.data.heartPoints || 0);
        }
        
        if (targetData.success || targetData.data) {
          setTargetSteps(targetData.data.targetSteps || 10000);
        }
        
        // Store latest data in localStorage
        const googleFitLatest = {
          stepsToday: stepsData.data?.steps || 0,
          heartPoints: heartData.data?.heartPoints || 0,
          heartMinutes: heartData.data?.heartMinutes || 0,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('googlefit_latest', JSON.stringify(googleFitLatest));
        
        // ✅ Update last refresh time
        setLastRefreshTime(new Date());
        
        console.log('[GoogleFitPanel] ✅ Data fetch successful, fetching 7-day data...');
        await fetchSevenDayData(accessToken);
        
      } catch (parseErr) {
        console.error('[GoogleFitPanel] ❌ JSON parse error:', parseErr);
        setError(`Parse error: ${parseErr.message}`);
      }
      
    } catch (err) {
      console.error('[GoogleFitPanel] ❌ Fetch error:', err);
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
        console.warn('[GoogleFitPanel] 7-day fetch failed:', stepsRes.status, heartRes.status);
        return;
      }
      
      const stepsData = await stepsRes.json();
      const heartData = await heartRes.json();
      
      setSevenDayData({
        steps: stepsData.data,
        heart: heartData.data
      });
      
      if (heartData.success && heartData.data?.dailyAverages?.length > 0) {
        const dailyAverages = heartData.data.dailyAverages;
        const minHeartRate = Math.min(...dailyAverages.map(d => d.average));
        
        const googleFitLatest = JSON.parse(localStorage.getItem('googlefit_latest') || '{}');
        googleFitLatest.restingHeartRate = minHeartRate;
        googleFitLatest.avgHeartRate = Math.round(dailyAverages.reduce((sum, d) => sum + d.average, 0) / dailyAverages.length);
        localStorage.setItem('googlefit_latest', JSON.stringify(googleFitLatest));
      }
    } catch (err) {
      console.error('Failed to fetch 7-day data:', err);
    }
  };

  // ✅ Manual refresh handler
  const handleRefresh = async () => {
    const token = localStorage.getItem('googlefit_token');
    if (token) {
      console.log('[GoogleFitPanel] 🔄 Manual refresh triggered...');
      await fetchGoogleFitData(token);
      try { window.dispatchEvent(new CustomEvent('googlefit_connected', { detail: { accessToken: token } })); } catch(e) {}
    }
  };

  return (
    <div style={{ padding: 10, fontSize: '12px', lineHeight: '1.5' }}>
      {!isConnected ? (
        <div>
          <button
            onClick={connectToGoogleFit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              background: '#EA4335',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '12px',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s ease',
              marginBottom: error ? '8px' : 0
            }}
            onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
          >
            {loading ? '⏳ Connecting...' : '🔗 Connect Google Fit'}
          </button>
          
          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '6px 8px',
              borderRadius: 6,
              marginTop: '6px',
              fontSize: '11px'
            }}>
              {error}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <h5 style={{ margin: '0 0 3px 0', color: '#0F4761', fontSize: '13px', fontWeight: 600 }}>
                ✅ Google Fit Connected
              </h5>
              {stepsToday > 0 && (
                <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>
                  🚶 {stepsToday.toLocaleString()} / {targetSteps.toLocaleString()} • ❤️ {heartPoints} HP
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
                fontSize: '14px',
                fontWeight: 600,
                padding: '0 4px'
              }}
            >
              {showDetails ? '▼' : '▶'}
            </button>
          </div>

          {showDetails && (
            <>
              {/* Period Tabs */}
              <div style={{ display: 'flex', gap: 3, marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>
                <button
                  onClick={() => setTimePeriod('today')}
                  style={{
                    flex: 1,
                    background: timePeriod === 'today' ? '#4FD1C5' : '#f0f0f0',
                    color: timePeriod === 'today' ? '#fff' : '#666',
                    border: 'none',
                    borderRadius: 3,
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimePeriod('7days')}
                  style={{
                    flex: 1,
                    background: timePeriod === '7days' ? '#4FD1C5' : '#f0f0f0',
                    color: timePeriod === '7days' ? '#fff' : '#666',
                    border: 'none',
                    borderRadius: 3,
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  7 Days
                </button>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
                padding: 8,
                borderRadius: 6,
                marginBottom: '8px',
                fontSize: '11px',
                minHeight: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                {loading ? (
                  // ✅ NEW: Enhanced loading state
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="skeleton" style={{ height: '12px', width: '80%', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ height: '12px', width: '70%', borderRadius: '4px' }} />
                  </div>
                ) : timePeriod === 'today' ? (
                  <>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 600, color: '#0F4761' }}>
                      <strong>🚶 Steps:</strong> {stepsToday.toLocaleString()} / {targetSteps.toLocaleString()}
                    </p>
                    <div style={{
                      background: '#fff',
                      height: '4px',
                      borderRadius: '2px',
                      marginTop: '3px',
                      marginBottom: '8px',
                      overflow: 'hidden',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{
                        background: stepsToday >= targetSteps ? 'linear-gradient(90deg, #4FD1C5, #2db8a8)' : 'linear-gradient(90deg, #6FA8F1, #5191d8)',
                        height: '100%',
                        width: `${Math.min((stepsToday / targetSteps) * 100, 100)}%`,
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
                    
                    <p style={{ margin: '4px 0', fontSize: '11px', fontWeight: 600, color: '#0F4761' }}>
                      <strong>❤️ Heart Points:</strong> {heartPoints} HP
                    </p>
                  </>
                ) : sevenDayData ? (
                  <>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 600, color: '#0F4761' }}>
                      📊 7-Day Summary
                    </p>
                    <p style={{ margin: '3px 0', fontSize: '10px' }}>
                      🚶 Total: {sevenDayData.steps?.totalSteps?.toLocaleString() || 0}
                    </p>
                    <p style={{ margin: '3px 0', fontSize: '10px' }}>
                      📈 Daily Avg: {sevenDayData.steps?.average?.toLocaleString() || 0}
                    </p>
                  </>
                ) : (
                  <div className="empty-state" style={{ padding: '20px' }}>
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-text">No data available</div>
                  </div>
                )}
              </div>

              {error && (
                <div style={{
                  background: '#fee',
                  color: '#c33',
                  padding: '6px 8px',
                  borderRadius: 6,
                  marginBottom: '8px',
                  fontSize: '10px',
                  border: '1px solid #fcc',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* ✅ SIMPLIFIED: Only Refresh Button with better styling */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  title="Refresh health data"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: loading ? 'linear-gradient(135deg, #ddd, #ccc)' : 'linear-gradient(135deg, #4FD1C5, #2db8a8)',
                    color: '#fff',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                    transition: 'all 0.3s ease',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(79, 209, 197, 0.3)',
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseOver={(e) => !loading && (e.target.style.boxShadow = '0 6px 20px rgba(79, 209, 197, 0.4)')}
                  onMouseOut={(e) => !loading && (e.target.style.boxShadow = '0 4px 12px rgba(79, 209, 197, 0.3)')}
                >
                  {loading ? '⏳ Syncing...' : '🔄 Sync Now'}
                </button>
              </div>

              {/* ✅ Enhanced: Last refresh time and auto-refresh status */}
              <div style={{
                marginTop: '10px',
                padding: '8px 10px',
                background: 'linear-gradient(135deg, rgba(111, 168, 241, 0.08) 0%, rgba(79, 209, 197, 0.08) 100%)',
                borderRadius: 5,
                fontSize: '10px',
                color: '#666',
                textAlign: 'center',
                border: '1px solid rgba(111, 168, 241, 0.15)',
                animation: 'fadeIn 0.3s ease'
              }}>
                {lastRefreshTime ? (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                      ✅ Last synced: {lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ color: '#888', fontSize: '9px' }}>
                      ⏱️ Auto-sync every 10 min {autoRefreshEnabled ? '✓' : '✗'}
                    </div>
                  </>
                ) : (
                  <div style={{ fontStyle: 'italic', color: '#999' }}>⏳ Awaiting first sync...</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
