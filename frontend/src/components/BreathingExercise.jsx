import React, { useState, useEffect } from 'react'
import '../styles.css'

export default function BreathingExercise(){
  const [phase, setPhase] = useState('inhale'); // 'inhale', 'hold', 'exhale'
  const [count, setCount] = useState(1);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        let nextCount = prev + 1;
        let nextPhase = phase;

        if (phase === 'inhale' && nextCount > 5) {
          nextCount = 1;
          nextPhase = 'hold';
        } else if (phase === 'hold' && nextCount > 4) {
          nextCount = 1;
          nextPhase = 'exhale';
        } else if (phase === 'exhale' && nextCount > 5) {
          nextCount = 1;
          nextPhase = 'inhale';
        }

        setPhase(nextPhase);
        return nextCount;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // Calculate scale based on phase and count
  useEffect(() => {
    if (phase === 'inhale') {
      // Growing: 0.5 to 1.0
      setScale(0.5 + (count / 5) * 0.5);
    } else if (phase === 'hold') {
      // Holding at max
      setScale(1.0);
    } else if (phase === 'exhale') {
      // Shrinking: 1.0 to 0.5
      setScale(1.0 - (count / 5) * 0.5);
    }
  }, [phase, count]);

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return '#4CAF50'; // Green
      case 'hold': return '#FFC107'; // Yellow
      case 'exhale': return '#FF5252'; // Red
      default: return '#6FA8F1';
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'inhale': return 'Breathe in...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe out...';
      default: return 'Breathe';
    }
  };

  const getMaxCount = () => {
    return phase === 'hold' ? 4 : 5;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 0',
      width: '100%',
      paddingLeft: '5%'
    }}>
      <div 
        className="breathing-circle"
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: getPhaseColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${scale})`,
          transition: 'transform 1s linear',
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#fff',
          boxShadow: `0 8px 24px ${getPhaseColor()}40`,
          position: 'relative'
        }}
      >
        <span style={{fontSize:'36px', fontWeight:'700'}}>{count}</span>
      </div>

      <p style={{
        maxWidth: 420,
        textAlign: 'center',
        color: getPhaseColor(),
        margin: '16px 0 0 0',
        fontSize: '16px',
        fontWeight: '600',
        letterSpacing: '0.5px',
        transition: 'color 0.3s ease'
      }}>
        {getPhaseLabel()}
      </p>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '12px',
        justifyContent: 'center'
      }}>
        {[...Array(getMaxCount())].map((_, i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: i < count ? getPhaseColor() : '#e0e0e0',
              transition: 'background 0.3s ease',
              opacity: i < count ? 1 : 0.4
            }}
          />
        ))}
      </div>

      <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: '#999',
        textAlign: 'center',
        // ✅ FIXED: Prevent text wrapping
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontStyle: 'italic',
        lineHeight: '1.5',
        letterSpacing: '0.3px',
        padding: '0 12px'
      }}>
        Follow the expanding and contracting circle. This 5-4-5 breathing technique helps calm your nervous system.
      </div>
    </div>
  )
}
