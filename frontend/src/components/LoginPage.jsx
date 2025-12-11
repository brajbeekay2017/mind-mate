import React, { useState, useEffect } from 'react'
import '../styles.css'

export default function LoginPage({ onLogin }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Listen for Google OAuth messages from popup
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('📨 Message received from popup:', event.data);
      
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { userId, email, name, googleAccessToken } = event.data;
        console.log('✅ Google OAuth successful:', { userId, email, name, hasToken: !!googleAccessToken });
        
        // Store Google auth data
        localStorage.setItem('mindmate_user', JSON.stringify({ userId, email, name }));
        localStorage.setItem('mindmate_token', 'google_authenticated');
        localStorage.setItem('googlefit_token', googleAccessToken);
        console.log('✅ Token stored in localStorage, dispatching event...');
        
        // Notify GoogleFitPanel that token is available
        window.dispatchEvent(new CustomEvent('googlefit_token_added', { detail: { token: googleAccessToken } }));
        console.log('✅ Event dispatched, calling onLogin...');
        
        setError('');
        setLoading(false);
        onLogin(userId);
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        console.error('❌ Google OAuth error:', event.data.error);
        setError(`Authentication failed: ${event.data.error}`);
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);

      console.log('🔐 Fetching Google auth URL...');
      // Get auth URL from backend
      const res = await fetch('http://localhost:4000/google-auth/auth-url');
      const data = await res.json();

      if (!res.ok || !data.authUrl) {
        const errorMsg = data.error || data.details || 'Failed to get Google authentication URL';
        console.error('❌ Auth URL fetch failed:', errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      console.log('✅ Auth URL received, opening popup...');

      // Open Google OAuth in popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        'Google Login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Check if popup was blocked
      if (!popup || popup.closed) {
        console.error('❌ Popup was blocked');
        setError('Popup blocked. Please enable popups for this site.');
        setLoading(false);
        return;
      }

      console.log('✅ Popup opened, waiting for authentication...');

      // Monitor popup and wait for callback
      const popupCheckInterval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(popupCheckInterval);
            console.log('👋 Popup closed');
            setLoading(false);
            // Token should be in localStorage if successful
            // If not, error should have been set via message event
          }
        } catch (e) {
          console.error('Error monitoring popup:', e);
        }
      }, 500);
    } catch (err) {
      console.error('❌ Google login error:', err);
      setError('Google authentication failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{
        background: 'white',
        padding: '60px 40px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#667eea',
          marginBottom: '12px',
          fontSize: '32px',
          fontWeight: '700',
          letterSpacing: '-0.5px'
        }}>Mind Mate</h1>
        <p style={{
          textAlign: 'center',
          color: '#666',
          marginBottom: '40px',
          fontSize: '15px',
          lineHeight: '1.5'
        }}>Your Personal Mental Health Assistant</p>

        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '13px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: '#fff',
            border: '2px solid #ddd',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.3s ease',
            boxShadow: 'none',
            opacity: loading ? 0.6 : 1
          }}
          onMouseOver={(e) => !loading && (e.target.style.borderColor = '#667eea')}
          onMouseOut={(e) => (e.target.style.borderColor = '#ddd')}
        >
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='20' height='20'%3E%3Cg transform='matrix(1, 0, 0, 1, 27.009, -39.238)'%3E%3Cpath fill='%234285F4' d='M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z'/%3E%3Cpath fill='%2334A853' d='M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z'/%3E%3Cpath fill='%23FBBC05' d='M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z'/%3E%3Cpath fill='%23EA4335' d='M -14.754 43.989 C -13.504 43.989 -12.374 44.459 -11.514 45.299 L -7.734 41.519 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z'/%3E%3C/g%3E%3C/svg%3E"
            alt="Google"
            style={{ width: '20px', height: '20px' }}
          />
          {loading ? 'Connecting to Google...' : 'Sign in with Google'}
        </button>

        <p style={{
          textAlign: 'center',
          color: '#999',
          marginTop: '24px',
          fontSize: '12px',
          lineHeight: '1.6'
        }}>
          Sign in with your Google account to get started.<br />
          Your wellness data will be automatically connected to Google Fit.
        </p>

        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #eee',
          fontSize: '12px'
        }}>
          <a href="http://localhost:4000/privacy" target="_blank" rel="noopener noreferrer" style={{color: '#667eea', textDecoration: 'none', cursor: 'pointer'}}>
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  )
}
