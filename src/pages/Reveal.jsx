import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { decodeRevealData } from '../utils/game.js'

const T = {
  en: {
    player: (n) => `Player ${n}`,
    tapReveal: 'Tap to reveal your role',
    makePrivate: "Make sure nobody else can see your screen",
    game: (t, n) => `${t} players · ${n} impostor${n > 1 ? 's' : ''}`,
    yourRole: 'Your role',
    crewmate: 'CREWMATE',
    secretWord: 'Secret word',
    crewmateNote: (n) => `Everyone except the impostor${n > 1 ? 's' : ''} has this word.`,
    crewmateMission: 'Your mission',
    crewmateTips: [
      'Give clues that prove you know the word',
      "Don't say the word directly!",
      'Watch for players who seem lost',
      (n) => `Vote out the impostor${n > 1 ? 's' : ''}`,
    ],
    impostorRole: 'IMPOSTOR',
    impostorNote: "You don't know the secret word. Blend in, don't get caught!",
    impostorMission: 'Your mission',
    impostorTips: [
      "Listen carefully to crewmates' clues",
      'Give vague answers to blend in',
      'Try to guess the secret word',
      'Avoid being voted out',
    ],
    close: 'Close this page before passing the phone',
    invalidTitle: 'Invalid QR code',
    invalidBody: 'Ask the host to regenerate the QR code.',
  },
  es: {
    player: (n) => `Jugador ${n}`,
    tapReveal: 'Toca para revelar tu rol',
    makePrivate: 'Asegúrate de que nadie más pueda ver tu pantalla',
    game: (t, n) => `${t} jugadores · ${n} impostor${n > 1 ? 'es' : ''}`,
    yourRole: 'Tu rol',
    crewmate: 'JUGADOR',
    secretWord: 'Palabra secreta',
    crewmateNote: (n) => `Todos excepto el impostor${n > 1 ? 'es' : ''} tienen esta palabra.`,
    crewmateMission: 'Tu misión',
    crewmateTips: [
      'Da pistas que demuestren que conoces la palabra',
      '¡No digas la palabra directamente!',
      'Presta atención a los jugadores que parecen perdidos',
      (n) => `Vota para eliminar al impostor${n > 1 ? 'es' : ''}`,
    ],
    impostorRole: 'IMPOSTOR',
    impostorNote: 'No conoces la palabra secreta. ¡Pasa desapercibido y no te descubran!',
    impostorMission: 'Tu misión',
    impostorTips: [
      'Escucha con atención las pistas de los jugadores',
      'Da respuestas vagas para pasar desapercibido',
      'Intenta adivinar la palabra secreta',
      'Evita ser eliminado por votación',
    ],
    close: 'Cierra esta página antes de pasar el teléfono',
    invalidTitle: 'Código QR inválido',
    invalidBody: 'Pide al anfitrión que genere el código QR de nuevo.',
  },
}

export default function Reveal() {
  const [searchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const encoded = searchParams.get('d')
    if (!encoded) { setError(true); return }
    const decoded = decodeRevealData(encoded)
    if (!decoded) { setError(true); return }
    setData(decoded)
  }, [searchParams])

  const lang = data?.lang ?? 'en'
  const t = T[lang] ?? T.en

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-white text-xl font-bold mb-2">{T.en.invalidTitle}</h2>
        <p className="text-white/40 text-sm">{T.en.invalidBody}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const isImpostor = data.role === 'impostor'

  if (!revealed) {
    return (
      <div
        className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 text-center cursor-pointer select-none"
        onClick={() => setRevealed(true)}
      >
        <div className="text-7xl mb-6 animate-pulse">❓</div>
        <h2 className="text-white text-3xl font-black mb-3">
          {t.player(data.playerNum)}
        </h2>
        <p className="text-white/40 text-base mb-10">{t.makePrivate}</p>
        <div className="bg-white/5 border border-white/20 rounded-2xl px-10 py-5 active:bg-white/10 transition-colors">
          <p className="text-white font-bold text-xl">{t.tapReveal}</p>
        </div>
        <p className="text-white/20 text-xs mt-8">
          {t.game(data.totalPlayers, data.numImpostors)}
        </p>
      </div>
    )
  }

  if (isImpostor) {
    return (
      <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center px-5 text-center">
        <div className="text-7xl mb-6">🕵️</div>
        <div className="bg-red-500/20 border border-red-500/30 rounded-3xl px-8 py-8 max-w-xs w-full mb-8">
          <p className="text-red-300 text-sm font-semibold uppercase tracking-widest mb-3">
            {t.yourRole}
          </p>
          <h1 className="text-4xl font-black text-red-400 mb-1">{t.impostorRole}</h1>
          <p className="text-red-300/60 text-sm mt-3">{t.impostorNote}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 max-w-xs w-full text-left">
          <p className="text-white/60 text-sm font-semibold mb-2">{t.impostorMission}</p>
          <ul className="text-white/40 text-sm space-y-1.5">
            {t.impostorTips.map((tip, i) => (
              <li key={i}>• {typeof tip === 'function' ? tip(data.numImpostors) : tip}</li>
            ))}
          </ul>
        </div>

        <p className="text-red-900 text-xs mt-8">{t.close}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#071a0f] flex flex-col items-center justify-center px-5 text-center">
      <div className="text-7xl mb-6">✅</div>
      <div className="bg-green-500/20 border border-green-500/30 rounded-3xl px-8 py-8 max-w-xs w-full mb-8">
        <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-3">
          {t.yourRole}
        </p>
        <p className="text-xl font-black text-green-400 mb-4">{t.crewmate}</p>
        <div className="bg-white/10 rounded-2xl px-6 py-5 mb-3">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">{t.secretWord}</p>
          <p className="text-white text-5xl font-black capitalize">{data.word}</p>
        </div>
        <p className="text-green-300/60 text-sm mt-1">
          {t.crewmateNote(data.numImpostors)}
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 max-w-xs w-full text-left">
        <p className="text-white/60 text-sm font-semibold mb-2">{t.crewmateMission}</p>
        <ul className="text-white/40 text-sm space-y-1.5">
          {t.crewmateTips.map((tip, i) => (
            <li key={i}>• {typeof tip === 'function' ? tip(data.numImpostors) : tip}</li>
          ))}
        </ul>
      </div>

      <p className="text-green-950 text-xs mt-8">{t.close}</p>
    </div>
  )
}
