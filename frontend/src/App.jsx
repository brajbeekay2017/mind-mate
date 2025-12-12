console.log('📦 [App.jsx] Loading...');

import React, { useEffect, useState } from 'react'
import { API_URL } from './config'

console.log('✅ [App.jsx] Config imported, API_URL:', API_URL);

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
        
        const res = await fetch(`${API_URL}/mood?userId=${uid}`);
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
          const res = await fetch(`${API_URL}/summary?userId=${userId}`);
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
      const res = await fetch(`${API_URL}/mood/clear?userId=${uid}`, {
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
          <div style={{paddingLeft:'5%',display:'flex',justifyContent:'center',gap:8,marginBottom:12,flexShrink:0,flexWrap:'wrap'}}>
            {[
              { id: 'dashboard', icon: '📊', label: 'Dashboard' },
              { id: 'calendar', icon: '📅', label: 'Calendar' },
              { id: 'recovery', icon: '🚀', label: 'Recovery' },
              { id: 'recommendations', icon: '💡', label: 'Tips' },
              { id: 'alerts', icon: '🚨', label: 'Alerts', adminOnly: true }
            ].filter(tab => !tab.adminOnly || isAdmin).map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: activeTab === tab.id 
                    ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)'
                    : '#f0f0f0',
                  color: activeTab === tab.id ? '#fff' : '#666',
                  border: activeTab === tab.id ? '2px solid rgba(111, 168, 241, 0.3)' : '2px solid transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? '700' : '500',
                  fontSize: '13px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: activeTab === tab.id ? '0 6px 20px rgba(111, 168, 241, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  // ✅ CRITICAL FIX: Prevent text selection
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  // ✅ Prevent default focus outline
                  outline: 'none',
                  // ✅ Smooth transition for all properties
                  WebkitTapHighlightColor: 'transparent'
                }}
                onMouseDown={(e) => {
                  // ✅ Prevent text selection on mouse down
                  e.preventDefault();
                }}
                onMouseOver={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(111, 168, 241, 0.15) 0%, rgba(79, 209, 197, 0.15) 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(111, 168, 241, 0.15)';
                  } else {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(111, 168, 241, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = '#f0f0f0';
                    e.currentTarget.style.boxShadow = 'none';
                  } else {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(111, 168, 241, 0.3)';
                  }
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onMouseUp={(e) => {
                  // ✅ Prevent text selection on mouse up
                  e.preventDefault();
                }}
                onFocus={(e) => {
                  // ✅ Custom focus style instead of browser default
                  e.currentTarget.style.outline = '3px solid rgba(79, 209, 197, 0.4)';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                <span style={{fontSize:'16px'}}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
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
