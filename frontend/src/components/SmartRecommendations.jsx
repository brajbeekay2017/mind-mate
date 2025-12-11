import React, { useState, useEffect } from 'react';
import { API_URL } from '../config'

export default function SmartRecommendations({ userId = 'user-1', workContext: initialWorkContext = 'office', companyRole: initialCompanyRole = 'engineer' }){
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moodHistory, setMoodHistory] = useState([]);
  const [googleFitData, setGoogleFitData] = useState(null);
  const [expandedRec, setExpandedRec] = useState(null);
  const [workContext, setWorkContext] = useState(initialWorkContext);
  const [companyRole, setCompanyRole] = useState(initialCompanyRole);
  const [stressorText, setStressorText] = useState('');
  const [gfConnected, setGfConnected] = useState(!!localStorage.getItem('googlefit_token'));

  useEffect(()=>{
    const fetchMoodHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/mood?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          setMoodHistory(data.entries || []);
        }
      } catch (e) {
        console.error('Error fetching mood history:', e);
      }
    };

    const fetchGoogleFit = async () => {
        try {
          const token = localStorage.getItem('googlefit_token');
          if (!token) return;

          const [stepsRes, heartRes] = await Promise.all([
            fetch(`${API_URL}/google-fit/steps-today?accessToken=${encodeURIComponent(token)}`),
            fetch(`${API_URL}/google-fit/heart-points?accessToken=${encodeURIComponent(token)}&days=1`)
          ]);

          const gf = {};
          if (stepsRes.ok) {
            const s = await stepsRes.json();
            gf.steps = s?.data?.steps ?? 0;
          }
          if (heartRes.ok) {
            const h = await heartRes.json();
            gf.heartPoints = h?.data?.heartPoints ?? (h?.data?.heartMinutes || 0) ?? 0;
          }

          setGoogleFitData(gf);
          if (gf && (gf.steps || gf.heartPoints)) setGfConnected(true);
        } catch (e) {
          console.error('Error fetching Google Fit in recommendations:', e);
        }
    };

    const connectToGoogleFit = async () => {
      try {
        const response = await fetch(`${API_URL}/google-auth/auth-url`);
        if (!response.ok) throw new Error('Failed to get authorization URL');
        const { authUrl } = await response.json();
        
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(authUrl, 'googleFitAuth', `width=${width},height=${height},left=${left},top=${top}`);
      } catch (error) {
        console.error('Error connecting to Google Fit:', error);
      }
    };

    fetchMoodHistory();
    fetchGoogleFit();
  }, [userId]);

  // Auto-generate recommendations when data changes (debounced)
  useEffect(() => {
    // don't auto-generate until we have at least one mood entry or some googleFitData
    if ((!moodHistory || moodHistory.length === 0) && !googleFitData) {
      // still allow lightweight AI advice based on role/context and stressor notes
      const timerLite = setTimeout(() => {
        generate({ lightweight: true });
      }, 1200);
      return () => clearTimeout(timerLite);
    }
    const timer = setTimeout(() => {
      generate({ lightweight: false });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodHistory, googleFitData, workContext, companyRole]);

  async function generate(opts = {}){
    setLoading(true);
    try{
      const payload = {
        userId,
        moodHistory: moodHistory || [],
        googleFitData: googleFitData || {},
        workContext: workContext,
        companyRole: companyRole,
        stressor: stressorText,
        counselingTone: true
      };
      // allow lightweight requests that ask for brief guidance when data is sparse
      if (opts.lightweight) payload.mode = 'lightweight';
      const res = await fetch(`${API_URL}/recommendations/generate`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      // prefer structured object, but accept string replies
      if (data && typeof data === 'object') {
        // backend may return { summary, recommendations, analysis, generatedAt }
        setRecs(data);
      } else {
        setRecs({ summary: data, recommendations: [] });
      }
      setExpandedRec(null);
    }catch(e){
      console.error(e);
      setRecs({ recommendations: [{ title: 'Fallback', description: 'Try a short breathing practice.' }], summary: 'Fallback suggestions' });
    }
    setLoading(false);
  }

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()){
      case 'high': return { bg: '#ffe6e6', border: '#FF6B6B', text: '#FF6B6B' };
      case 'medium': return { bg: '#fff0e6', border: '#FFA07A', text: '#FFA07A' };
      case 'low': return { bg: '#e6f7ff', border: '#4FD1C5', text: '#4FD1C5' };
      default: return { bg: '#f5f5f5', border: '#999', text: '#999' };
    }
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      'Quick Wins': '⚡',
      'Movement': '🏃',
      'Mindfulness': '🧘',
      'Social Connection': '👥',
      'Self-Care': '🛀',
      'Creative': '🎨'
    };
    return emojis[category] || '💡';
  };

  return (
    <div style={{padding:16}}>
      <h3>Counselling Panel — Recommendations for Software Employees</h3>

      {!gfConnected && (
        <div style={{marginTop:8,marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff8f0',border:'1px solid #ffd6a5',padding:10,borderRadius:8}}>
          <div style={{display:'flex',flexDirection:'column'}}>
            <div style={{fontSize:13,fontWeight:600,color:'#8a5a00'}}>Connect Google Fit for richer recommendations</div>
            <div style={{fontSize:12,color:'#7a6248',marginTop:4}}>Steps & Heart Points improve personalization — connect to see activity-based suggestions.</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button onClick={connectToGoogleFit} style={{padding:'8px 10px',borderRadius:6,background:'#4FD1C5',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>Connect Google Fit</button>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8,marginBottom:12}}>
        <div>
          <label style={{fontSize:12,color:'#666'}}>Role</label>
          <select value={companyRole} onChange={e=>setCompanyRole(e.target.value)} style={{width:'100%',padding:8,borderRadius:6,marginTop:6}}>
            <option value="engineer">Engineer</option>
            <option value="manager">Manager</option>
            <option value="designer">Designer</option>
            <option value="qa">QA</option>
            <option value="product">Product</option>
          </select>
        </div>
        <div>
          <label style={{fontSize:12,color:'#666'}}>Work Context</label>
          <select value={workContext} onChange={e=>setWorkContext(e.target.value)} style={{width:'100%',padding:8,borderRadius:6,marginTop:6}}>
            <option value="office">Office</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <label style={{fontSize:12,color:'#666'}}>Current stressors / notes (optional)</label>
        <input value={stressorText} onChange={e=>setStressorText(e.target.value)} placeholder="e.g. tight deadlines, team conflict, on-call" style={{width:'100%',padding:8,borderRadius:6,marginTop:6}} />
      </div>

      <div style={{marginBottom:12, fontSize:'13px', color:'#666', display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{flex:1}}>
          <p>AI-driven counselling suggestions that combine mood trends, stress patterns, and activity signals.</p>
          <div style={{display:'flex',gap:12,alignItems:'center',fontSize:13}}>
            <div>📊 <strong>{moodHistory.length}</strong> mood entries</div>
            <div>📈 <strong>{googleFitData?.steps ?? 0}</strong> steps</div>
            <div>❤️ <strong>{googleFitData?.heartPoints ?? 0}</strong> HP</div>
          </div>
        </div>
        <div style={{marginLeft:12,display:'flex',alignItems:'center',gap:8}}>
          <div style={{background:'#eef6ff',color:'#0F4761',padding:'6px 8px',borderRadius:6,fontSize:12,fontWeight:600}}>AI</div>
          <div style={{fontSize:12,color:'#999'}}>Live</div>
        </div>
      </div>

      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
        <button onClick={generate} disabled={loading} style={{padding:'8px 12px',borderRadius:8, background: loading ? '#ccc' : 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)', color:'#fff', border:'none', cursor: loading ? 'not-allowed' : 'pointer'}}>{loading ? 'Analyzing your data...' : 'Refresh Recommendations'}</button>
        <div style={{fontSize:12,color:'#999'}}>Last updated: {recs && recs.generatedAt ? new Date(recs.generatedAt).toLocaleString() : '—'}</div>
      </div>

      {recs && (
        <div style={{marginTop:16}}>
          {recs.summary && (
            <div style={{background:'#f0f8ff', padding:12, borderRadius:8, marginBottom:12, fontSize:13, color:'#0066cc', fontStyle:'italic'}}>
              "{recs.summary}"
            </div>
          )}

          {recs.analysis && (
            <div style={{background:'#fff7e6', padding:12, borderRadius:8, marginBottom:12, fontSize:13, color:'#8a5700'}}>
              <strong style={{display:'block',marginBottom:6}}>AI Analysis</strong>
              <div style={{fontSize:13,color:'#6b4f00'}}>{recs.analysis}</div>
            </div>
          )}

          <div style={{display:'grid', gridTemplateColumns:'1fr', gap:12}}>
            {(recs.recommendations || []).map((rec, i) => {
              const colors = getPriorityColor(rec.priority);
              const isExpanded = expandedRec === i;
              return (
                <div key={i} style={{
                  background:'#fff',
                  border: `2px solid ${colors.border}`,
                  borderRadius:8,
                  overflow:'hidden',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  <button
                    onClick={() => setExpandedRec(isExpanded ? null : i)}
                    style={{
                      width:'100%',
                      padding:12,
                      background: colors.bg,
                      border:'none',
                      textAlign:'left',
                      cursor:'pointer',
                      display:'flex',
                      justifyContent:'space-between',
                      alignItems:'center'
                    }}
                  >
                    <div style={{flex:1}}>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{fontSize:18}}>{getCategoryEmoji(rec.category)}</span>
                        <div>
                          <div style={{fontWeight:600, fontSize:14, color:colors.text}}>
                            {rec.title}
                          </div>
                          {rec.category && (
                            <div style={{fontSize:11, color:'#666', marginTop:2}}>
                              {rec.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      {rec.priority && (
                        <span style={{fontSize:11, padding:'2px 6px', background:colors.text, color:'#fff', borderRadius:3, textTransform:'uppercase'}}>
                          {rec.priority}
                        </span>
                      )}
                      <span style={{fontSize:14}}>{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{padding:12, borderTop: `2px solid ${colors.border}`, background:'#fafafa'}}>
                      <p style={{fontSize:13, color:'#555', margin:'0 0 8px 0'}}>{rec.description}</p>

                      {rec.technique && (
                        <div style={{margin:'8px 0'}}>
                          <strong style={{fontSize:12, color:'#333'}}>How:</strong>
                          <p style={{fontSize:12, color:'#666', margin:'4px 0'}}>{rec.technique}</p>
                        </div>
                      )}

                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, margin:'8px 0'}}>
                        {rec.duration && (
                          <div style={{fontSize:11, color:'#666'}}>
                            <strong>⏱ Duration:</strong> {rec.duration}
                          </div>
                        )}
                        {rec.timeOfDay && (
                          <div style={{fontSize:11, color:'#666'}}>
                            <strong>🕐 When:</strong> {rec.timeOfDay}
                          </div>
                        )}
                        {rec.effort && (
                          <div style={{fontSize:11, color:'#666'}}>
                            <strong>💪 Effort:</strong> {rec.effort}
                          </div>
                        )}
                        {rec.expectedBenefit && (
                          <div style={{fontSize:11, color:'#4FD1C5'}}>
                            <strong>✅ Expected:</strong> {rec.expectedBenefit}
                          </div>
                        )}
                      </div>

                      {rec.when && (
                        <div style={{background:'#fff8e1', padding:8, borderRadius:4, margin:'8px 0', fontSize:11, color:'#666'}}>
                          <strong>Best used:</strong> {rec.when}
                        </div>
                      )}

                      {rec.alternatives && (
                        <div style={{background:'#f0f8ff', padding:8, borderRadius:4, margin:'8px 0', fontSize:11, color:'#0066cc'}}>
                          <strong>💡 Alternatives:</strong> {rec.alternatives}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {recs.nextSteps && recs.nextSteps.length > 0 && (
            <div style={{background:'#e8f5e9', padding:12, borderRadius:8, marginTop:12, borderLeft:'4px solid #4CAF50'}}>
              <strong style={{fontSize:12, display:'block', marginBottom:6}}>📋 Next Steps:</strong>
              <ol style={{fontSize:11, color:'#666', margin:0, paddingLeft:20}}>
                {recs.nextSteps.map((step, i) => (
                  <li key={i} style={{margin:'4px 0'}}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {!recs && (
        <div style={{color:'#666', marginTop:12}}>No recommendations yet. Recommendations are generated automatically after new mood or activity data is available, or click "Refresh Recommendations" to force an update.</div>
      )}
    </div>
  );
}
