import React, { useState } from 'react';

const EMOJIS = ["😄","🙂","😐","😟","😢"];
const STRESS_LABELS = ["Relaxed 😄", "Calm 🙂", "Neutral 😐", "Concerned 😟", "Stressed 😰", "Very Stressed 😰"];

export default function MoodInput({ onSaved }){
  const [moodIdx, setMoodIdx] = useState(2);
  const [stress, setStress] = useState(2);
  const [saving, setSaving] = useState(false);

  // Accent color based on stress level:
  // 0: Relaxed (dark green), 1: Calm (light green), 2: Neutral (blue), 3: Concerned (orange), 4+: Stressed (red)
  const getAccentColor = (s) => {
    const n = Number(s);
    if (n >= 4) return '#FF6B6B';    // Red for Stressed
    if (n === 3) return '#FFA07A';   // Orange for Concerned
    if (n === 1) return '#7ED957';   // Light green for Calm
    if (n === 0) return '#2E8B57';   // Dark green for Relaxed
    return '#6FA8F1';                // Neutral/Default blue
  };

  const accent = getAccentColor(stress);

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
          <button
            key={i}
            onClick={()=>{ setMoodIdx(i); setStress(i); }}
            aria-pressed={i===moodIdx}
            aria-label={`Mood ${i+1}`}
            style={{
              fontSize:18,
              padding:8,
              aspect:'1',
              background: i===moodIdx ? accent : '#fff',
              border:'2px solid #ddd',
              borderRadius:6,
              cursor:'pointer',
              borderColor: i===moodIdx ? accent : '#ddd',
              color: i===moodIdx ? '#fff' : 'inherit',
              transition: 'background 220ms ease, border-color 220ms ease, color 180ms ease'
            }}
          >
            {em}
          </button>
        ))}
      </div>
      <div style={{marginBottom:12}}>
        <label htmlFor="stress-range" style={{display:'block',marginBottom:6}}>Stress Level: <strong>{STRESS_LABELS[stress]}</strong></label>
        <input
          id="stress-range"
          aria-label="Stress level"
          type="range"
          min="0"
          max="4"
          value={stress}
          onChange={e=>handleStressChange(e.target.value)}
          style={{
            width:'100%',
            accentColor: accent,
            cursor:'pointer',
            height:'6px'
          }}
        />
        <style>{`
          #stress-range {
            appearance: none;
            -webkit-appearance: none;
            background: linear-gradient(to right, #2E8B57 0%, #7ED957 25%, #6FA8F1 50%, #FFA07A 75%, #FF6B6B 100%);
            outline: none;
            border-radius: 5px;
          }
          #stress-range::-webkit-slider-thumb {
            appearance: none;
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: ${accent};
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: background 220ms ease;
          }
          #stress-range::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: ${accent};
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: background 220ms ease;
          }
          #stress-range::-moz-range-track {
            background: transparent;
            border: none;
          }
        `}</style>
      </div>
      <button onClick={submit} disabled={saving} aria-disabled={saving} style={{width:'100%',padding:'10px 12px',borderRadius:6,background: saving ? '#ccc' : accent,color:'#fff',border:'none',cursor:'pointer',fontWeight:600,transition:'background 220ms ease'}}>{saving ? 'Saving...' : 'Save'}</button>
    </div>
  )
}
