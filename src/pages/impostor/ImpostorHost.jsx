import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  subscribeImpostorSession,
  subscribeImpostorPlayers,
  assignImpostorRoles,
  deleteSession,
  updateImpostorMeta,
  SESSION_TTL,
} from '../../firebase/session.js'
import { getRandomWord, getCategoryNames } from '../../data/words.js'
import { useAuth } from '../../hooks/useAuth.js'
import ShareSessionLink from '../../components/ShareSessionLink.jsx'

function Stepper({ label, value, onChange, min, max }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
      <span className="text-white font-semibold text-base">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-9 h-9 rounded-full bg-white/10 text-white text-xl font-bold flex items-center justify-center disabled:opacity-30 active:bg-white/20 transition-colors"
        >−</button>
        <span className="text-white text-xl font-bold w-6 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-9 h-9 rounded-full bg-white/10 text-white text-xl font-bold flex items-center justify-center disabled:opacity-30 active:bg-white/20 transition-colors"
        >+</button>
      </div>
    </div>
  )
}

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
    copyLink: 'Copy link',
    copied: 'Copied! ✓',
    share: 'Share',
    shareTitle: 'Impostor',
    shareText: (id) => `Join the Impostor game (code ${id})`,
    settings: 'Game settings',
    impostors: 'Impostors',
    category: 'Category',
    all: 'All',
    exitGame: 'Exit game',
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
    copyLink: 'Copiar enlace',
    copied: '¡Copiado! ✓',
    share: 'Compartir',
    shareTitle: 'Impostor',
    shareText: (id) => `Únete al juego de Impostor (código ${id})`,
    settings: 'Configuración',
    impostors: 'Impostores',
    category: 'Categoría',
    all: 'Todas',
    exitGame: 'Salir del juego',
  },
}

export default function ImpostorHost() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [numImpostors, setNumImpostorsState] = useState(1)
  const [category, setCategoryState] = useState('Todas')
  const sessionExistedRef = useRef(false)
  const settingsInited = useRef(false)

  useEffect(() => {
    const u1 = subscribeImpostorSession(sessionId, setMeta)
    const u2 = subscribeImpostorPlayers(sessionId, setPlayers)
    return () => { u1(); u2() }
  }, [sessionId])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (!settingsInited.current) {
        settingsInited.current = true
        setNumImpostorsState(meta.numImpostors ?? 1)
        setCategoryState(meta.category ?? 'Todas')
      }
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
  const categoryNames = getCategoryNames(lang)
  const canStart = players.length > numImpostors

  const lobbyUrl = `${window.location.origin}${window.location.pathname}#/impostor/lobby/${sessionId}`

  async function handleNumImpostorsChange(n) {
    setNumImpostorsState(n)
    await updateImpostorMeta(sessionId, { numImpostors: n })
  }

  async function handleCategoryChange(cat) {
    setCategoryState(cat)
    await updateImpostorMeta(sessionId, { category: cat })
  }

  async function handleExitGame() {
    await deleteSession(sessionId)
    navigate('/impostor', { replace: true })
  }

  async function handleAssignRoles() {
    if (!canStart || loading) return
    setLoading(true)
    try {
      const word = getRandomWord(category, lang)
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
        <ShareSessionLink
          url={lobbyUrl}
          shareTitle={t.shareTitle}
          shareText={t.shareText(sessionId)}
          copyLabel={t.copyLink}
          copiedLabel={t.copied}
          shareLabel={t.share}
          primaryShare
        />
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

      <div className="w-full max-w-xs flex flex-col gap-3">
        <p className="text-white/40 text-xs uppercase tracking-widest text-center">{t.settings}</p>

        <Stepper
          label={t.impostors}
          value={numImpostors}
          onChange={handleNumImpostorsChange}
          min={1}
          max={5}
        />

        <div className="bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
          <p className="text-white/60 text-sm font-semibold mb-3">{t.category}</p>
          <div className="flex flex-wrap gap-2">
            {[t.all, ...categoryNames].map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === cat ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60 active:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
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

      <button
        onClick={handleExitGame}
        className="w-full max-w-xs py-4 rounded-2xl bg-white/10 active:bg-white/20 text-white font-bold text-base transition-colors"
      >
        {t.exitGame}
      </button>
    </div>
  )
}
