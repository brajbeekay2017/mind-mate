import React, { useEffect, useState } from 'react';

export default function StressRecoveryChallenge({ userId = 'user-1', workContext = 'office', companyRole = 'general' }){
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [moodHistory, setMoodHistory] = useState([]);
  const [googleFitData, setGoogleFitData] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [taskProgress, setTaskProgress] = useState({});
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [completedDayNumber, setCompletedDayNumber] = useState(null);
  const [moodInput, setMoodInput] = useState(3);
  const [moodFeeling, setMoodFeeling] = useState('neutral');
  const [dashboardData, setDashboardData] = useState(null);
  const [lastCompletedChallenge, setLastCompletedChallenge] = useState(null);

  useEffect(()=>{
    const fetchMoodHistory = async () => {
      try {
        const res = await fetch(`http://localhost:4000/mood?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          setMoodHistory(data.entries || []);
        }
      } catch (e) {
        console.error('Error fetching mood history:', e);
      }
    };
    fetchMoodHistory();
  }, [userId]);

  useEffect(()=>{
    const fetchActiveChallenges = async () => {
      try {
        const res = await fetch(`http://localhost:4000/stress-recovery/active?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.active && data.active.length > 0) {
            setActiveChallenge(data.active[0]);
          }
        }
      } catch (e) {
        console.error('Error fetching active challenges:', e);
      }
    };
    
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:4000/stress-recovery/history?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          setChallengeHistory(data.challenges || []);
        }
      } catch (e) {
        console.error('Error fetching challenge history:', e);
      }
    };
    
    fetchActiveChallenges();
    fetchHistory();
  }, [userId]);

  // Helper to refresh active challenge and history from backend
  async function refreshActiveChallenges() {
    try {
      const res = await fetch(`http://localhost:4000/stress-recovery/active?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.active && data.active.length > 0) setActiveChallenge(data.active[0]);
        else setActiveChallenge(null);
      }
      const h = await fetch(`http://localhost:4000/stress-recovery/history?userId=${encodeURIComponent(userId)}`);
      if (h.ok) {
        const hd = await h.json();
        setChallengeHistory(hd.challenges || []);
      }
      // also refresh dashboard data
      try {
        const dres = await fetch(`http://localhost:4000/stress-recovery/dashboard?userId=${encodeURIComponent(userId)}`);
        if (dres.ok) {
          const dd = await dres.json();
          setDashboardData(dd);
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error('Refresh error:', e);
    }
  }

  useEffect(()=>{
    const es = new EventSource(`http://localhost:4000/team-alerts/stream?userId=${encodeURIComponent(userId)}`);
    es.onmessage = (e) => {
      try{
        const payload = JSON.parse(e.data);
        setEvents(prev => [payload, ...prev].slice(0, 20));
      }catch(err){
        // ignore
      }
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [userId]);

  async function generate(){
    setLoading(true);
    try{
      const payload = { 
        userId,
        moodHistory: moodHistory || [],
        googleFitData: googleFitData || {},
        workContext: workContext,
        companyRole: companyRole
      };
      const res = await fetch('http://localhost:4000/stress-recovery/generate', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setChallenge(data.challenge || data);
      setExpandedDay(null);
      setExpandedTask(null);
    }catch(e){
      console.error('Generate error', e);
      setChallenge({ title: 'Fallback plan', plan: 'Take a few deep breaths and go for a short walk.' });
    }
    setLoading(false);
  }

  async function start(){
    if(!challenge) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/stress-recovery/start', {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId, challenge })
      });
      const data = await res.json();
      // Refresh active challenge list from backend to get canonical data
      await refreshActiveChallenges();
      setTaskProgress({});
    } catch (e) {
      console.error('Start challenge error:', e);
    }
    setLoading(false);
  }

  async function updateTaskProgress(challengeId, dayNumber, taskName, completed) {
    try {
      await fetch('http://localhost:4000/stress-recovery/task-progress', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId, challengeId, dayNumber, taskName, completed })
      });
      setTaskProgress(prev => ({
        ...prev,
        [`${dayNumber}-${taskName}`]: completed
      }));
      // Refresh active challenge to reflect the changed task state
      await refreshActiveChallenges();
    } catch (e) {
      console.error('Task progress error:', e);
    }
  }

  async function completeDay(challengeId, dayNumber) {
    try {
      const res = await fetch('http://localhost:4000/stress-recovery/day-complete', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId, challengeId, dayNumber })
      });
      const data = await res.json();
      if (data.allComplete) {
        // challenge fully completed on backend; fetch latest history to get completed challenge details
        try {
          const h = await fetch(`http://localhost:4000/stress-recovery/history?userId=${encodeURIComponent(userId)}`);
          if (h.ok) {
            const hd = await h.json();
            // assume the most recent completed challenge is first in list
            const completed = hd.challenges && hd.challenges.slice(-1)[0];
            if (completed) {
              setLastCompletedChallenge({ ...completed, completionPercent: 100 });
            }
          }
        } catch (e) {
          console.error('Failed to fetch completed challenge:', e);
        }
        setActiveChallenge(null);
      }
      // Show mood input modal after completing a day
      setCompletedDayNumber(dayNumber);
      setShowMoodModal(true);
      // Refresh backend data so UI shows latest completion state
      await refreshActiveChallenges();
    } catch (e) {
      console.error('Day complete error:', e);
    }
  }

  async function saveMoodAfterDay() {
    try {
      // Save mood entry with reference to the challenge
      const payload = {
        userId,
        mood: moodInput,
        feeling: moodFeeling,
        stress: 5 - moodInput,
        context: 'challenge-completion',
        dayCompleted: completedDayNumber
      };
      
      const res = await fetch('http://localhost:4000/mood', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Mood saved successfully:', data);
        setShowMoodModal(false);
        setMoodInput(3);
        setMoodFeeling('neutral');
        // Refresh mood history and dashboard/active challenge state
        try {
          const mh = await fetch(`http://localhost:4000/mood?userId=${encodeURIComponent(userId)}`);
          if (mh.ok) {
            const mhd = await mh.json();
            setMoodHistory(mhd.entries || []);
          }
        } catch (err) {
          console.error('Failed to refresh mood history:', err);
        }
        await refreshActiveChallenges();
      } else {
        console.error('Failed to save mood:', res.statusText);
      }
    } catch (e) {
      console.error('Save mood error:', e);
    }
  }

  async function completeChallenge() {
    if(!activeChallenge) return;
    try {
      await fetch('http://localhost:4000/stress-recovery/complete', {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId, challengeId: activeChallenge.id })
      });
      setActiveChallenge(null);
    } catch (e) {
      console.error('Complete challenge error:', e);
    }
  }

  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()){
      case 'easy': return '#4FD1C5';
      case 'medium': return '#FFA07A';
      case 'hard': return '#FF6B6B';
      default: return '#999';
    }
  };

  const getCompletionPercentage = () => {
    if (!activeChallenge || !activeChallenge.days) return 0;
    const totalDays = activeChallenge.days.length;
    const completedDays = activeChallenge.days.filter(d => d.completed === true).length;
    return Math.round((completedDays / totalDays) * 100);
  };

  return (
    <div style={{padding:16}}>
      <h3>Stress Recovery Challenge (AI-Generated)</h3>
      <div style={{marginBottom:12, fontSize:'13px', color:'#666'}}>
        <p>Generated based on your mood history and activity patterns from the last 30 days</p>
      </div>
      
      {/* Active Challenge Banner */}
      {activeChallenge && (
        <div style={{background:'#e8f5e9', border:'2px solid #4CAF50', padding:12, borderRadius:8, marginBottom:12}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <div>
              <strong style={{color:'#2e7d32'}}>🚀 Active Challenge: {activeChallenge.name}</strong>
              <p style={{margin:'4px 0 0 0', fontSize:12, color:'#666'}}>Started: {activeChallenge.startTime ? new Date(activeChallenge.startTime).toLocaleString() : 'Today'}</p>
            </div>
            <button 
              onClick={completeChallenge}
              style={{padding:'6px 12px', background:'#4CAF50', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontSize:12}}
            >
              ✓ Complete Challenge
            </button>
          </div>
          
          {/* Progress Bar */}
          <div style={{background:'#fff', borderRadius:6, padding:10}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <span style={{fontSize:12, fontWeight:600, color:'#2e7d32'}}>Challenge Progress</span>
              <span style={{fontSize:14, fontWeight:700, color:'#4CAF50'}}>{getCompletionPercentage()}%</span>
            </div>
            <div style={{height:8, background:'#e0f2f1', borderRadius:4, overflow:'hidden'}}>
              <div style={{height:'100%', width:`${getCompletionPercentage()}%`, background:'linear-gradient(90deg, #4CAF50 0%, #4FD1C5 100%)', transition:'width 0.3s ease'}}></div>
            </div>
            <p style={{fontSize:11, color:'#666', margin:'6px 0 0 0'}}>
              {activeChallenge.days?.filter(d => d.completed).length || 0} of {activeChallenge.days?.length || 0} days completed
            </p>
          </div>
        </div>
      )}
      
      {/* Completed Challenge Banner (transient) */}
      {lastCompletedChallenge && (
        <div style={{background:'#fff3e0', border:'2px solid #FFB74D', padding:12, borderRadius:8, marginBottom:12}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <strong style={{color:'#e65100'}}>🎉 Challenge Completed: {lastCompletedChallenge.name}</strong>
              <p style={{margin:'4px 0 0 0', fontSize:12, color:'#666'}}>Completed: {new Date(lastCompletedChallenge.completedDate || lastCompletedChallenge.completedTime || Date.now()).toLocaleString()}</p>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:18, fontWeight:800, color:'#e65100'}}>100%</div>
              <button onClick={() => setLastCompletedChallenge(null)} style={{marginTop:8,padding:'6px 10px', borderRadius:6, border:'none', background:'#ffe0b2', cursor:'pointer'}}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginBottom:12}}>
        <button onClick={generate} disabled={loading} style={{padding:'8px 12px',borderRadius:8, background: loading ? '#ccc' : 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)', color:'#fff', border:'none', cursor: loading ? 'not-allowed' : 'pointer'}}>{loading ? 'Analyzing your data...' : 'Generate Challenge'}</button>
        <button onClick={start} disabled={!challenge || activeChallenge} style={{padding:'8px 12px',borderRadius:8,marginLeft:8, background: (challenge && !activeChallenge) ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : '#ccc', color:'#fff', border:'none', cursor: (challenge && !activeChallenge) ? 'pointer' : 'not-allowed'}}>Start Challenge</button>
      </div>

      {challenge ? (
        <div style={{background:'#fff',padding:16,borderRadius:8,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
          {/* Header Section */}
          <div style={{borderBottom:'2px solid #f0f0f0', paddingBottom:12, marginBottom:12}}>
            <h4 style={{margin:'0 0 8px 0'}}>{challenge.challengeName || 'Challenge'}</h4>
            <div style={{display:'flex', gap:12, flexWrap:'wrap', fontSize:12}}>
              {challenge.difficulty && (
                <span style={{padding:'2px 8px', background:getDifficultyColor(challenge.difficulty), color:'#fff', borderRadius:4}}>
                  Difficulty: {challenge.difficulty}
                </span>
              )}
              {challenge.duration && (
                <span style={{padding:'2px 8px', background:'#e8f4f8', color:'#0066cc', borderRadius:4}}>
                  ⏱ {challenge.duration}
                </span>
              )}
              {challenge.totalExpectedReduction && (
                <span style={{padding:'2px 8px', background:'#f0e8ff', color:'#6633cc', borderRadius:4}}>
                  📊 {challenge.totalExpectedReduction}% reduction
                </span>
              )}
            </div>
            <p style={{fontSize:13, color:'#666', margin:'8px 0 0 0'}}>{challenge.description}</p>
            {challenge.overview && (
              <p style={{fontSize:12, color:'#888', margin:'8px 0 0 0', fontStyle:'italic'}}>{challenge.overview}</p>
            )}
          </div>

          {/* Prerequisites & Target */}
          {(challenge.prerequisites || challenge.targetReduction) && (
            <div style={{background:'#f9f9f9', padding:10, borderRadius:6, marginBottom:12, fontSize:12}}>
              {challenge.targetReduction && <p style={{margin:'0 0 4px 0'}}><strong>Target:</strong> {challenge.targetReduction}</p>}
              {challenge.prerequisites && <p style={{margin:0}}><strong>You'll need:</strong> {challenge.prerequisites}</p>}
            </div>
          )}

          {/* Days Accordion */}
          {challenge.days && (
            <div style={{marginBottom:12}}>
              {challenge.days.map((day, i) => (
                <div key={i} style={{marginBottom:8, border:'1px solid #e0e0e0', borderRadius:6, overflow:'hidden'}}>
                  <button
                    onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                    style={{
                      width:'100%',
                      padding:12,
                      background: expandedDay === i ? '#f0f8ff' : '#fff',
                      border:'none',
                      textAlign:'left',
                      cursor:'pointer',
                      display:'flex',
                      justifyContent:'space-between',
                      alignItems:'center',
                      borderBottom: expandedDay === i ? '1px solid #e0e0e0' : 'none'
                    }}
                  >
                    <div>
                      <div style={{fontWeight:600, fontSize:14}}>Day {day.day}: {day.theme}</div>
                      {day.tagline && <div style={{fontSize:12, color:'#666', marginTop:2}}>{day.tagline}</div>}
                      {day.objective && <div style={{fontSize:12, color:'#4FD1C5', marginTop:2}}>{day.objective}</div>}
                    </div>
                    <span style={{fontSize:16}}>{expandedDay === i ? '▼' : '▶'}</span>
                  </button>

                  {expandedDay === i && (
                    <div style={{padding:12, background:'#fafafa', borderTop:'1px solid #e0e0e0'}}>
                      {day.tasks && day.tasks.map((task, ti) => (
                        <div key={ti} style={{marginBottom:10, background:'#fff', padding:10, borderRadius:4, borderLeft:'3px solid #4FD1C5'}}>
                          <button
                            onClick={() => setExpandedTask(expandedTask === `${i}-${ti}` ? null : `${i}-${ti}`)}
                            style={{
                              width:'100%',
                              textAlign:'left',
                              background:'none',
                              border:'none',
                              cursor:'pointer',
                              padding:0,
                              display:'flex',
                              justifyContent:'space-between',
                              alignItems:'center'
                            }}
                          >
                            <div>
                              <div style={{fontWeight:600, fontSize:13}}>{task.name}</div>
                              <div style={{fontSize:11, color:'#666', marginTop:2}}>
                                ⏱ {task.duration} | Impact: {task.impact}
                              </div>
                            </div>
                            <span>{expandedTask === `${i}-${ti}` ? '▼' : '▶'}</span>
                          </button>

                          {expandedTask === `${i}-${ti}` && (
                            <div style={{marginTop:10, paddingTop:10, borderTop:'1px solid #eee'}}>
                              <p style={{fontSize:12, color:'#555', margin:'0 0 8px 0'}}><strong>How:</strong> {task.technique}</p>
                              {task.steps && (
                                <div style={{fontSize:11, color:'#666', margin:'0 0 8px 0'}}>
                                  <strong>Steps:</strong>
                                  <ol style={{margin:'4px 0', paddingLeft:20}}>
                                    {task.steps.map((step, si) => (
                                      <li key={si} style={{margin:'2px 0'}}>{step}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              {task.workTip && <p style={{fontSize:11, color:'#4FD1C5', margin:'0 0 4px 0'}}><strong>💼 Work Tip:</strong> {task.workTip}</p>}
                              {task.alternatives && <p style={{fontSize:11, color:'#666', margin:0}}><strong>🔄 Alternatives:</strong> {task.alternatives}</p>}
                              
                              {/* Task Completion Checkbox */}
                              {activeChallenge && (
                                <div style={{marginTop:10, paddingTop:10, borderTop:'1px solid #eee', display:'flex', alignItems:'center', gap:8}}>
                                  <input
                                    type="checkbox"
                                    checked={taskProgress[`${day.day}-${task.name}`] || false}
                                    onChange={(e) => updateTaskProgress(activeChallenge.id, day.day, task.name, e.target.checked)}
                                    style={{width:18, height:18, cursor:'pointer'}}
                                  />
                                  <label style={{fontSize:12, color:'#666', cursor:'pointer', margin:0}}>
                                    Mark task as completed
                                  </label>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      <div style={{fontSize:12, color:'#666', marginTop:8, paddingTop:8, borderTop:'1px solid #eee'}}>
                        Expected reduction: <strong>{day.expectedReduction}%</strong>
                      </div>
                      {day.affirmation && (
                        <div style={{fontSize:12, color:'#4FD1C5', fontStyle:'italic', marginTop:6, fontWeight:'600'}}>
                          "{day.affirmation}"
                        </div>
                      )}
                      
                      {/* Day Completion Button */}
                      {activeChallenge && (
                        <div style={{marginTop:12, paddingTop:12, borderTop:'1px solid #eee'}}>
                          <button
                            onClick={() => completeDay(activeChallenge.id, day.day)}
                            style={{
                              width:'100%',
                              padding:'8px 12px',
                              background: '#4FD1C5',
                              color:'#fff',
                              border:'none',
                              borderRadius:4,
                              cursor:'pointer',
                              fontSize:12,
                              fontWeight:600
                            }}
                          >
                            ✓ Complete Day {day.day}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Summary Info */}
          <div style={{background:'#f0f8ff', padding:12, borderRadius:6, marginBottom:12}}>
            <p style={{margin:'0 0 6px 0', fontSize:12}}><strong>Success Rate:</strong> {challenge.successRate}</p>
            <p style={{margin:0, fontSize:12}}><strong>Total Expected Reduction:</strong> {challenge.totalExpectedReduction}%</p>
          </div>

          {/* Tips */}
          {challenge.tips && challenge.tips.length > 0 && (
            <div style={{background:'#fff8e1', padding:12, borderRadius:6, marginBottom:12}}>
              <strong style={{fontSize:12, display:'block', marginBottom:6}}>💡 Pro Tips:</strong>
              <ul style={{fontSize:11, color:'#666', margin:0, paddingLeft:20}}>
                {challenge.tips.map((tip, i) => (
                  <li key={i} style={{margin:'4px 0'}}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow Up */}
          {challenge.followUp && (
            <div style={{background:'#e8f5e9', padding:12, borderRadius:6, borderLeft:'4px solid #4CAF50'}}>
              <strong style={{fontSize:12, display:'block', marginBottom:4}}>✅ After Day 3:</strong>
              <p style={{fontSize:12, color:'#666', margin:0}}>{challenge.followUp}</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{color:'#666'}}>No challenge yet. Click "Generate Challenge" to create a personalized plan based on your data.</div>
      )}

      {/* Challenge History */}
      <h4 style={{marginTop:16}}>Challenge History</h4>
      <div style={{background:'#fbfbfb', padding:12, borderRadius:6, marginBottom:12, maxHeight:200, overflow:'auto'}}>
        {challengeHistory && challengeHistory.length > 0 ? (
          challengeHistory.map((ch, i) => (
            <div key={i} style={{padding:10, borderBottom:'1px solid #eee', fontSize:12}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <strong>{ch.name}</strong>
                  <p style={{margin:'4px 0 0 0', color:'#666', fontSize:11}}>
                    {ch.status === 'completed' ? '✅ Completed' : '⏳ In Progress'}
                  </p>
                </div>
                <span style={{fontSize:11, color:'#999'}}>
                  {new Date(ch.startTime).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{color:'#999', fontSize:12, padding:10}}>No completed challenges yet</div>
        )}
      </div>

      <h4 style={{marginTop:16}}>Recent Events</h4>
      <div style={{maxHeight:200,overflow:'auto',background:'#fbfbfb',padding:8,borderRadius:6}}>
        {events.map((ev,i)=> (
          <div key={i} style={{padding:8,borderBottom:'1px solid #eee', fontSize:12}}>
            <strong>{ev.channel || ev.type}</strong>: {ev.message || ev.type || ''}
            <div style={{fontSize:11,color:'#666'}}>{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}</div>
          </div>
        ))}
        {events.length === 0 && <div style={{color:'#999', fontSize:12}}>No events yet</div>}
      </div>

      {/* Mood Input Modal */}
      {showMoodModal && (
        <div style={{
          position:'fixed', top:0, left:0, width:'100%', height:'100%',
          background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:9999
        }}>
          <div style={{
            background:'#fff', padding:24, borderRadius:12, maxWidth:400, boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
            textAlign:'center'
          }}>
            <h3 style={{margin:'0 0 16px 0', color:'#333'}}>How are you feeling? 🌟</h3>
            <p style={{color:'#666', fontSize:14, marginBottom:16}}>You just completed Day {completedDayNumber}!</p>
            
            <div style={{marginBottom:16}}>
              <label style={{display:'block', fontSize:12, color:'#666', marginBottom:8}}>Mood Level (1-5)</label>
              <input 
                type="range" 
                min="1" max="5" 
                value={moodInput}
                onChange={(e) => setMoodInput(parseInt(e.target.value))}
                style={{width:'100%', cursor:'pointer'}}
              />
              <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'#999', marginTop:4}}>
                <span>😞 Stressed</span>
                <span>😊 Relaxed</span>
              </div>
              <p style={{margin:'12px 0 0 0', fontSize:14, fontWeight:600, color:'#4FD1C5'}}>
                {['', '😔 Very Stressed', '😟 Stressed', '😐 Neutral', '🙂 Happy', '😄 Very Happy'][moodInput]}
              </p>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block', fontSize:12, color:'#666', marginBottom:8}}>How do you feel?</label>
              <select 
                value={moodFeeling}
                onChange={(e) => setMoodFeeling(e.target.value)}
                style={{width:'100%', padding:'8px', borderRadius:4, border:'1px solid #ddd', fontSize:12}}
              >
                <option value="neutral">Neutral</option>
                <option value="energized">Energized</option>
                <option value="relaxed">Relaxed</option>
                <option value="calm">Calm</option>
                <option value="anxious">Anxious</option>
                <option value="stressed">Stressed</option>
                <option value="tired">Tired</option>
              </select>
            </div>

            <div style={{display:'flex', gap:10}}>
              <button 
                onClick={() => setShowMoodModal(false)}
                style={{flex:1, padding:'10px', background:'#eee', border:'none', borderRadius:4, cursor:'pointer', fontSize:12}}
              >
                Skip
              </button>
              <button 
                onClick={saveMoodAfterDay}
                style={{flex:1, padding:'10px', background:'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontSize:12, fontWeight:600}}
              >
                Save Mood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
