import React, { useEffect, useState } from 'react';

export default function StressAlertPanel({ userId = 'user-1' }) {
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [error, setError] = useState(null);

  async function runCheck() {
    setLoading(true);
    setError(null);
    try {
      const googleFitData = JSON.parse(localStorage.getItem('googlefit_latest') || 'null') || {};
      const res = await fetch(`http://localhost:4000/alerts/stress-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, googleFitData })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      setAlert(j);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { if (userId) runCheck(); }, [userId]);

  function playSpoken() {
    if (!alert?.spoken) return;
    try {
      const u = new SpeechSynthesisUtterance(alert.spoken);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.error('TTS error', e);
    }
  }

  return (
    <div style={{padding:12, borderRadius:8, background:'#fff', boxShadow:'0 2px 10px rgba(0,0,0,0.06)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <strong>Stress Check</strong>
        <button onClick={runCheck} disabled={loading} style={{padding:'6px 10px', borderRadius:6, border:'none', background: loading ? '#ccc' : '#4FD1C5', color:'#fff', cursor:'pointer'}}>{loading ? 'Checking…' : 'Run Check'}</button>
      </div>

      {error && <div style={{color:'#c00', marginTop:8}}>{error}</div>}

      {!alert && !error && <div style={{marginTop:8, color:'#666'}}>No alert yet. Click "Run Check" to analyze recent data.</div>}

      {alert && (
        <div style={{marginTop:10}}>
          <div><strong>Severity:</strong> {alert.severity}</div>
          {alert.reasons && alert.reasons.length > 0 && <div style={{marginTop:6}}><strong>Why:</strong> {alert.reasons.join('; ')}</div>}
          {alert.assessment && <div style={{marginTop:8, whiteSpace:'pre-wrap'}}>{alert.assessment}</div>}

          <div style={{marginTop:10, display:'flex', gap:8}}>
            <button onClick={playSpoken} style={{padding:'8px 10px', borderRadius:6, border:'none', background:'#6FA8F1', color:'#fff'}}>Play</button>
            <button onClick={runCheck} style={{padding:'8px 10px', borderRadius:6, border:'1px solid #eee', background:'#fff'}}>Refresh</button>
          </div>
        </div>
      )}
    </div>
  );
}
