import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';

export default function TeamAlertsPanel({ userId = 'user-1', teamId = 'team-1', isAdmin = false }){
  const [alerts, setAlerts] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(()=>{
    const es = new EventSource(`${API_URL}/team-alerts/stream?userId=${encodeURIComponent(userId)}&teamId=${encodeURIComponent(teamId)}&isAdmin=${isAdmin ? '1' : '0'}`);
    es.onmessage = (e) => {
      try{
        const payload = JSON.parse(e.data);
        setAlerts(prev => [payload, ...prev].slice(0,50));
      }catch(err){}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [userId, teamId, isAdmin]);

  async function postAlert(){
    if(!message.trim()) return;
    await fetch(`${API_URL}/team-alerts/alert`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ teamId, message, level: 'warning' })
    });
    setMessage('');
  }

  return (
    <div style={{padding:16}}>
      <h3>Team Alerts</h3>
      {isAdmin && (
        <div style={{marginBottom:12}}>
          <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Alert message" style={{padding:8,width:'60%'}} />
          <button onClick={postAlert} style={{marginLeft:8,padding:'8px 12px'}}>Send Alert</button>
        </div>
      )}

      <div style={{maxHeight:320,overflow:'auto',background:'#fff',padding:8,borderRadius:6}}>
        {alerts.map((a,i)=> (
          <div key={i} style={{padding:10,borderBottom:'1px solid #f0f0f0'}}>
            <div style={{fontSize:13,fontWeight:600}}>{a.message || a.type || a.channel}</div>
            <div style={{fontSize:12,color:'#666'}}>{a.teamId ? `team: ${a.teamId}` : ''} {a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
