import React, { useState, useEffect } from 'react'
import { API_URL } from '../config'
import mindMateLogo from '../../Images/MindMateFinal.png'
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
        
        console.log('✅ Triggering onLogin callback...');
        onLogin();
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        console.error('❌ OAuth error:', event.data.error);
        setError(`Authentication error: ${event.data.error}`);
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔐 Fetching Google OAuth URL...');
      const response = await fetch(`${API_URL}/google-auth/auth-url`);

      if (!response.ok) {
        throw new Error(`Failed to get auth URL: ${response.statusText}`);
      }

      const { authUrl } = await response.json();

      if (!authUrl) {
        throw new Error('No authorization URL received');
      }

      console.log('✅ Auth URL received, opening popup...');

      // Open Google OAuth in popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
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
      <style>{`
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes glow-pulse-login {
          0%, 100% {
            box-shadow: 0 0 20px rgba(111, 168, 241, 0.4), 
                        0 0 40px rgba(79, 209, 197, 0.2),
                        inset 0 0 20px rgba(111, 168, 241, 0.05);
          }
          50% {
            box-shadow: 0 0 30px rgba(111, 168, 241, 0.6), 
                        0 0 60px rgba(79, 209, 197, 0.3),
                        inset 0 0 30px rgba(111, 168, 241, 0.1);
          }
        }

        @keyframes logoScale {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .logo-container {
          animation: slideInDown 0.8s ease-out, float 4s ease-in-out infinite;
          animation-delay: 0s, 0.8s;
        }

        .logo-circle-login {
          animation: glow-pulse-login 3s ease-in-out infinite, logoScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .card-login {
          animation: slideInDown 0.8s ease-out 0.2s both;
        }

        .button-login {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .button-login:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4) !important;
        }

        .button-login:active:not(:disabled) {
          transform: scale(0.98);
        }
      `}</style>

      <div style={{
        background: 'white',
        padding: '60px 40px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center'
      }}>
        {/* ✅ NEW: Animated Logo Circle */}
        <div className="logo-container" style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <div className="logo-circle-login" style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
            border: '3px solid transparent',
            backgroundClip: 'padding-box',
            position: 'relative'
          }}>
            {/* ✅ Glow Background */}
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              right: '-8px',
              bottom: '-8px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6FA8F1, #4FD1C5, #6FA8F1)',
              backgroundSize: '200% 200%',
              opacity: 0.3,
              zIndex: -1,
              filter: 'blur(8px)'
            }} />
            
            {/* ✅ Logo Image */}
            <img 
              src={mindMateLogo} 
              alt="Mind Mate Logo" 
              style={{
                height: '110px',
                width: '110px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 8px rgba(111, 168, 241, 0.3))',
                transition: 'filter 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.filter = 'drop-shadow(0 8px 16px rgba(111, 168, 241, 0.5))'}
              onMouseOut={(e) => e.target.style.filter = 'drop-shadow(0 4px 8px rgba(111, 168, 241, 0.3))'}
            />
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          textAlign: 'center',
          color: '#667eea',
          marginBottom: '12px',
          fontSize: '32px',
          fontWeight: '700',
          letterSpacing: '-0.5px',
          animation: 'slideInDown 0.8s ease-out 0.3s both'
        }}>
          Mind Mate
        </h1>

        {/* Subtitle */}
        <p style={{
          textAlign: 'center',
          color: '#666',
          marginBottom: '40px',
          fontSize: '15px',
          lineHeight: '1.5',
          animation: 'slideInDown 0.8s ease-out 0.4s both'
        }}>
          Your Personal Mental Health Assistant
        </p>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '13px',
            border: '1px solid #fcc',
            animation: 'slideInDown 0.6s ease-out'
          }}>
            {error}
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="button-login"
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
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            opacity: loading ? 0.6 : 1,
            animation: 'slideInDown 0.8s ease-out 0.5s both'
          }}
          onMouseOver={(e) => !loading && (e.currentTarget.style.borderColor = '#667eea')}
          onMouseOut={(e) => !loading && (e.currentTarget.style.borderColor = '#ddd')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <g transform="matrix(1, 0, 0, 1, 27.009, -39.238)">
              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.574 58.029 -12.734 58.479 -14.754 58.479 C -17.884 58.479 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
            </g>
          </svg>
          {loading ? 'Connecting to Google...' : 'Sign in with Google'}
        </button>

        {/* Description */}
        <p style={{
          textAlign: 'center',
          color: '#999',
          marginTop: '24px',
          fontSize: '12px',
          lineHeight: '1.6',
          animation: 'slideInDown 0.8s ease-out 0.6s both'
        }}>
          Sign in with your Google account to get started.<br />
          Your wellness data will be automatically connected to Google Fit.
        </p>

        {/* Privacy Policy Link */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          animation: 'slideInDown 0.8s ease-out 0.7s both'
        }}>
          <a 
            href="/privacy.html" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{
              color: '#667eea', 
              textDecoration: 'none', 
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  )
}
