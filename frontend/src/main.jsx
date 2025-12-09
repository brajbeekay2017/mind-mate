import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import LoginPage from './components/LoginPage'
import './styles.css'

function RootComponent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('mindmate_token')
    if (token) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = () => {
    // User data with userId is already stored in login.jsx
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('mindmate_token')
    localStorage.removeItem('mindmate_user')
    localStorage.removeItem('mindmate_entries')
    setIsAuthenticated(false)
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#666' }}>Loading...</div>
  }

  return isAuthenticated ? <App onLogout={handleLogout} /> : <LoginPage onLogin={handleLogin} />
}

createRoot(document.getElementById('root')).render(<RootComponent />)
