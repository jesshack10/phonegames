import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth } from '../firebase/config.js'

export function useAuth() {
  const [uid, setUid] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!auth) {
      setReady(true)
      return
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid)
        setReady(true)
      } else {
        try {
          await signInAnonymously(auth)
        } catch (e) {
          console.warn('Anon auth failed:', e)
          setReady(true)
        }
      }
    })
    return unsub
  }, [])

  return { uid, ready }
}
