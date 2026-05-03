import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { decodeRevealData } from '../utils/game.js'

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

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-white text-xl font-bold mb-2">Invalid QR code</h2>
        <p className="text-white/40 text-sm">Ask the host to regenerate the QR code.</p>
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

  // Pre-reveal tap screen
  if (!revealed) {
    return (
      <div
        className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 text-center cursor-pointer select-none"
        onClick={() => setRevealed(true)}
      >
        <div className="text-7xl mb-6 animate-pulse">❓</div>
        <h2 className="text-white text-3xl font-black mb-3">
          Player {data.playerNum}
        </h2>
        <p className="text-white/40 text-base mb-10">
          Make sure nobody else can see your screen
        </p>
        <div className="bg-white/5 border border-white/20 rounded-2xl px-10 py-5 active:bg-white/10 transition-colors">
          <p className="text-white font-bold text-xl">Tap to reveal your role</p>
        </div>
        <p className="text-white/20 text-xs mt-8">
          Game: {data.totalPlayers} players · {data.numImpostors} impostor{data.numImpostors > 1 ? 's' : ''}
        </p>
      </div>
    )
  }

  // Impostor reveal
  if (isImpostor) {
    return (
      <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center px-5 text-center">
        <div className="text-7xl mb-6">🕵️</div>
        <div className="bg-red-500/20 border border-red-500/30 rounded-3xl px-8 py-8 max-w-xs w-full mb-8">
          <p className="text-red-300 text-sm font-semibold uppercase tracking-widest mb-3">
            Your role
          </p>
          <h1 className="text-4xl font-black text-red-400 mb-1">IMPOSTOR</h1>
          <p className="text-red-300/60 text-sm mt-3">
            You don't know the secret word. Blend in, don't get caught!
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 max-w-xs w-full text-left">
          <p className="text-white/60 text-sm font-semibold mb-2">Your mission</p>
          <ul className="text-white/40 text-sm space-y-1.5 list-none">
            <li>• Listen carefully to crewmates' clues</li>
            <li>• Give vague answers to blend in</li>
            <li>• Try to guess the secret word</li>
            <li>• Avoid being voted out</li>
          </ul>
        </div>

        <p className="text-red-900 text-xs mt-8">
          Close this page before passing the phone
        </p>
      </div>
    )
  }

  // Crewmate reveal
  return (
    <div className="min-h-screen bg-[#071a0f] flex flex-col items-center justify-center px-5 text-center">
      <div className="text-7xl mb-6">✅</div>
      <div className="bg-green-500/20 border border-green-500/30 rounded-3xl px-8 py-8 max-w-xs w-full mb-8">
        <p className="text-green-300 text-sm font-semibold uppercase tracking-widest mb-3">
          Your role
        </p>
        <h1 className="text-4xl font-black text-green-400 mb-4">CREWMATE</h1>
        <div className="bg-white/10 rounded-2xl px-6 py-4">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Secret word</p>
          <p className="text-white text-3xl font-black capitalize">{data.word}</p>
        </div>
        <p className="text-green-300/60 text-sm mt-4">
          Everyone except the impostor{data.numImpostors > 1 ? 's' : ''} has this word.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 max-w-xs w-full text-left">
        <p className="text-white/60 text-sm font-semibold mb-2">Your mission</p>
        <ul className="text-white/40 text-sm space-y-1.5">
          <li>• Give clues that prove you know the word</li>
          <li>• Don't say the word directly!</li>
          <li>• Watch for players who seem lost</li>
          <li>• Vote out the impostor{data.numImpostors > 1 ? 's' : ''}</li>
        </ul>
      </div>

      <p className="text-green-950 text-xs mt-8">
        Close this page before passing the phone
      </p>
    </div>
  )
}
