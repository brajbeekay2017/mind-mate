import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function SummaryPanel({ summary, entries = [], loading = false, stats = {} }){

  if (loading) {
    return (
      <div style={{padding:12,display:'flex',alignItems:'center',justifyContent:'center',color:'#666'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:18,height:18,border:'3px solid #e0e0e0',borderTop:'3px solid #6FA8F1',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
          <div style={{fontSize:13}}>Generating AI summary...</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  
  // If entries are empty, show empty state
  if(entries.length === 0) {
    return (
      <div style={{padding:12,color:'#888',fontSize:'14px',textAlign:'center',fontStyle:'italic'}}>
        📝 No data yet. Log a mood entry to get started!
      </div>
    );
  }

  // Calculate stats from entries if not provided
  let displayStats = stats;
  if (!stats || !stats.entriesCount) {
    const moodScores = entries.map(e => e.mood);
    const stressLevels = entries.map(e => e.stress);
    displayStats = {
      entriesCount: entries.length,
      avgMood: (moodScores.reduce((a, b) => a + b, 0) / moodScores.length).toFixed(2),
      avgStress: (stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length).toFixed(2),
      maxStress: Math.max(...stressLevels),
      minMood: Math.min(...moodScores),
      maxMood: Math.max(...moodScores)
    };
  }
  
  // ✅ Custom markdown components for summary
  const markdownComponents = {
    ul: ({children}) => (
      <ul style={{margin: '8px 0', paddingLeft: '20px', color: '#2C3E50'}}>
        {children}
      </ul>
    ),
    li: ({children}) => (
      <li style={{margin: '4px 0', lineHeight: '1.5', color: '#2C3E50', fontSize: '13px'}}>
        {children}
      </li>
    ),
    ol: ({children}) => (
      <ol style={{margin: '8px 0', paddingLeft: '20px', color: '#2C3E50'}}>
        {children}
      </ol>
    ),
    table: ({children}) => (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        margin: '8px 0',
        fontSize: '12px',
        border: '1px solid rgba(111, 168, 241, 0.2)'
      }}>
        {children}
      </table>
    ),
    thead: ({children}) => (
      <thead style={{background: 'rgba(111, 168, 241, 0.1)', color: '#0F4761'}}>
        {children}
      </thead>
    ),
    th: ({children}) => (
      <th style={{padding: '8px', textAlign: 'left', fontWeight: '700', borderRight: '1px solid rgba(111, 168, 241, 0.1)', color: '#0F4761', fontSize: '12px'}}>
        {children}
      </th>
    ),
    tr: ({children}) => (
      <tr style={{borderBottom: '1px solid rgba(111, 168, 241, 0.1)'}}>
        {children}
      </tr>
    ),
    td: ({children}) => (
      <td style={{padding: '8px', borderRight: '1px solid rgba(111, 168, 241, 0.1)', color: '#2C3E50', fontSize: '12px', lineHeight: '1.5'}}>
        {children}
      </td>
    ),
    p: ({children}) => (
      <p style={{margin: '8px 0', lineHeight: '1.6', color: '#2C3E50', fontSize: '13px'}}>
        {children}
      </p>
    ),
    h2: ({children}) => (
      <h2 style={{margin: '12px 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#0F4761', borderBottom: '2px solid rgba(111, 168, 241, 0.2)', paddingBottom: '4px'}}>
        {children}
      </h2>
    ),
    h3: ({children}) => (
      <h3 style={{margin: '10px 0 4px 0', fontSize: '13px', fontWeight: '700', color: '#0F4761'}}>
        {children}
      </h3>
    ),
    strong: ({children}) => (
      <strong style={{fontWeight: '700', color: '#0F4761'}}>
        {children}
      </strong>
    ),
    em: ({children}) => (
      <em style={{fontStyle: 'italic', color: '#555'}}>
        {children}
      </em>
    ),
  };

  return (
    <div style={{
      padding: '16px',
      fontSize: '13px',
      lineHeight: '1.6',
      color: '#2C3E50',
      height: '100%',
      overflow: 'auto'
    }}>
      {/* Quick Stats Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(111, 168, 241, 0.1) 0%, rgba(79, 209, 197, 0.1) 100%)',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        border: '1px solid rgba(111, 168, 241, 0.2)'
      }}>
        <h4 style={{margin: '0 0 8px 0', fontSize: '12px', fontWeight: '700', color: '#0F4761'}}>📊 Your Stats</h4>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px'}}>
          <div>
            <span style={{color: '#666'}}>Avg Mood:</span> <span style={{fontWeight: '700', color: '#0F4761'}}>{displayStats.avgMood || '—'}/4</span>
          </div>
          <div>
            <span style={{color: '#666'}}>Avg Stress:</span> <span style={{fontWeight: '700', color: '#0F4761'}}>{displayStats.avgStress || '—'}/5</span>
          </div>
          <div>
            <span style={{color: '#666'}}>Mood Range:</span> <span style={{fontWeight: '700', color: '#0F4761'}}>{displayStats.minMood || '—'}-{displayStats.maxMood || '—'}</span>
          </div>
          <div>
            <span style={{color: '#666'}}>Peak Stress:</span> <span style={{fontWeight: '700', color: '#e74c3c'}}>{displayStats.maxStress || '—'}/5</span>
          </div>
          <div style={{gridColumn: '1 / -1'}}>
            <span style={{color: '#666'}}>Entries Logged:</span> <span style={{fontWeight: '700', color: '#0F4761'}}>{displayStats.entriesCount || entries.length}</span>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {summary ? (
        <div>
          <h4 style={{margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: '#0F4761'}}>🤖 AI Wellness Insights</h4>
          <div style={{
            background: '#fff',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(111, 168, 241, 0.15)',
            lineHeight: '1.7'
          }}>
            <ReactMarkdown components={markdownComponents}>
              {summary}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '16px',
          background: '#f9f9f9',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#999',
          fontSize: '12px'
        }}>
          💭 AI summary is being generated...
        </div>
      )}
    </div>
  );
}
