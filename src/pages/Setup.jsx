import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategoryNames } from '../data/words.js'
import { generateGame } from '../utils/game.js'

const T = {
  en: {
    tagline: 'Find the spy among you',
    players: 'Players',
    impostors: 'Impostors',
    category: 'Category',
    all: 'All',
    summary: (i, p) => `${i} impostor${i > 1 ? 's' : ''} among ${p} players`,
    start: 'START GAME',
  },
  es: {
    tagline: 'Encuentra al espía entre ustedes',
    players: 'Jugadores',
    impostors: 'Impostores',
    category: 'Categoría',
    all: 'Todas',
    summary: (i, p) => `${i} impostor${i > 1 ? 'es' : ''} entre ${p} jugadores`,
    start: 'INICIAR JUEGO',
  },
}

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
  const [lang, setLang] = useState('en')
  const [numPlayers, setNumPlayers] = useState(6)
  const [numImpostors, setNumImpostors] = useState(1)
  const [category, setCategory] = useState(T.en.all)

  const t = T[lang]
  const categoryNames = getCategoryNames(lang)

  function handleLangChange(newLang) {
    setLang(newLang)
    setCategory(T[newLang].all)
  }

  function handlePlayersChange(val) {
    setNumPlayers(val)
    if (numImpostors >= val) setNumImpostors(Math.max(1, val - 1))
  }

  function startGame() {
    const game = generateGame(numPlayers, numImpostors, category, lang)
    navigate('/host', { state: { game, numPlayers, numImpostors, lang } })
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-5 py-10">
      {/* Title */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-3">🕵️</div>
        <h1 className="text-5xl font-black text-white tracking-tight">
          IMPOS<span className="text-red-500">TOR</span>
        </h1>
        <p className="text-white/40 mt-2 text-sm tracking-widest uppercase">{t.tagline}</p>
      </div>

      {/* Language toggle */}
      <div className="flex gap-2 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1.5">
        {['en', 'es'].map((l) => (
          <button
            key={l}
            onClick={() => handleLangChange(l)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-colors ${
              lang === l
                ? 'bg-indigo-500 text-white'
                : 'text-white/40 active:text-white/60'
            }`}
          >
            <span>{l === 'en' ? '🇺🇸' : '🇲🇽'}</span>
            <span>{l === 'en' ? 'English' : 'Español'}</span>
          </button>
        ))}
      </div>

      {/* Config */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <Stepper label={t.players} value={numPlayers} onChange={handlePlayersChange} min={3} max={20} />
        <Stepper label={t.impostors} value={numImpostors} onChange={(v) => setNumImpostors(v)} min={1} max={Math.floor(numPlayers / 2)} />

        {/* Category */}
        <div className="bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
          <label className="text-white font-semibold text-lg block mb-3">{t.category}</label>
          <div className="flex flex-wrap gap-2">
            {[t.all, ...categoryNames].map((cat) => (
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

        <p className="text-center text-white/40 text-sm mt-1">
          {t.summary(numImpostors, numPlayers)}
        </p>

        <button
          onClick={startGame}
          className="mt-2 w-full bg-red-500 active:bg-red-600 text-white font-black text-xl py-5 rounded-2xl tracking-wide transition-colors shadow-lg shadow-red-500/30"
        >
          {t.start}
        </button>
      </div>
    </div>
  )
}
