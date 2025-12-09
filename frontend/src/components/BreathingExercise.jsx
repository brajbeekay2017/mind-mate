import React from 'react'
import '../styles.css'

export default function BreathingExercise(){
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 0'}}>
      <div className="circle" style={{width:100,height:100,fontSize:'14px'}}>Breathe</div>
      <p style={{maxWidth:420,textAlign:'center',background:'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',margin:'12px 0 0 0',fontSize:'13px',fontWeight:'500',letterSpacing:'0.5px',fontStyle:'italic',animation:'glow-pulse 3s ease-in-out infinite'}}>Follow the circle as it expands and contracts.</p>
    </div>
  )
}
