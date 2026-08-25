import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  joinPeticionesPlayer,
  subscribePeticionesSession,
  getPeticionesMeta,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'

export default function PeticionesLobby() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState(null)
  const sessionExistedRef = useRef(false)

  const storageKey = `pet_${sessionId}`

  useEffect(() => {
    if (!uid) return
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const { uid: storedUid } = JSON.parse(stored)
        if (uid === storedUid) {
          navigate(`/peticiones/play/${sessionId}`, { replace: true })
        }
      } catch {
        localStorage.removeItem(storageKey)
      }
    }
  }, [uid, sessionId, navigate, storageKey])

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

  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Escribe tu nombre')
    if (trimmed.length > 24) return setError('Nombre muy largo (máx 24)')
    if (!uid || loading) return

    setLoading(true)
    setError('')
    try {
      const m = await getPeticionesMeta(sessionId)
      if (!m) {
        setError('Sesión no encontrada')
        setLoading(false)
        return
      }
      if (Date.now() - m.createdAt > SESSION_TTL) {
        await deleteSession(sessionId)
        setError('Sesión expirada')
        setLoading(false)
        return
      }
      await joinPeticionesPlayer(sessionId, uid, trimmed)
      localStorage.setItem(storageKey, JSON.stringify({ uid, name: trimmed }))
      navigate(`/peticiones/play/${sessionId}`, { replace: true })
    } catch {
      setError('Error al unirte. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
      <div className="text-7xl">🙏</div>
      <h1 className="text-white text-3xl font-black tracking-tight">
        PETI<span className="text-blue-400">CIONES</span>
      </h1>
      <p className="text-white/30 text-sm font-mono tracking-widest">{sessionId}</p>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="text"
          placeholder="Escribe tu nombre…"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          maxLength={24}
          autoFocus
          className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-blue-500"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleJoin}
          disabled={!name.trim() || !ready || loading}
          className="w-full py-4 rounded-2xl bg-blue-500 active:bg-blue-600 text-white text-lg font-bold disabled:opacity-40 transition-colors"
        >
          {loading ? 'Uniendo…' : 'Unirme →'}
        </button>
      </div>
    </div>
  )
}
