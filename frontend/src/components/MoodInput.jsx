import React, { useState } from 'react';

const EMOJIS = ["😄","🙂","😐","😟","😢"];
const STRESS_LABELS = ["Relaxed 😄", "Calm 🙂", "Neutral 😐", "Concerned 😟", "Stressed 😰", "Very Stressed 😰"];

export default function MoodInput({ onSaved }){
  const [moodIdx, setMoodIdx] = useState(2);
  const [stress, setStress] = useState(2);
  const [saving, setSaving] = useState(false);

  async function submit(){
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('mindmate_user') || '{}');
      const userId = user.userId;
      
      const res = await fetch(`http://localhost:4000/mood?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: moodIdx, stress: parseInt(stress), userId })
      });
      const data = await res.json();
      if (onSaved) onSaved(data.entries);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  const handleStressChange = (value) => {
    const numValue = Number(value);
    setStress(numValue);
    setMoodIdx(numValue);
  }

  return (
    <div style={{padding:12}}>
      <div style={{marginBottom:8}}><label id="mood-label">How are you feeling?</label></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:4,marginBottom:12}} role="radiogroup" aria-labelledby="mood-label">
        {EMOJIS.map((em,i)=> (
          <button key={i} onClick={()=>{ setMoodIdx(i); setStress(i); }} aria-pressed={i===moodIdx} aria-label={`Mood ${i+1}`} style={{fontSize:18,padding:8,aspect:'1',background: i===moodIdx? '#6FA8F1' : '#fff', border:'2px solid #ddd',borderRadius:6,cursor:'pointer',borderColor: i===moodIdx? '#6FA8F1' : '#ddd'}}>{em}</button>
        ))}
      </div>
      <div style={{marginBottom:12}}>
        <label htmlFor="stress-range" style={{display:'block',marginBottom:6}}>Stress Level: <strong>{STRESS_LABELS[stress]}</strong></label>
        <input id="stress-range" aria-label="Stress level" type="range" min="0" max="4" value={stress} onChange={e=>handleStressChange(e.target.value)} style={{width:'100%'}} />
      </div>
      <button onClick={submit} disabled={saving} aria-disabled={saving} style={{width:'100%',padding:'10px 12px',borderRadius:6,background:'#6FA8F1',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>Save</button>
    </div>
  )
}
