import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { signInAnonymously } from 'firebase/auth'
import { auth } from './firebase/config.js'
import './index.css'
import App from './App.jsx'

if (auth) signInAnonymously(auth).catch(e => console.error('Anonymous sign-in failed:', e))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
