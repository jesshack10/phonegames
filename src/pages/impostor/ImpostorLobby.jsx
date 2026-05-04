import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  joinImpostorPlayer,
  subscribeImpostorSession,
  subscribeImpostorPlayers,
  getImpostorMeta,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'

const T = {
  en: {
    yourName: 'Your name',
    placeholder: 'Enter your name…',
    joinBtn: 'Join Game →',
    waiting: 'Waiting for game to start…',
    inRoom: (n) => `${n} player${n !== 1 ? 's' : ''} in room`,
    errName: 'Enter your name',
    errLong: 'Name too long (max 16)',
    errNotFound: 'Session not found',
    errStarted: 'Game already started',
    errFailed: 'Failed to join. Try again.',
  },
  es: {
    yourName: 'Tu nombre',
    placeholder: 'Escribe tu nombre…',
    joinBtn: 'Unirme →',
    waiting: 'Esperando que inicie el juego…',
    inRoom: (n) => `${n} jugador${n !== 1 ? 'es' : ''} en la sala`,
    errName: 'Escribe tu nombre',
    errLong: 'Nombre muy largo (máx 16)',
    errNotFound: 'Sesión no encontrada',
    errStarted: 'El juego ya comenzó',
    errFailed: 'Error al unirte. Intenta de nuevo.',
  },
}

export default function ImpostorLobby() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [lang, setLang] = useState('es')
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [players, setPlayers] = useState([])
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')

  const storageKey = `imp_${sessionId}`

  // Fetch lang from meta on mount (before joining) so join screen is in the right language
  useEffect(() => {
    getImpostorMeta(sessionId).then(m => {
      if (m) setLang(m.lang ?? 'es')
    })
  }, [sessionId])

  // Check if already joined from a previous visit
  useEffect(() => {
    if (!uid) return
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const { uid: storedUid } = JSON.parse(stored)
      if (uid === storedUid) setJoined(true)
    }
  }, [uid, storageKey])

  // Subscribe once joined
  useEffect(() => {
    if (!joined) return
    const u1 = subscribeImpostorSession(sessionId, setMeta)
    const u2 = subscribeImpostorPlayers(sessionId, setPlayers)
    return () => { u1(); u2() }
  }, [joined, sessionId])

  // Navigate when host assigns roles
  useEffect(() => {
    if (meta?.phase === 'role_reveal') navigate(`/impostor/play/${sessionId}`, { replace: true })
  }, [meta, navigate, sessionId])

  const t = T[lang]

  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed) return setError(t.errName)
    if (trimmed.length > 16) return setError(t.errLong)
    if (!uid) return
    try {
      const m = await getImpostorMeta(sessionId)
      if (!m) return setError(t.errNotFound)
      if (m.phase !== 'lobby') return setError(t.errStarted)
      await joinImpostorPlayer(sessionId, uid, trimmed, false)
      localStorage.setItem(storageKey, JSON.stringify({ uid, name: trimmed }))
      setJoined(true)
    } catch {
      setError(t.errFailed)
    }
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-6xl">🕵️</div>
        <h1 className="text-white text-3xl font-black">
          IMPOS<span className="text-red-500">TOR</span>
        </h1>
        <p className="text-white/30 text-sm font-mono tracking-widest">{sessionId}</p>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text"
            placeholder={t.placeholder}
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={16}
            className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-red-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={!name.trim() || !ready}
            className="w-full py-4 rounded-2xl bg-red-500 text-white text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform"
          >
            {t.joinBtn}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-6">
      <div className="text-5xl mt-10">🕵️</div>
      <h2 className="text-white text-2xl font-bold text-center">{t.waiting}</h2>
      <p className="text-white/40 text-sm">{t.inRoom(players.length)}</p>

      <div className="w-full max-w-xs flex flex-col gap-2">
        {players.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className="text-white font-semibold">{p.name}</span>
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
