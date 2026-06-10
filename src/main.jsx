import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/globals.css'
import { initNative, initPushNotifications } from '@/lib/native'

// Native App-Initialisierung (Splash ausblenden, Status-Bar, Back-Button, Push).
// No-op im Web-Browser.
initNative()
initPushNotifications({
  onToken: (token) => console.info('[push] device token', token),
})

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}