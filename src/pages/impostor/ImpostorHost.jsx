import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  subscribeImpostorSession,
  subscribeImpostorPlayers,
  assignImpostorRoles,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import { getRandomWord } from '../../data/words.js'
import { useAuth } from '../../hooks/useAuth.js'

const T = {
  en: {
    waiting: 'Waiting for players…',
    scanToJoin: 'Players scan this QR to join',
    code: 'Session code',
    inRoom: (n) => `${n} player${n !== 1 ? 's' : ''} in room`,
    needMore: (n) => `Need more than ${n} player${n !== 1 ? 's' : ''} to start`,
    assignBtn: 'Assign Roles →',
    assigning: 'Assigning…',
    host: 'you',
  },
  es: {
    waiting: 'Esperando jugadores…',
    scanToJoin: 'Los jugadores escanean este QR para unirse',
    code: 'Código de sesión',
    inRoom: (n) => `${n} jugador${n !== 1 ? 'es' : ''} en la sala`,
    needMore: (n) => `Se necesitan más de ${n} jugador${n !== 1 ? 'es' : ''} para empezar`,
    assignBtn: 'Asignar roles →',
    assigning: 'Asignando…',
    host: 'tú',
  },
}

export default function ImpostorHost() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const sessionExistedRef = useRef(false)

  useEffect(() => {
    const u1 = subscribeImpostorSession(sessionId, setMeta)
    const u2 = subscribeImpostorPlayers(sessionId, setPlayers)
    return () => { u1(); u2() }
  }, [sessionId])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (meta.phase === 'ended' || Date.now() - meta.createdAt > SESSION_TTL) {
        deleteSession(sessionId).then(() => navigate('/', { replace: true }))
        return
      }
      if (meta.phase === 'role_reveal') navigate(`/impostor/play/${sessionId}`, { replace: true })
    } else if (sessionExistedRef.current) {
      navigate('/', { replace: true })
    }
  }, [meta, navigate, sessionId])

  const lang = meta?.lang ?? 'es'
  const t = T[lang]
  const numImpostors = meta?.numImpostors ?? 1
  const canStart = players.length > numImpostors

  const lobbyUrl = `${window.location.origin}${window.location.pathname}#/impostor/lobby/${sessionId}`

  async function handleAssignRoles() {
    if (!canStart || loading) return
    setLoading(true)
    try {
      const word = getRandomWord(meta.category, lang)
      await assignImpostorRoles(sessionId, players.map(p => p.id), numImpostors, word)
      navigate(`/impostor/play/${sessionId}`, { replace: true })
    } catch {
      setLoading(false)
    }
  }

  if (!meta) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-6">
      <h2 className="text-white text-2xl font-bold">{t.waiting}</h2>

      <div className="bg-white p-4 rounded-2xl shadow-2xl shadow-black/50">
        <QRCodeSVG value={lobbyUrl} size={200} level="M" includeMargin={false} />
      </div>

      <div className="text-center">
        <p className="text-white/40 text-xs mb-1">{t.scanToJoin}</p>
        <p className="text-white/30 text-xs mb-3">{t.code}</p>
        <p className="text-white text-3xl font-mono font-bold tracking-widest">{sessionId}</p>
      </div>

      <div className="w-full max-w-xs">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3 text-center">{t.inRoom(players.length)}</p>
        <div className="flex flex-col gap-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-white font-semibold">{p.name}</span>
              {p.id === uid && (
                <span className="text-white/30 text-xs ml-auto">({t.host})</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {!canStart && (
        <p className="text-white/40 text-sm text-center">{t.needMore(numImpostors)}</p>
      )}

      <button
        onClick={handleAssignRoles}
        disabled={!canStart || loading}
        className="w-full max-w-xs py-5 rounded-2xl bg-red-500 text-white font-black text-xl tracking-wide shadow-lg shadow-red-500/20 disabled:opacity-40 active:bg-red-600 transition-colors"
      >
        {loading ? t.assigning : t.assignBtn}
      </button>
    </div>
  )
}
