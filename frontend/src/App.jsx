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
import StressAlertNotification from './components/StressAlertNotification'
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
  const [userName, setUserName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  useEffect(()=>{
    // Close profile menu when clicking outside
    const handleClickOutside = (e) => {
      if (showProfileMenu && !e.target.closest('#profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileMenu]);

  useEffect(()=>{
    // load last 10 entries from backend, or from localStorage fallback
    async function load(){
      try{
        const user = JSON.parse(localStorage.getItem('mindmate_user') || '{}');
        const uid = user.userId;
        setUserId(uid);
        setUserName(user.name || user.email || 'User');
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
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',minWidth:'fit-content'}}>
          <div className="logo-circle">
            <img src={mindMateLogo} alt="Mind Mate" style={{height:80,width:80,objectFit:'contain'}} />
          </div>
          <h2 style={{margin:'12px 0 0 0',fontSize:'20px',fontWeight:'400',fontFamily:"'Segoe Print', 'Comic Sans MS', cursive, sans-serif",letterSpacing:'1px',background:'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',fontStyle:'italic',animation:'emboss-pulse 2s ease-in-out infinite'}}>Mind Mate</h2>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1}}>
          <div style={{paddingLeft:'5%',display:'flex',justifyContent:'center',gap:8,marginBottom:12,flexShrink:0}}>
            <button onClick={() => setActiveTab('dashboard')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'dashboard' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'dashboard' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>Dashboard</button>
            <button onClick={() => setActiveTab('calendar')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'calendar' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'calendar' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>📅 Calendar</button>
            <button onClick={() => setActiveTab('recovery')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'recovery' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'recovery' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>Recovery</button>
            <button onClick={() => setActiveTab('recommendations')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'recommendations' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'recommendations' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>Recommendations</button>
            {isAdmin && <button onClick={() => setActiveTab('alerts')} style={{padding:'8px 12px',borderRadius:8,background: activeTab === 'alerts' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ddd',color: activeTab === 'alerts' ? '#fff' : '#333',border:'none',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>Alerts</button>}
          </div>
          <div style={{width:'100%',display:'flex',justifyContent:'center'}}>
            <BreathingExercise />
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center',minWidth:'fit-content'}}>
          <StressAlertNotification userId={userId} refreshKey={refreshKey} />
          
          {/* Profile Menu */}
          <div id="profile-menu-container" style={{position:'relative'}}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                padding:'10px 16px',
                borderRadius:10,
                background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color:'#fff',
                border:'none',
                cursor:'pointer',
                fontWeight:'600',
                fontSize:'13px',
                boxShadow:'0 4px 12px rgba(102, 126, 234, 0.3)',
                transition:'all 0.3s ease',
                whiteSpace:'nowrap',
                display:'flex',
                alignItems:'center',
                gap:8
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span style={{fontSize:'18px',width:'24px',height:'24px',borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>👤</span>
              <span>{userName || 'User'}</span>
              <span style={{fontSize:'10px'}}>{showProfileMenu ? '▲' : '▼'}</span>
            </button>
            
            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div style={{
                position:'absolute',
                top:'100%',
                right:0,
                marginTop:8,
                background:'#fff',
                borderRadius:10,
                boxShadow:'0 8px 24px rgba(0,0,0,0.15)',
                minWidth:200,
                overflow:'hidden',
                zIndex:1000
              }}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',fontSize:'12px',color:'#666',fontWeight:'600'}}>
                  Welcome, {userName || 'User'}!
                </div>
                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleClearData();
                  }}
                  style={{
                    width:'100%',
                    padding:'12px 16px',
                    background:'transparent',
                    border:'none',
                    textAlign:'left',
                    cursor:'pointer',
                    fontSize:'13px',
                    fontWeight:'500',
                    color:'#ff6b6b',
                    display:'flex',
                    alignItems:'center',
                    gap:10,
                    transition:'background 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>🗑️</span>
                  <span>Clear Data</span>
                </button>
                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  style={{
                    width:'100%',
                    padding:'12px 16px',
                    background:'transparent',
                    border:'none',
                    textAlign:'left',
                    cursor:'pointer',
                    fontSize:'13px',
                    fontWeight:'500',
                    color:'#667eea',
                    display:'flex',
                    alignItems:'center',
                    gap:10,
                    transition:'background 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f5f7ff'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {activeTab === 'dashboard' && (
      <div className="app-grid" style={{marginTop: '-40px'}}>
        <div className="card">
          <MoodInput onSaved={(e)=>{ setEntries(e); localStorage.setItem('mindmate_entries', JSON.stringify(e)); setRefreshKey(prev => prev + 1); }} />
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
