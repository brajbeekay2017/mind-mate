import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function SummaryPanel({ summary, entries = [] }){
  // If entries are empty, show empty state
  if(entries.length === 0) {
    return (
      <div style={{padding:12,color:'#888',fontSize:'14px',textAlign:'center',fontStyle:'italic'}}>
        No data yet. Log a mood entry to get started!
      </div>
    );
  }

  // If no summary has been generated, show default stats based on entries
  if(!summary && entries.length > 0) {
    const moodScores = entries.map(e => e.mood);
    const stressLevels = entries.map(e => e.stress);
    const avgMood = (moodScores.reduce((a, b) => a + b, 0) / moodScores.length).toFixed(1);
    const avgStress = (stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length).toFixed(1);
    const maxStress = Math.max(...stressLevels);
    
    return (
      <div style={{padding:12,color:'#586069'}}>
        <p style={{fontSize:'13px',fontStyle:'italic',color:'#888',marginBottom:8}}>Click "Generate Summary" for AI insights, or see quick stats below:</p>
        <div style={{background:'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',padding:10,borderRadius:8,margin:'8px 0'}}>
          <p style={{margin:'6px 0',fontSize:'13px'}}><strong>Average Mood:</strong> {avgMood}/5</p>
          <p style={{margin:'6px 0',fontSize:'13px'}}><strong>Average Stress:</strong> {avgStress}/5</p>
          <p style={{margin:'6px 0',fontSize:'13px'}}><strong>Peak Stress:</strong> {maxStress}/5</p>
          <p style={{margin:'6px 0',fontSize:'13px'}}><strong>Entries Logged:</strong> {entries.length}</p>
        </div>
      </div>
    );
  }
  
  // ✅ Custom markdown components for summary
  const markdownComponents = {
    ul: ({children}) => (
      <ul style={{margin: '6px 0', paddingLeft: '18px', color: '#2C3E50'}}>
        {children}
      </ul>
    ),
    li: ({children}) => (
      <li style={{margin: '3px 0', lineHeight: '1.5', color: '#2C3E50', fontSize: '13px'}}>
        {children}
      </li>
    ),
    ol: ({children}) => (
      <ol style={{margin: '6px 0', paddingLeft: '18px', color: '#2C3E50'}}>
        {children}
      </ol>
    ),
    table: ({children}) => (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        margin: '6px 0',
        fontSize: '11px',
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
      <th style={{padding: '6px 8px', textAlign: 'left', fontWeight: '600', borderRight: '1px solid rgba(111, 168, 241, 0.1)', color: '#0F4761', fontSize: '12px'}}>
        {children}
      </th>
    ),
    tr: ({children}) => (
      <tr style={{borderBottom: '1px solid rgba(111, 168, 241, 0.1)'}}>
        {children}
      </tr>
    ),
    td: ({children}) => (
      <td style={{padding: '6px 8px', borderRight: '1px solid rgba(111, 168, 241, 0.1)', color: '#2C3E50', fontSize: '11px', lineHeight: '1.4'}}>
        {children}
      </td>
    ),
    p: ({children}) => (
      <p style={{margin: '4px 0', lineHeight: '1.5', color: '#2C3E50', fontSize: '13px'}}>
        {children}
      </p>
    ),
    h3: ({children}) => (
      <h3 style={{margin: '6px 0 4px 0', fontSize: '12px', fontWeight: '600', color: '#0F4761'}}>
        {children}
      </h3>
    ),
    strong: ({children}) => (
      <strong style={{fontWeight: '600', color: '#0F4761'}}>
        {children}
      </strong>
    ),
  };

  // ✅ Check if summary is a string (from Groq API)
  if(summary && typeof summary === 'string') {
    return (
      <div style={{
        padding: 12,
        fontSize: '13px',
        lineHeight: '1.6',
        color: '#2C3E50',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word'
      }}>
        <ReactMarkdown components={markdownComponents}>
          {summary}
        </ReactMarkdown>
      </div>
    );
  }
  
  // ✅ Fallback: Parse structured summary (old format)
  if(summary && typeof summary === 'object') {
    return (
      <div style={{padding:12,fontSize:'13px',lineHeight:'1.8'}}>
        <div style={{marginBottom:12}}>
          <h5 style={{margin:'0 0 4px 0',color:'#0F4761'}}>Overview</h5>
          <p style={{margin:'0',color:'#586069'}}>{summary.overview}</p>
        </div>
        <div style={{marginBottom:12}}>
          <h5 style={{margin:'0 0 4px 0',color:'#0F4761'}}>Trends</h5>
          <p style={{margin:'0',color:'#586069'}}>{summary.trends}</p>
        </div>
        <div style={{marginBottom:12}}>
          <h5 style={{margin:'0 0 4px 0',color:'#0F4761'}}>Suggestions</h5>
          <p style={{margin:'0',color:'#586069'}}>{summary.suggestions}</p>
        </div>
        <div>
          <h5 style={{margin:'0 0 4px 0',color:'#0F4761'}}>Resources</h5>
          <p style={{margin:'0',color:'#586069'}}>{summary.resources}</p>
        </div>
      </div>
    );
  }
  
  return <div style={{padding:12,color:'#888'}}>No summary data.</div>;
}
