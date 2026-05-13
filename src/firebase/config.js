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

let db = null
let auth = null

if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
  try {
    const app = initializeApp(firebaseConfig)
    db = getDatabase(app)
    auth = getAuth(app)
  } catch (e) {
    console.warn('Firebase failed to initialize:', e)
  }
} else {
  console.warn('Firebase env vars missing — Werewolf game will not work')
}

export { db, auth }
