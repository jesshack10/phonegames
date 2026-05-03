import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { buildRevealURL } from '../utils/game.js'

export default function Host() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [allDone, setAllDone] = useState(false)

  if (!state?.game) {
    navigate('/')
    return null
  }

  const { game, numPlayers, numImpostors } = state
  const { roles, word } = game

  const revealURL = buildRevealURL(currentIndex, roles[currentIndex], word, numPlayers, numImpostors)

  function handleNext() {
    if (currentIndex + 1 >= numPlayers) {
      setAllDone(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  function handleRestart() {
    navigate('/')
  }

  if (allDone) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 text-center">
        <div className="text-7xl mb-6">🎮</div>
        <h2 className="text-3xl font-black text-white mb-3">All players ready!</h2>
        <p className="text-white/50 text-base mb-2">
          Everyone has scanned their QR code.
        </p>
        <p className="text-white/50 text-base mb-10">
          Start discussing — find the impostor{numImpostors > 1 ? 's' : ''}!
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-10 text-sm text-white/40 max-w-xs">
          <p className="font-semibold text-white/60 mb-1">How to play</p>
          <p>Crewmates share clues about the secret word without saying it. Impostors try to blend in. Vote to eliminate who you think is an impostor!</p>
        </div>

        <button
          onClick={handleRestart}
          className="w-full max-w-xs bg-white/10 active:bg-white/20 text-white font-bold text-lg py-4 rounded-2xl transition-colors"
        >
          New Game
        </button>
      </div>
    )
  }

  const progress = ((currentIndex) / numPlayers) * 100

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-8">
      {/* Header */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/50 text-sm font-medium uppercase tracking-widest">
            Player {currentIndex + 1} of {numPlayers}
          </span>
          <span className="text-white/30 text-sm">
            {numPlayers - currentIndex - 1} remaining
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
          Player {currentIndex + 1}, scan this QR code privately
        </p>
        <p className="text-white/30 text-sm mt-1">
          Don't show your screen to others
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-5 rounded-3xl shadow-2xl shadow-black/50 mb-8">
        <QRCodeSVG
          value={revealURL}
          size={240}
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Hint */}
      <p className="text-white/20 text-xs text-center max-w-xs mb-8">
        Scan with your phone camera • Opens a webpage showing your role
      </p>

      {/* Next button */}
      <button
        onClick={handleNext}
        className="w-full max-w-sm bg-red-500 active:bg-red-600 text-white font-black text-xl py-5 rounded-2xl tracking-wide transition-colors shadow-lg shadow-red-500/20"
      >
        {currentIndex + 1 < numPlayers
          ? `Player ${currentIndex + 1} done → Next`
          : 'All done!'}
      </button>

      {/* Back link */}
      <button
        onClick={handleRestart}
        className="mt-4 text-white/20 text-sm active:text-white/40"
      >
        ← Start over
      </button>
    </div>
  )
}
