import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { signInAnonymously } from 'firebase/auth'
import { auth, configError } from './firebase/config.js'
import { reportAuthError } from './firebase/authState.js'
import './index.css'
import App from './App.jsx'

// Every game needs the anonymous session before it can write anything, so a
// failure here is fatal for the whole app rather than for one screen. Retry a
// couple of times for a flaky network, then surface the reason.
async function startSession() {
  if (!auth) {
    reportAuthError({ code: `firebase-sin-configurar · ${configError ?? 'motivo desconocido'}` })
    return
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await signInAnonymously(auth)
      return
    } catch (e) {
      if (attempt === 2) {
        console.error('Anonymous sign-in failed:', e)
        reportAuthError(e)
      } else {
        await new Promise(r => setTimeout(r, 400 * 2 ** attempt))
      }
    }
  }
}

startSession()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
