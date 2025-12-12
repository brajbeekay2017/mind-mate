import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import LoginPage from './components/LoginPage'
import ErrorBoundary from './components/ErrorBoundary'
import './styles.css'

function RootComponent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🚀 [MAIN] RootComponent mounted');
    // Check if user is already logged in
    const token = localStorage.getItem('mindmate_token')
    const user = localStorage.getItem('mindmate_user')
    
    console.log('🔐 [MAIN] Token check:', token ? '✓ found' : '✗ missing');
    console.log('👤 [MAIN] User check:', user ? '✓ found' : '✗ missing');
    
    if (token && user) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = () => {
    console.log('✅ [MAIN] User logged in');
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    console.log('🚪 [MAIN] User logging out');
    localStorage.removeItem('mindmate_token')
    localStorage.removeItem('mindmate_user')
    localStorage.removeItem('mindmate_entries')
    localStorage.removeItem('googlefit_token')
    localStorage.removeItem('googlefit_latest')
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)'
      }}>
        ⏳ Loading Mind Mate...
      </div>
    )
  }

  return (
    <ErrorBoundary>
      {isAuthenticated ? (
        <App onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </ErrorBoundary>
  )
}

const root = createRoot(document.getElementById('root'))
console.log('🎯 [MAIN] Rendering RootComponent');
root.render(<RootComponent />)
