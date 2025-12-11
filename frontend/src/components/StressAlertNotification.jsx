import React, { useEffect, useState } from 'react'
import { API_URL } from '../config'

export default function StressAlertNotification({ userId, refreshKey }) {
  const [stressData, setStressData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [googleFitData, setGoogleFitData] = useState(null)

  useEffect(() => {
    if (!userId) return

    async function fetchStressLevel() {
      try {
        setLoading(true)
        const gfData = JSON.parse(localStorage.getItem('googlefit_latest') || '{}')
        setGoogleFitData(gfData)
        const res = await fetch(`${API_URL}/alerts/stress-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, googleFitData: gfData })
        })
        if (res.ok) {
          const data = await res.json()
          setStressData(data)
        }
      } catch (e) {
        console.warn('Failed to fetch stress level:', e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStressLevel()
  }, [userId, refreshKey])

  if (!stressData) return null

  const getLevelColor = (level) => {
    switch (level) {
      case 'very_high':
        return '#c41e3a'
      case 'high':
        return '#ff6b35'
      case 'moderate':
        return '#ffa500'
      default:
        return '#4caf50'
    }
  }

  const getLevelLabel = (level) => {
    switch (level) {
      case 'very_high':
        return 'Critical'
      case 'high':
        return 'High'
      case 'moderate':
        return 'Moderate'
      default:
        return 'Low'
    }
  }

  // Determine animation intensity based on stress level
  const getAnimationStyle = (level) => {
    switch (level) {
      case 'very_high':
        return 'intense-pulse 0.8s ease-in-out infinite'
      case 'high':
        return 'strong-pulse 1.2s ease-in-out infinite'
      case 'moderate':
        return 'gentle-pulse 1.8s ease-in-out infinite'
      default:
        return 'subtle-pulse 2.5s ease-in-out infinite'
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Outer glow ring (animated) */}
      <div
        style={{
          position: 'absolute',
          top: '-6px',
          left: '-6px',
          right: '-6px',
          bottom: '-6px',
          borderRadius: '50%',
          border: `2px solid ${getLevelColor(stressData.level)}`,
          opacity: 0.3,
          animation: getAnimationStyle(stressData.level),
          pointerEvents: 'none'
        }}
      />

      {/* Main circle button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: getLevelColor(stressData.level),
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: `0 0 16px ${getLevelColor(stressData.level)}60, inset 0 0 8px ${getLevelColor(stressData.level)}40`,
          position: 'relative',
          zIndex: 10
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={getLevelLabel(stressData.level)}
      />

      {/* Detailed Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 8,
            background: '#fff',
            border: `2px solid ${getLevelColor(stressData.level)}`,
            borderRadius: 10,
            padding: 14,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            zIndex: 1000,
            minWidth: 280,
            fontSize: 12,
            color: '#333',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: getLevelColor(stressData.level) }}>
            📊 Stress Analysis
          </div>

          {/* Stress Level & Score */}
          <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Level:</span>
              <span style={{ fontWeight: 600, color: getLevelColor(stressData.level) }}>
                {getLevelLabel(stressData.level)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Score:</span>
              <span style={{ fontWeight: 600 }}>{stressData.score || 0}/100</span>
            </div>
          </div>

          {/* Mood Stats */}
          <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11 }}>😊 Mood:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Avg:</span>
              <span>{stressData.avgMood?.toFixed(2) || 0}/4</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Stress Avg:</span>
              <span>{stressData.avgStress?.toFixed(2) || 0}/5</span>
            </div>
          </div>

          {/* Google Fit Data - Dynamic */}
          {googleFitData && Object.keys(googleFitData).length > 0 && (
            <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11 }}>🏃 Google Fit:</div>
              {(() => {
                const metricsMap = {
                  'stepsToday': { emoji: '🚶', label: 'Steps', format: (v) => v },
                  'steps': { emoji: '🚶', label: 'Steps', format: (v) => v },
                  'heartPoints': { emoji: '❤️', label: 'Heart Points', format: (v) => v },
                  'heartMinutes': { emoji: '💪', label: 'Heart Minutes', format: (v) => v },
                  'totalHeartMinutes': { emoji: '💪', label: 'Total Heart Minutes', format: (v) => v },
                  'restingHeartRate': { emoji: '💓', label: 'Resting HR', format: (v) => `${Math.round(v)} bpm` },
                  'avgHeartRate': { emoji: '📈', label: 'Avg HR', format: (v) => `${Math.round(v)} bpm` },
                  'sleepHours': { emoji: '😴', label: 'Sleep', format: (v) => `${v}h` },
                  'sleepMinutes': { emoji: '😴', label: 'Sleep', format: (v) => `${Math.round(v / 60)}h` },
                  'timestamp': { skip: true }
                }

                const displayedKeys = new Set()
                return Object.entries(googleFitData)
                  .filter(([key, val]) => {
                    const meta = metricsMap[key]
                    if (meta?.skip) return false
                    if (val === null || val === undefined || val === '') return false
                    return true
                  })
                  .map(([key, val]) => {
                    const meta = metricsMap[key]
                    if (meta && meta.label) {
                      // Skip duplicate metrics (stepsToday vs steps)
                      if (displayedKeys.has(meta.label)) return null
                      displayedKeys.add(meta.label)
                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>{meta.emoji} {meta.label}:</span>
                          <span>{meta.format(val)}</span>
                        </div>
                      )
                    }
                    // For unknown fields, display dynamically
                    const displayVal = typeof val === 'number' ? (Math.round(val * 100) / 100) : val
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>📊 {key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span>{displayVal}</span>
                      </div>
                    )
                  })
                  .filter(Boolean)
              })()}
            </div>
          )}

          {/* Reasons */}
          {stressData.reasons && stressData.reasons.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11 }}>⚠️ Factors:</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                {stressData.reasons.map((reason, idx) => (
                  <li key={idx} style={{ marginBottom: 3, color: '#555' }}>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style>{`
        /* Subtle animation for Low stress */
        @keyframes subtle-pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.3;
          }
          50% { 
            transform: scale(1.1);
            opacity: 0.6;
          }
        }

        /* Gentle animation for Moderate stress */
        @keyframes gentle-pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.4;
          }
          50% { 
            transform: scale(1.15);
            opacity: 0.7;
          }
        }

        /* Strong animation for High stress */
        @keyframes strong-pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.5;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.85;
          }
        }

        /* Intense animation for Very High/Critical stress */
        @keyframes intense-pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.6;
          }
          50% { 
            transform: scale(1.3);
            opacity: 1;
          }
        }

        /* Tooltip slide-in animation */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
