import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';
import { startSyncManager } from './api/syncManager';

startSyncManager();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#e5e7eb', background: '#030712', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#f87171' }}>🎣 BaitBuddy – Ladefehler</h2>
          <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>Die App konnte nicht gestartet werden. Bitte Seite neu laden.</p>
          <pre style={{ color: '#6b7280', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>{this.state.error?.message}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#0891b2', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
