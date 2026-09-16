import { useState, useEffect } from 'react'
import { subscribeAuthError } from '../firebase/authState.js'

/**
 * Shown app-wide when the anonymous session never arrives. Without it every
 * button just sits on "Conectando…" with no way to tell why from a phone.
 */
export default function AuthErrorBanner() {
  const [error, setError] = useState(null)

  useEffect(() => subscribeAuthError(setError), [])

  if (!error) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-red-950/95 border-t border-red-500/60 px-4 py-3 text-center backdrop-blur">
      <p className="text-red-100 text-sm font-bold">No se pudo conectar con el servidor</p>
      <p className="text-red-200/70 text-xs mt-1 font-mono break-all">{error}</p>
      <p className="text-red-200/50 text-[11px] mt-1">Recarga la página; si sigue igual, pásale este código a quien administra la app.</p>
    </div>
  )
}
