import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  subscribePeticionesSession,
  submitPeticion,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'

export default function PeticionesPlayer() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [meta, setMeta] = useState(null)
  const [myName, setMyName] = useState('')
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const sessionExistedRef = useRef(false)

  const storageKey = `pet_${sessionId}`

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      navigate(`/peticiones/lobby/${sessionId}`, { replace: true })
      return
    }
    try {
      const { name } = JSON.parse(stored)
      setMyName(name)
    } catch {
      localStorage.removeItem(storageKey)
      navigate(`/peticiones/lobby/${sessionId}`, { replace: true })
    }
  }, [sessionId, navigate, storageKey])

  useEffect(() => {
    const unsub = subscribePeticionesSession(sessionId, setMeta)
    return () => unsub()
  }, [sessionId])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (meta.phase === 'ended' || Date.now() - meta.createdAt > SESSION_TTL) {
        deleteSession(sessionId).then(() => navigate('/', { replace: true }))
      }
    } else if (sessionExistedRef.current) {
      localStorage.removeItem(storageKey)
      navigate('/', { replace: true })
    }
  }, [meta, sessionId, navigate, storageKey])

  async function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return setError('Escribe tu petición primero')
    if (!uid || !myName || submitting) return

    setSubmitting(true)
    setError('')
    try {
      await submitPeticion(sessionId, uid, myName, trimmed)
      setSubmitted(true)
    } catch {
      setError('Error al enviar. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6 text-center">
        <div className="text-7xl">✓</div>
        <h2 className="text-white text-3xl font-black">Petición enviada</h2>
        <p className="text-white/60 text-base">Gracias, {myName}.</p>
        <p className="text-white/30 text-sm">Ya puedes cerrar esta página.</p>
      </div>
    )
  }

  if (!myName) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col px-6 py-10 gap-5">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-xs uppercase tracking-widest">{myName}</p>
        <p className="text-white/30 text-xs font-mono">{sessionId}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-4xl">🙏</div>
        <h2 className="text-white text-2xl font-black tracking-tight">Tu petición</h2>
      </div>

      <p className="text-white/50 text-sm">
        Escribe lo que quieras compartir con el grupo.
      </p>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setError('') }}
        placeholder="Escribe aquí tu petición…"
        rows={10}
        autoFocus
        className="w-full px-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white text-base placeholder-white/30 outline-none focus:border-blue-500 resize-none leading-relaxed"
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!text.trim() || submitting}
        className="w-full py-5 rounded-2xl bg-blue-500 active:bg-blue-600 text-white text-lg font-black tracking-wide shadow-lg shadow-blue-500/20 disabled:opacity-40 transition-colors mt-auto"
      >
        {submitting ? 'Enviando…' : 'Enviar petición →'}
      </button>
    </div>
  )
}
