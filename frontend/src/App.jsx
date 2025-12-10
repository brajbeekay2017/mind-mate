import React, { useEffect, useState } from 'react'
import ChatPanel from './components/ChatPanel'
import MoodInput from './components/MoodInput'
import TrendChart from './components/TrendChart'
import SummaryPanel from './components/SummaryPanel'
import BreathingExercise from './components/BreathingExercise'
import GoogleFitPanel from './components/GoogleFitPanel'
import StressRecoveryChallenge from './components/StressRecoveryChallenge'
import TeamAlertsPanel from './components/TeamAlertsPanel'
import SmartRecommendations from './components/SmartRecommendations'
import HistoricCalendar from './components/HistoricCalendar'
import mindMateLogo from '../Images/MindMateFinal.png'
import './styles.css'

export default function App({ onLogout }){
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryStats, setSummaryStats] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [userId, setUserId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stressAlert, setStressAlert] = useState(null)

  useEffect(()=>{
    // load last 10 entries from backend, or from localStorage fallback
    async function load(){
      try{
        const user = JSON.parse(localStorage.getItem('mindmate_user') || '{}');
        const uid = user.userId;
        setUserId(uid);
        setIsAdmin(user.isAdmin || false);
        
        const res = await fetch(`http://localhost:4000/mood?userId=${uid}`);
        if(res.ok){
          const data = await res.json();
          setEntries(data.entries || []);
          localStorage.setItem('mindmate_entries', JSON.stringify(data.entries || []));
          return;
        }
      }catch(e){/* ignore */}
      // fallback to localStorage
      const stored = localStorage.getItem('mindmate_entries');
      if(stored) setEntries(JSON.parse(stored));
    }
    load();
      // (moved auto-fetch to a separate effect that reacts to `entries`)
  },[refreshKey])

    // Fetch summary whenever entries or userId change (auto after save)
    useEffect(() => {
      let mounted = true;
      async function fetchSummaryForUser() {
        if (!userId) return;
        try {
          setSummaryLoading(true);
          const res = await fetch(`http://localhost:4000/summary?userId=${userId}`);
          if (!mounted) return;
          if (res.ok) {
            const data = await res.json();
            setSummary(data.summary);
            setSummaryStats(data.stats || null);
          }
        } catch (e) {
          console.warn('Summary fetch failed:', e.message || e);
        } finally {
          if (mounted) setSummaryLoading(false);
        }
      }

      fetchSummaryForUser();
      return () => { mounted = false; };
    }, [entries, userId]);

  // Poll stress-check endpoint every 1s while on dashboard to show notification
  useEffect(() => {
    let mounted = true;
    let interval = null;
    async function fetchStress() {
      if (!userId) return;
      try {
        const googleFitData = JSON.parse(localStorage.getItem('googlefit_latest') || 'null') || {};
        const res = await fetch(`http://localhost:4000/alerts/stress-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, googleFitData })
        });
        if (!mounted) return;
        const j = await res.json();
        if (res.ok) setStressAlert(j);
      } catch (e) {
        // don't spam console on every tick
      }
    }

    if (activeTab === 'dashboard' && userId) {
      // initial fetch then every 1s
      fetchStress();
      interval = setInterval(fetchStress, 1000);
    }

    return () => { mounted = false; if (interval) clearInterval(interval); };
  }, [activeTab, userId, entries]);

  const handleClearData = async () => {
    // Check if there's any data to clear
    if (entries.length === 0) {
      alert('No data to clear. Start logging moods to get started!');
      return;
    }

    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('mindmate_user') || '{}');
      const uid = user.userId;
      
      // Call backend to clear data
      const res = await fetch(`http://localhost:4000/mood/clear?userId=${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });
      
      if (res.ok) {
        // Clear frontend state
        setEntries([]);
        setSummary(null);
        localStorage.removeItem('mindmate_entries');
        // Force re-render by incrementing key
        setRefreshKey(prev => prev + 1);
        alert('All data has been cleared successfully!');
      }
    } catch (e) {
      console.error('Error clearing data:', e);
      alert('Failed to clear data. Please try again.');
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh'}}>
      <div style={{padding:20,background:'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:16,flexShrink:0}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div className="logo-circle">
            <img src={mindMateLogo} alt="Mind Mate" style={{height:80,width:80,objectFit:'contain'}} />
          </div>
          <h2 style={{margin:'12px 0 0 0',fontSize:'20px',fontWeight:'400',fontFamily:"'Segoe Print', 'Comic Sans MS', cursive, sans-serif",letterSpacing:'1px',background:'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',fontStyle:'italic',animation:'emboss-pulse 2s ease-in-out infinite'}}>Mind Mate</h2>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1}}>
          <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:12,flexShrink:0}}>
            <button onClick={() => setActiveTab('dashboard')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'dashboard' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'dashboard' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>Dashboard</button>
            <button onClick={() => setActiveTab('calendar')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'calendar' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'calendar' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>📅 Calendar</button>
            <button onClick={() => setActiveTab('recovery')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'recovery' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'recovery' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>Recovery</button>
            <button onClick={() => setActiveTab('recommendations')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'recommendations' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'recommendations' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>Recommendations</button>
            {isAdmin && <button onClick={() => setActiveTab('alerts')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'alerts' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'alerts' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>Alerts</button>}
          </div>
          <BreathingExercise />
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button 
            onClick={handleClearData}
            style={{padding:'10px 14px',borderRadius:10,background:'#ff6b6b',color:'#fff',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',boxShadow:'0 4px 12px rgba(255, 107, 107, 0.3)',transition:'all 0.3s ease',whiteSpace:'nowrap'}}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            title="Clear all data and start fresh"
          >
            🗑️ Clear Data
          </button>
          <button 
            onClick={onLogout}
            style={{padding:'10px 14px',borderRadius:10,background:'#667eea',color:'#fff',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px',boxShadow:'0 4px 12px rgba(102, 126, 234, 0.3)',transition:'all 0.3s ease',whiteSpace:'nowrap'}}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            title="Logout from Mind Mate"
          >
            🚪 Logout
          </button>
        </div>
      </div>
      
      {activeTab === 'dashboard' && (
        <div style={{padding:16}}>
          {/* Dashboard-level stress alert banner */}
          {stressAlert && (
            <div style={{marginBottom:12, borderRadius:10, padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, boxShadow:'0 6px 22px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:52, height:52, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18, background: stressAlert.severity === 'very_high' ? '#9b1c1c' : (stressAlert.severity === 'high' ? '#d32f2f' : (stressAlert.severity === 'moderate' ? '#ff9800' : '#4caf50'))}}>
                  {stressAlert.severity === 'very_high' ? '!!' : (stressAlert.severity === 'high' ? '!' : (stressAlert.severity === 'moderate' ? '•' : '✓'))}
                </div>
                <div>
                  <div style={{fontSize:16, fontWeight:800, color:'#222'}}>{(stressAlert.severity || 'Unknown').toUpperCase()} STRESS</div>
                  <div style={{color:'#444', fontSize:13, marginTop:4, maxWidth:800}}>{stressAlert.assessment ? stressAlert.assessment.split('\n')[0] : (stressAlert.reasons && stressAlert.reasons.length ? stressAlert.reasons.join('; ') : 'No issues detected')}</div>
                </div>
              </div>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <button onClick={() => { if (stressAlert?.spoken) { const u = new SpeechSynthesisUtterance(stressAlert.spoken); window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } }} style={{padding:'10px 14px', borderRadius:8, border:'none', background:'#4FD1C5', color:'#fff', fontWeight:700}}>🔊 Play</button>
                <button onClick={() => setActiveTab('alerts')} style={{padding:'10px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff'}}>View Details</button>
              </div>
            </div>
          )}

          <div className="app-grid">
        <div className="card">
          <MoodInput onSaved={(e)=>{ setEntries(e); localStorage.setItem('mindmate_entries', JSON.stringify(e)); }} />
          <GoogleFitPanel entries={entries} />
        </div>
        <div className="card" style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <ChatPanel key={refreshKey} />
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <h4>Trend</h4>
            <TrendChart key={refreshKey} entries={entries} />
          </div>
          <div className="card">
            <h4>Summary</h4>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{flex:1}} />
              </div>
            <SummaryPanel key={refreshKey} summary={summary} entries={entries} loading={summaryLoading} stats={summaryStats} />
          </div>
        </div>
      </div>
      )}
      
      {activeTab === 'recovery' && (
      <div style={{padding:20,overflow:'auto',flex:1}}>
        <StressRecoveryChallenge userId={userId} />
      </div>
      )}
      
      {activeTab === 'calendar' && (
      <div style={{flex:1,overflow:'auto'}}>
        <HistoricCalendar entries={entries} userId={userId} />
      </div>
      )}
      
      {activeTab === 'recommendations' && (
      <div style={{padding:20,overflow:'auto',flex:1}}>
        <SmartRecommendations userId={userId} />
      </div>
      )}
      
      {activeTab === 'alerts' && (
      <div style={{padding:20,overflow:'auto',flex:1}}>
        <TeamAlertsPanel userId={userId} teamId="team-1" isAdmin={isAdmin} />
      </div>
      )}
    </div>
  )
}
