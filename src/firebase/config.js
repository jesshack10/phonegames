import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// These are baked in at build time from VITE_FIREBASE_* . When any is empty the
// whole app is dead in the water, so name the ones that are missing rather than
// just noting that something is: "it isn't configured" leaves you guessing at
// which secret to go look at.
const REQUIRED = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  databaseURL: 'VITE_FIREBASE_DATABASE_URL',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID',
}

let db = null
let auth = null
let configError = null

const missing = Object.entries(REQUIRED)
  .filter(([key]) => !firebaseConfig[key])
  .map(([, envName]) => envName)

if (missing.length) {
  configError = `faltan ${missing.join(', ')}`
  console.warn('Firebase config incomplete:', configError)
} else {
  try {
    const app = initializeApp(firebaseConfig)
    db = getDatabase(app)
    auth = getAuth(app)
  } catch (e) {
    configError = `initializeApp: ${e?.code || e?.message || e}`
    console.warn('Firebase failed to initialize:', e)
  }
}

export { db, auth, configError }
