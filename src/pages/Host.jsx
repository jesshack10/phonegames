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
    allDoneBtn: 'All done!',
    startOver: '← Start over',
    allReadyTitle: 'All players ready!',
    allReadyBody: 'Everyone has scanned their QR code.',
    allReadyAction: 'Start discussing — find the impostor',
    allReadyActionPlural: 'Start discussing — find the impostors',
    howToPlay: 'How to play',
    howToPlayText: 'Crewmates share clues about the secret word without saying it. Impostors try to blend in. Vote to eliminate who you think is an impostor!',
    newGame: 'New Game',
  },
  es: {
    playerOf: (cur, total) => `Jugador ${cur} de ${total}`,
    remaining: (n) => `${n} restantes`,
    scanPrivately: (n) => `Jugador ${n}, escanea este código QR en privado`,
    dontShow: 'No muestres tu pantalla a los demás',
    hint: 'Escanea con la cámara de tu teléfono • Abre una página con tu rol',
    nextBtn: (n) => `Jugador ${n} listo → Siguiente`,
    allDoneBtn: '¡Todos listos!',
    startOver: '← Volver al inicio',
    allReadyTitle: '¡Todos los jugadores listos!',
    allReadyBody: 'Todos han escaneado su código QR.',
    allReadyAction: 'Empiecen a discutir — ¡encuentren al impostor',
    allReadyActionPlural: 'Empiecen a discutir — ¡encuentren a los impostores',
    howToPlay: 'Cómo jugar',
    howToPlayText: 'Los tripulantes dan pistas sobre la palabra secreta sin decirla. Los impostores intentan pasar desapercibidos. ¡Voten para eliminar a quien crean que es el impostor!',
    newGame: 'Nueva partida',
  },
}

export default function Host() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [allDone, setAllDone] = useState(false)

  if (!state?.game) {
    navigate('/')
    return null
  }

  const { game, numPlayers, numImpostors, lang = 'en' } = state
  const { roles, word } = game
  const t = T[lang]

  const revealURL = buildRevealURL(currentIndex, roles[currentIndex], word, numPlayers, numImpostors, lang)

  function handleNext() {
    if (currentIndex + 1 >= numPlayers) {
      setAllDone(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  if (allDone) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 text-center">
        <div className="text-7xl mb-6">🎮</div>
        <h2 className="text-3xl font-black text-white mb-3">{t.allReadyTitle}</h2>
        <p className="text-white/50 text-base mb-2">{t.allReadyBody}</p>
        <p className="text-white/50 text-base mb-10">
          {numImpostors > 1 ? t.allReadyActionPlural : t.allReadyAction}
          {lang === 'es' ? '!' : '!'}
        </p>

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

  const progress = (currentIndex / numPlayers) * 100

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-8">
      {/* Header */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/50 text-sm font-medium uppercase tracking-widest">
            {t.playerOf(currentIndex + 1, numPlayers)}
          </span>
          <span className="text-white/30 text-sm">
            {t.remaining(numPlayers - currentIndex - 1)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Instruction */}
      <div className="w-full max-w-sm mb-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-5 py-4 text-center">
        <p className="text-indigo-300 font-semibold text-base">
          {t.scanPrivately(currentIndex + 1)}
        </p>
        <p className="text-white/30 text-sm mt-1">{t.dontShow}</p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-5 rounded-3xl shadow-2xl shadow-black/50 mb-8">
        <QRCodeSVG value={revealURL} size={240} level="M" includeMargin={false} />
      </div>

      <p className="text-white/20 text-xs text-center max-w-xs mb-8">{t.hint}</p>

      <button
        onClick={handleNext}
        className="w-full max-w-sm bg-red-500 active:bg-red-600 text-white font-black text-xl py-5 rounded-2xl tracking-wide transition-colors shadow-lg shadow-red-500/20"
      >
        {currentIndex + 1 < numPlayers ? t.nextBtn(currentIndex + 1) : t.allDoneBtn}
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
