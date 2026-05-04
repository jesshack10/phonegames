import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { buildRevealURL } from '../utils/game.js'

const T = {
  en: {
    playerOf: (cur, total) => `Player ${cur} of ${total}`,
    remaining: (n) => `${n} remaining`,
    scanPrivately: (n) => `Player ${n}, scan this QR code privately`,
    dontShow: "Don't show your screen to others",
    hint: 'Scan with your phone camera • Opens a webpage showing your role',
    nextBtn: (n) => `Player ${n} done → Next`,
    lastNextBtn: (n) => `Player ${n} done → Reveal my role`,
    startOver: '← Start over',
    hostTurnTitle: 'Your turn!',
    hostTurnBody: 'All other players have scanned. Tap to reveal your role privately.',
    hostRevealBtn: 'Tap to reveal your role',
    yourRole: 'Your role',
    crewmate: 'CREWMATE',
    impostor: 'IMPOSTOR',
    secretWord: 'Secret word',
    crewmateNote: (n) => `Everyone except the impostor${n > 1 ? 's' : ''} has this word.`,
    impostorNote: "You don't know the secret word. Blend in, don't get caught!",
    readyTitle: 'All players ready!',
    readyAction: (n) => `Start discussing — find the impostor${n > 1 ? 's' : ''}!`,
    howToPlay: 'How to play',
    howToPlayText: 'Crewmates share clues about the secret word without saying it. Impostors try to blend in. Vote to eliminate who you think is an impostor!',
    startGameBtn: 'Start the game!',
    newGame: 'New Game',
  },
  es: {
    playerOf: (cur, total) => `Jugador ${cur} de ${total}`,
    remaining: (n) => `${n} restantes`,
    scanPrivately: (n) => `Jugador ${n}, escanea este código QR en privado`,
    dontShow: 'No muestres tu pantalla a los demás',
    hint: 'Escanea con la cámara de tu teléfono • Abre una página con tu rol',
    nextBtn: (n) => `Jugador ${n} listo → Siguiente`,
    lastNextBtn: (n) => `Jugador ${n} listo → Revelar mi rol`,
    startOver: '← Volver al inicio',
    hostTurnTitle: '¡Tu turno!',
    hostTurnBody: 'Los demás jugadores ya escanearon. Toca para revelar tu rol en privado.',
    hostRevealBtn: 'Toca para revelar tu rol',
    yourRole: 'Tu rol',
    crewmate: 'TRIPULANTE',
    impostor: 'IMPOSTOR',
    secretWord: 'Palabra secreta',
    crewmateNote: (n) => `Todos excepto el impostor${n > 1 ? 'es' : ''} tienen esta palabra.`,
    impostorNote: '¡No conoces la palabra secreta. Pasa desapercibido y no te descubran!',
    readyTitle: '¡Todos los jugadores listos!',
    readyAction: (n) => `¡Empiecen a discutir y encuentren al impostor${n > 1 ? 'es' : ''}!`,
    howToPlay: 'Cómo jugar',
    howToPlayText: 'Los tripulantes dan pistas sobre la palabra secreta sin decirla. Los impostores intentan pasar desapercibidos. ¡Voten para eliminar a quien crean que es el impostor!',
    startGameBtn: '¡Comenzar el juego!',
    newGame: 'Nueva partida',
  },
}

export default function Host() {
  const { state } = useLocation()
  const navigate = useNavigate()
  // currentIndex tracks which player's QR is shown (0 … numPlayers-2)
  const [currentIndex, setCurrentIndex] = useState(0)
  // hostPhase: null → 'ready' → 'revealed'
  const [hostPhase, setHostPhase] = useState(null)
  const [allDone, setAllDone] = useState(false)

  if (!state?.game) {
    navigate('/')
    return null
  }

  const { game, numPlayers, numImpostors, lang = 'en' } = state
  const { roles, word } = game
  const t = T[lang]

  // The host is always the last role slot
  const hostRole = roles[numPlayers - 1]
  const isHostImpostor = hostRole === 'impostor'
  // Players 0…numPlayers-2 get QR codes; host (numPlayers-1) reveals inline
  const qrPlayers = numPlayers - 1
  const isLastQrPlayer = currentIndex === qrPlayers - 1

  const revealURL = buildRevealURL(currentIndex, roles[currentIndex], word, numPlayers, numImpostors, lang)

  function handleNext() {
    if (isLastQrPlayer) {
      setHostPhase('ready')
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  // ── All done screen ──────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 text-center">
        <div className="text-7xl mb-6">🎮</div>
        <h2 className="text-3xl font-black text-white mb-4">{t.readyTitle}</h2>
        <p className="text-white/50 text-base mb-10">{t.readyAction(numImpostors)}</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-10 text-sm text-white/40 max-w-xs">
          <p className="font-semibold text-white/60 mb-1">{t.howToPlay}</p>
          <p>{t.howToPlayText}</p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full max-w-xs bg-white/10 active:bg-white/20 text-white font-bold text-lg py-4 rounded-2xl transition-colors"
        >
          {t.newGame}
        </button>
      </div>
    )
  }

  // ── Host role revealed ───────────────────────────────────────────────────
  if (hostPhase === 'revealed') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-5 text-center ${isHostImpostor ? 'bg-red-950' : 'bg-[#071a0f]'}`}>
        <div className="text-7xl mb-6">{isHostImpostor ? '🕵️' : '✅'}</div>

        <div className={`rounded-3xl px-8 py-8 max-w-xs w-full mb-8 border ${
          isHostImpostor
            ? 'bg-red-500/20 border-red-500/30'
            : 'bg-green-500/20 border-green-500/30'
        }`}>
          <p className={`text-sm font-semibold uppercase tracking-widest mb-3 ${isHostImpostor ? 'text-red-300' : 'text-green-300'}`}>
            {t.yourRole}
          </p>
          <h1 className={`text-4xl font-black mb-3 ${isHostImpostor ? 'text-red-400' : 'text-green-400'}`}>
            {isHostImpostor ? t.impostor : t.crewmate}
          </h1>

          {!isHostImpostor && (
            <div className="bg-white/10 rounded-2xl px-6 py-4 mt-2">
              <p className="text-white/50 text-xs uppercase tracking-widest mb-1">{t.secretWord}</p>
              <p className="text-white text-3xl font-black capitalize">{word}</p>
            </div>
          )}

          <p className={`text-sm mt-4 ${isHostImpostor ? 'text-red-300/60' : 'text-green-300/60'}`}>
            {isHostImpostor ? t.impostorNote : t.crewmateNote(numImpostors)}
          </p>
        </div>

        <button
          onClick={() => setAllDone(true)}
          className="w-full max-w-xs bg-white/10 active:bg-white/20 text-white font-bold text-lg py-4 rounded-2xl transition-colors"
        >
          {t.startGameBtn}
        </button>
      </div>
    )
  }

  // ── Host tap-to-reveal prompt ────────────────────────────────────────────
  if (hostPhase === 'ready') {
    return (
      <div
        className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 text-center cursor-pointer select-none"
        onClick={() => setHostPhase('revealed')}
      >
        <div className="text-7xl mb-6 animate-pulse">❓</div>
        <h2 className="text-white text-3xl font-black mb-3">{t.hostTurnTitle}</h2>
        <p className="text-white/40 text-base mb-10 max-w-xs">{t.hostTurnBody}</p>
        <div className="bg-white/5 border border-white/20 rounded-2xl px-10 py-5 active:bg-white/10 transition-colors">
          <p className="text-white font-bold text-xl">{t.hostRevealBtn}</p>
        </div>
      </div>
    )
  }

  // ── QR display ───────────────────────────────────────────────────────────
  const progress = (currentIndex / numPlayers) * 100

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-8">
      <div className="w-full max-w-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/50 text-sm font-medium uppercase tracking-widest">
            {t.playerOf(currentIndex + 1, numPlayers)}
          </span>
          <span className="text-white/30 text-sm">
            {t.remaining(qrPlayers - currentIndex - 1 + 1)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-sm mb-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-5 py-4 text-center">
        <p className="text-indigo-300 font-semibold text-base">
          {t.scanPrivately(currentIndex + 1)}
        </p>
        <p className="text-white/30 text-sm mt-1">{t.dontShow}</p>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-2xl shadow-black/50 mb-8">
        <QRCodeSVG value={revealURL} size={240} level="M" includeMargin={false} />
      </div>

      <p className="text-white/20 text-xs text-center max-w-xs mb-8">{t.hint}</p>

      <button
        onClick={handleNext}
        className="w-full max-w-sm bg-red-500 active:bg-red-600 text-white font-black text-xl py-5 rounded-2xl tracking-wide transition-colors shadow-lg shadow-red-500/20"
      >
        {isLastQrPlayer ? t.lastNextBtn(currentIndex + 1) : t.nextBtn(currentIndex + 1)}
      </button>

      <button
        onClick={() => navigate('/')}
        className="mt-4 text-white/20 text-sm active:text-white/40"
      >
        {t.startOver}
      </button>
    </div>
  )
}
