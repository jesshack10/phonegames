import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { subscribeImpostorSession, subscribeImpostorPlayers, deleteSession, SESSION_TTL } from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'

const T = {
  en: {
    tapReveal: 'Tap to reveal your role',
    makePrivate: "Make sure nobody else can see your screen",
    yourRole: 'Your role',
    crewmate: 'CREWMATE',
    impostor: 'IMPOSTOR',
    secretWord: 'Secret word',
    crewmateNote: (n) => `Everyone except the impostor${n > 1 ? 's' : ''} has this word.`,
    impostorNote: "You don't know the secret word. Blend in!",
    crewmateTips: [
      'Give clues that prove you know the word',
      "Don't say the word directly!",
      'Watch for players who seem lost',
      (n) => `Vote out the impostor${n > 1 ? 's' : ''}`,
    ],
    impostorTips: [
      'Listen carefully to the clues others give',
      'Give vague answers to blend in',
      'Try to guess the secret word',
      'Avoid being voted out',
    ],
    mission: 'Your mission',
    close: 'Close this page after viewing',
    newGame: 'End game & New game',
    loading: 'Loading your role…',
    notInSession: 'You are not part of this game.',
  },
  es: {
    tapReveal: 'Toca para revelar tu rol',
    makePrivate: 'Asegúrate de que nadie más pueda ver tu pantalla',
    yourRole: 'Tu rol',
    crewmate: 'JUGADOR',
    impostor: 'IMPOSTOR',
    secretWord: 'Palabra secreta',
    crewmateNote: (n) => `Todos excepto el impostor${n > 1 ? 'es' : ''} tienen esta palabra.`,
    impostorNote: '¡No conoces la palabra secreta. Pasa desapercibido!',
    crewmateTips: [
      'Da pistas que demuestren que conoces la palabra',
      '¡No digas la palabra directamente!',
      'Presta atención a los jugadores que parecen perdidos',
      (n) => `Vota para eliminar al impostor${n > 1 ? 'es' : ''}`,
    ],
    impostorTips: [
      'Escucha con atención las pistas de los demás',
      'Da respuestas vagas para pasar desapercibido',
      'Intenta adivinar la palabra secreta',
      'Evita ser eliminado por votación',
    ],
    mission: 'Tu misión',
    close: 'Cierra esta página después de ver tu rol',
    newGame: 'Terminar partida y nueva partida',
    loading: 'Cargando tu rol…',
    notInSession: 'No formas parte de esta partida.',
  },
}

export default function ImpostorPlayer() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [revealed, setRevealed] = useState(false)
  const sessionExistedRef = useRef(false)

  const storageKey = `imp_${sessionId}`

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

  useEffect(() => {
    const u1 = subscribeImpostorSession(sessionId, setMeta)
    const u2 = subscribeImpostorPlayers(sessionId, setPlayers)
    return () => { u1(); u2() }
  }, [sessionId])

  const lang = meta?.lang ?? 'es'
  const t = T[lang]
  const myPlayer = players.find(p => p.id === uid)
  const numImpostors = meta?.numImpostors ?? 1
  const isImpostor = myPlayer?.role === 'impostor'
  const isHost = myPlayer?.isHost === true

  async function handleEndGame() {
    await deleteSession(sessionId)
    navigate('/impostor', { replace: true })
  }

  if (!meta || !uid || players.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!myPlayer || !myPlayer.role) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center px-6 text-center">
        <p className="text-white/50 text-sm">{t.notInSession}</p>
      </div>
    )
  }

  // ── Tap to reveal ──────────────────────────────────────────────────────────
  if (!revealed) {
    return (
      <div
        className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 text-center cursor-pointer select-none"
        onClick={() => setRevealed(true)}
      >
        <div className="text-7xl mb-6 animate-pulse">❓</div>
        <h2 className="text-white text-3xl font-black mb-3">{myPlayer.name}</h2>
        <p className="text-white/40 text-base mb-10">{t.makePrivate}</p>
        <div className="bg-white/5 border border-white/20 rounded-2xl px-10 py-5 active:bg-white/10 transition-colors">
          <p className="text-white font-bold text-xl">{t.tapReveal}</p>
        </div>
      </div>
    )
  }

  // ── Impostor ───────────────────────────────────────────────────────────────
  if (isImpostor) {
    return (
      <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center px-5 text-center">
        <div className="text-7xl mb-6">🕵️</div>
        <div className="bg-red-500/20 border border-red-500/30 rounded-3xl px-8 py-8 max-w-xs w-full mb-6">
          <p className="text-red-300 text-sm font-semibold uppercase tracking-widest mb-3">
            {t.yourRole}
          </p>
          <h1 className="text-4xl font-black text-red-400 mb-1">{t.impostor}</h1>
          <p className="text-red-300/60 text-sm mt-3">{t.impostorNote}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 max-w-xs w-full text-left mb-6">
          <p className="text-white/60 text-sm font-semibold mb-2">{t.mission}</p>
          <ul className="text-white/40 text-sm space-y-1.5">
            {t.impostorTips.map((tip, i) => (
              <li key={i}>• {typeof tip === 'function' ? tip(numImpostors) : tip}</li>
            ))}
          </ul>
        </div>

        <p className="text-red-900 text-xs mb-6">{t.close}</p>
        {isHost && (
          <button
            onClick={handleEndGame}
            className="w-full max-w-xs py-4 rounded-2xl bg-white/10 active:bg-white/20 text-white font-bold text-base transition-colors"
          >
            {t.newGame}
          </button>
        )}
      </div>
    )
  }

  // ── Crewmate ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#071a0f] flex flex-col items-center justify-center px-5 text-center">
      <div className="text-7xl mb-6">✅</div>
      <div className="bg-green-500/20 border border-green-500/30 rounded-3xl px-8 py-8 max-w-xs w-full mb-6">
        <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-3">
          {t.yourRole}
        </p>
        <h1 className="text-xl font-black text-green-400 mb-4">{t.crewmate}</h1>
        <div className="bg-white/10 rounded-2xl px-6 py-5 mb-3">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">{t.secretWord}</p>
          <p className="text-white text-5xl font-black capitalize">{meta.word}</p>
        </div>
        <p className="text-green-300/60 text-sm mt-1">{t.crewmateNote(numImpostors)}</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 max-w-xs w-full text-left mb-6">
        <p className="text-white/60 text-sm font-semibold mb-2">{t.mission}</p>
        <ul className="text-white/40 text-sm space-y-1.5">
          {t.crewmateTips.map((tip, i) => (
            <li key={i}>• {typeof tip === 'function' ? tip(numImpostors) : tip}</li>
          ))}
        </ul>
      </div>

      <p className="text-green-950 text-xs mb-6">{t.close}</p>
      {isHost && (
        <button
          onClick={handleEndGame}
          className="w-full max-w-xs py-4 rounded-2xl bg-white/10 active:bg-white/20 text-white font-bold text-base transition-colors"
        >
          {t.newGame}
        </button>
      )}
    </div>
  )
}
