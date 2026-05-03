import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALL_CATEGORIES } from '../data/words.js'
import { generateGame } from '../utils/game.js'

function Stepper({ label, value, onChange, min, max }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
      <span className="text-white font-semibold text-lg">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-full bg-white/10 text-white text-xl font-bold flex items-center justify-center disabled:opacity-30 active:bg-white/20 transition-colors"
        >
          −
        </button>
        <span className="text-white text-2xl font-bold w-8 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-full bg-white/10 text-white text-xl font-bold flex items-center justify-center disabled:opacity-30 active:bg-white/20 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function Setup() {
  const navigate = useNavigate()
  const [numPlayers, setNumPlayers] = useState(6)
  const [numImpostors, setNumImpostors] = useState(1)
  const [category, setCategory] = useState('All')

  function handlePlayersChange(val) {
    setNumPlayers(val)
    if (numImpostors >= val) setNumImpostors(Math.max(1, val - 1))
  }

  function handleImpostorsChange(val) {
    setNumImpostors(val)
  }

  function startGame() {
    const game = generateGame(numPlayers, numImpostors, category)
    navigate('/host', { state: { game, numPlayers, numImpostors } })
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 py-10">
      {/* Title */}
      <div className="mb-10 text-center">
        <div className="text-6xl mb-3">🕵️</div>
        <h1 className="text-5xl font-black text-white tracking-tight">
          IMPOS<span className="text-red-500">TOR</span>
        </h1>
        <p className="text-white/40 mt-2 text-sm tracking-widest uppercase">Find the spy among you</p>
      </div>

      {/* Config */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <Stepper
          label="Players"
          value={numPlayers}
          onChange={handlePlayersChange}
          min={3}
          max={20}
        />
        <Stepper
          label="Impostors"
          value={numImpostors}
          onChange={handleImpostorsChange}
          min={1}
          max={Math.floor(numPlayers / 2)}
        />

        {/* Category */}
        <div className="bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
          <label className="text-white font-semibold text-lg block mb-3">Category</label>
          <div className="flex flex-wrap gap-2">
            {['All', ...ALL_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === cat
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-white/60 active:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <p className="text-center text-white/40 text-sm mt-1">
          {numImpostors} impostor{numImpostors > 1 ? 's' : ''} among {numPlayers} players
        </p>

        {/* Start */}
        <button
          onClick={startGame}
          className="mt-2 w-full bg-red-500 active:bg-red-600 text-white font-black text-xl py-5 rounded-2xl tracking-wide transition-colors shadow-lg shadow-red-500/30"
        >
          START GAME
        </button>
      </div>
    </div>
  )
}
