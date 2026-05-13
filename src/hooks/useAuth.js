import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config.js'

export function useAuth() {
  const [uid, setUid] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!auth) {
      setReady(true)
      return
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null)
      setReady(true)
    })
    return unsub
  }, [])

  return { uid, ready }
}
