import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { signInAnonymously } from 'firebase/auth'
import { auth } from './firebase/config.js'
import './index.css'
import App from './App.jsx'

signInAnonymously(auth).catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
