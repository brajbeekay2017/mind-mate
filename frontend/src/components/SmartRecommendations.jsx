import React, { useState, useEffect } from 'react';

export default function SmartRecommendations({ userId = 'user-1', workContext = 'office', companyRole = 'general' }){
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moodHistory, setMoodHistory] = useState([]);
  const [googleFitData, setGoogleFitData] = useState(null);
  const [expandedRec, setExpandedRec] = useState(null);

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

    const fetchGoogleFit = async () => {
      try {
        const res = await fetch(`http://localhost:4000/google-fit/latest?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          setGoogleFitData(data);
        }
      } catch (e) {
        // Silently handle
      }
    };

    fetchMoodHistory();
    fetchGoogleFit();
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
      const res = await fetch('http://localhost:4000/recommendations/generate', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setRecs(data.recommendations || data);
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
      <h3>Smart Wellness Recommendations (AI-Generated)</h3>
      <div style={{marginBottom:12, fontSize:'13px', color:'#666'}}>
        <p>Personalized recommendations based on your mood trends, stress patterns, and activity data</p>
        {moodHistory.length > 0 && (
          <p><strong>📊 Mood data:</strong> {moodHistory.length} entries analyzed</p>
        )}
        {googleFitData && (
          <p><strong>📈 Activity data:</strong> {googleFitData.steps || 0} steps, {googleFitData.sleep || 0}h sleep</p>
        )}
      </div>
      <button onClick={generate} disabled={loading} style={{padding:'8px 12px',borderRadius:8, background: loading ? '#ccc' : 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)', color:'#fff', border:'none', cursor: loading ? 'not-allowed' : 'pointer'}}>{loading ? 'Analyzing your data...' : 'Generate Recommendations'}</button>

      {recs && (
        <div style={{marginTop:16}}>
          {recs.summary && (
            <div style={{background:'#f0f8ff', padding:12, borderRadius:8, marginBottom:12, fontSize:13, color:'#0066cc', fontStyle:'italic'}}>
              "{recs.summary}"
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
        <div style={{color:'#666', marginTop:12}}>No recommendations yet. Click "Generate Recommendations" to get personalized suggestions based on your data.</div>
      )}
    </div>
  );
}
