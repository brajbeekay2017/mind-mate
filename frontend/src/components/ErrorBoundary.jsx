import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ [ERROR BOUNDARY] Component error:', error);
    console.error('❌ [ERROR BOUNDARY] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: '#fee',
          color: '#c33',
          fontFamily: 'system-ui',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h2>😞 Something Went Wrong</h2>
          <p style={{ fontSize: '14px', marginTop: '16px', maxWidth: '500px', lineHeight: '1.6' }}>
            {this.state.error?.message}
          </p>
          <details style={{ marginTop: '20px', textAlign: 'left', fontSize: '12px', color: '#999' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Debug Info</summary>
            <pre style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#6FA8F1',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}