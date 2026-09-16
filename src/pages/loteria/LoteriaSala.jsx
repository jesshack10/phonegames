import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  joinLoteriaPlayer,
  subscribeLoteriaSession,
  subscribeLoteriaPlayers,
  getLoteriaMeta,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'
import { PATTERNS } from '../../utils/loteria.js'

export default function LoteriaSala() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [players, setPlayers] = useState([])
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const sessionExistedRef = useRef(false)

  const storageKey = `lot_${sessionId}`

  // ¿Ya se había unido en una visita anterior?
  useEffect(() => {
    if (!uid) return
    const stored = localStorage.getItem(storageKey)
    if (!stored) return
    try {
      const { uid: storedUid } = JSON.parse(stored)
      if (uid === storedUid) setJoined(true)
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [uid, storageKey])

  useEffect(() => {
    if (!joined) return
    const u1 = subscribeLoteriaSession(sessionId, setMeta)
    const u2 = subscribeLoteriaPlayers(sessionId, setPlayers)
    return () => { u1(); u2() }
  }, [joined, sessionId])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (meta.phase === 'ended' || Date.now() - meta.createdAt > SESSION_TTL) {
        deleteSession(sessionId).then(() => navigate('/', { replace: true }))
        return
      }
      if (meta.phase !== 'lobby') navigate(`/loteria/jugar/${sessionId}`, { replace: true })
    } else if (joined && sessionExistedRef.current) {
      localStorage.removeItem(storageKey)
      navigate('/', { replace: true })
    }
  }, [meta, navigate, sessionId, joined, storageKey])

  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Escribe tu nombre')
    if (trimmed.length > 16) return setError('Nombre muy largo (máx 16)')
    if (!uid) return setError('Aún conectando con el servidor. Espera un momento y vuelve a intentar.')
    try {
      const m = await getLoteriaMeta(sessionId)
      if (!m) return setError('Sala no encontrada')
      if (Date.now() - m.createdAt > SESSION_TTL) {
        await deleteSession(sessionId)
        return setError('La sala expiró')
      }
      if (m.phase !== 'lobby') return setError('La partida ya comenzó')
      await joinLoteriaPlayer(sessionId, uid, trimmed, false)
      localStorage.setItem(storageKey, JSON.stringify({ uid, name: trimmed }))
      setJoined(true)
    } catch (e) {
      console.error('unirse falló:', e)
      setError(`Error al unirte: ${e?.code || e?.message || 'error desconocido'}`)
    }
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-6xl">🃏</div>
        <h1 className="text-white text-3xl font-black">
          LOTE<span className="text-amber-500">RÍA</span>
        </h1>
        <p className="text-white/30 text-sm font-mono tracking-widest">{sessionId}</p>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text"
            placeholder="Escribe tu nombre…"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={16}
            className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-amber-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={!name.trim() || !ready}
            className="w-full py-4 rounded-2xl bg-amber-500 text-white text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform"
          >
            Unirme →
          </button>
        </div>
      </div>
    )
  }

  const guests = players.filter(p => !p.isHost)
  const patterns = meta?.patterns ?? []

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-5">
      <div className="text-5xl mt-10">🃏</div>
      <h2 className="text-white text-2xl font-bold text-center">Esperando que reparta el moderador…</h2>

      {patterns.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {patterns.map(k => (
            <span key={k} className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              {PATTERNS[k]?.label ?? k}
            </span>
          ))}
        </div>
      )}

      <p className="text-white/40 text-sm">
        {guests.length} jugador{guests.length !== 1 ? 'es' : ''} en la sala
      </p>

      <div className="w-full max-w-xs flex flex-col gap-2">
        {guests.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className="text-white font-semibold">{p.name}</span>
            {p.id === uid && <span className="text-white/30 text-xs ml-auto">(tú)</span>}
          </div>
        ))}
      </div>

      <div className="flex gap-1 mt-4">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
