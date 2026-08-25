import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategoryNames } from '../../data/words.js'
import {
  createImpostorSession,
  joinImpostorPlayer,
  lookupSessionGame,
  SESSION_TTL,
  deleteSession,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'

const SETTINGS_KEY = 'imp_settings'

const T = {
  en: {
    tagline: 'Find the spy among you',
    yourName: 'Your name',
    namePlaceholder: 'Enter your name…',
    impostors: 'Impostors',
    category: 'Category',
    all: 'All',
    createBtn: 'Create Game →',
    connecting: 'Connecting…',
    creating: 'Creating…',
    errName: 'Enter your name',
    errFailed: 'Failed to create game. Try again.',
    orCreate: 'or create a new game',
    joinBtn: 'Join →',
    joining: 'Joining…',
    errCodeLen: 'Code must be 6 characters',
    errNotFound: 'Session not found',
    errWrongGame: 'That code is not an Impostor game',
    errExpired: 'Session expired',
    errStarted: 'Game already started',
    errJoinFailed: 'Failed to join',
    joiningCode: (code) => `Joining · ${code}`,
    newGame: 'New game',
    back: '← Back',
  },
  es: {
    tagline: 'Encuentra al espía entre ustedes',
    yourName: 'Tu nombre',
    namePlaceholder: 'Escribe tu nombre…',
    impostors: 'Impostores',
    category: 'Categoría',
    all: 'Todas',
    createBtn: 'Crear partida →',
    connecting: 'Conectando…',
    creating: 'Creando…',
    errName: 'Escribe tu nombre',
    errFailed: 'Error al crear la partida. Intenta de nuevo.',
    orCreate: 'o crea una nueva partida',
    joinBtn: 'Unirme →',
    joining: 'Uniéndose…',
    errCodeLen: 'El código debe tener 6 caracteres',
    errNotFound: 'Sesión no encontrada',
    errWrongGame: 'Ese código no es de Impostor',
    errExpired: 'Sesión expirada',
    errStarted: 'El juego ya comenzó',
    errJoinFailed: 'Error al unirte',
    joiningCode: (code) => `Uniéndose · ${code}`,
    newGame: 'Nueva partida',
    back: '← Atrás',
  },
}

// ── Stepper ────────────────────────────────────────────────────────────────────
function Stepper({ label, value, onChange, min, max }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
      <span className="text-white font-semibold text-lg">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-full bg-white/10 text-white text-xl font-bold flex items-center justify-center disabled:opacity-30 active:bg-white/20 transition-colors"
        >−</button>
        <span className="text-white text-2xl font-bold w-8 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-full bg-white/10 text-white text-xl font-bold flex items-center justify-center disabled:opacity-30 active:bg-white/20 transition-colors"
        >+</button>
      </div>
    </div>
  )
}

// ── OTP code input ─────────────────────────────────────────────────────────────
// Uses a single hidden text input as the source of truth so there is no
// multi-input focus juggling. The 6 visual boxes are purely display.
function CodeInput({ value, onChange }) {
  const inputRef = useRef(null)
  const filled = value.length
  const allFilled = filled === 6

  function handleChange(e) {
    const raw = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)
    onChange(raw)
  }

  return (
    <div
      className="relative flex gap-2 justify-center"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Visual character boxes */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className={`w-12 h-14 flex items-center justify-center text-2xl font-mono font-bold rounded-xl border-2 select-none transition-colors
            ${allFilled
              ? 'border-green-400 text-green-300 bg-green-400/10'
              : value[i]
                ? 'border-indigo-400 text-white bg-white/10'
                : i === filled
                  ? 'border-indigo-400/50 bg-white/5 text-white'
                  : 'border-white/20 bg-white/5 text-white/20'
            }`}
        >
          {value[i] ?? ''}
        </div>
      ))}

      {/* Hidden input — covers the whole row so any tap on it triggers the keyboard */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
        style={{ caretColor: 'transparent' }}
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ImpostorSetup() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [lang, setLang] = useState('es')
  const [numImpostors, setNumImpostors] = useState(1)
  const [category, setCategory] = useState('Todas')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState(null) // null | 'join' | 'create'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const t = T[lang]
  const categoryNames = getCategoryNames(lang)
  const codeReady = code.length === 6

  // Load last-used settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (!saved) return
    try {
      const { numImpostors: n, category: c, lang: l } = JSON.parse(saved)
      if (l && T[l]) {
        setLang(l)
        setNumImpostors(n ?? 1)
        setCategory(c ?? T[l].all)
      } else {
        if (n) setNumImpostors(n)
        if (c) setCategory(c)
      }
    } catch {}
  }, [])

  function handleLangChange(l) {
    setLang(l)
    setCategory(T[l].all)
  }

  function handleInitiateJoin() {
    if (!codeReady) return setError(t.errCodeLen)
    setError('')
    setStep('join')
  }

  function handleInitiateCreate() {
    setError('')
    setStep('create')
  }

  function handleBack() {
    setStep(null)
    setName('')
    setError('')
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return setError(t.errName)
    if (!uid || loading) return
    setLoading(true)
    setError('')
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ numImpostors, category, lang }))
      const sessionId = await createImpostorSession(uid, { numImpostors, category, lang })
      await joinImpostorPlayer(sessionId, uid, trimmed, true)
      localStorage.setItem(`imp_${sessionId}`, JSON.stringify({ uid, name: trimmed }))
      navigate(`/impostor/host/${sessionId}`)
    } catch {
      setError(t.errFailed)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed) return setError(t.errName)
    if (!uid || loading) return
    setLoading(true)
    setError('')
    try {
      const { meta, game } = await lookupSessionGame(code)
      if (!meta) { setError(t.errNotFound); return }
      if (game !== 'impostor') { setError(t.errWrongGame); return }
      if (Date.now() - meta.createdAt > SESSION_TTL) {
        await deleteSession(code)
        setError(t.errExpired)
        return
      }
      if (meta.phase !== 'lobby') { setError(t.errStarted); return }
      await joinImpostorPlayer(code, uid, trimmed, false)
      localStorage.setItem(`imp_${code}`, JSON.stringify({ uid, name: trimmed }))
      navigate(`/impostor/lobby/${code}`, { replace: true })
    } catch (e) {
      console.error('join failed:', e)
      setError(`${t.errJoinFailed}: ${e?.code || e?.message || ''}`)
    } finally {
      setLoading(false)
    }
  }

  // ── Name step ──────────────────────────────────────────────────────────────
  if (step === 'join' || step === 'create') {
    const isJoin = step === 'join'
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-8 gap-5">
        <button onClick={handleBack} className="text-white/40 text-sm self-start">
          {t.back}
        </button>

        <div className="text-center mt-8">
          <div className="text-6xl mb-3">🕵️</div>
          <p className="text-white/40 text-sm tracking-widest uppercase font-mono">
            {isJoin ? t.joiningCode(code) : t.newGame}
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3 mt-4">
          <div className="bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
            <label className="text-white font-semibold text-lg block mb-3">{t.yourName}</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && (isJoin ? handleJoin() : handleCreate())}
              placeholder={t.namePlaceholder}
              maxLength={16}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-indigo-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={isJoin ? handleJoin : handleCreate}
            disabled={!name.trim() || loading || !ready}
            className="mt-2 w-full bg-red-500 active:bg-red-600 text-white font-black text-xl py-5 rounded-2xl tracking-wide transition-colors shadow-lg shadow-red-500/30 disabled:opacity-40"
          >
            {loading
              ? (isJoin ? t.joining : t.creating)
              : (isJoin ? t.joinBtn : t.createBtn)}
          </button>
        </div>
      </div>
    )
  }

  // ── Main screen ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-8 gap-5">
      <button onClick={() => navigate('/')} className="text-white/40 text-sm self-start">
        ← {lang === 'es' ? 'Atrás' : 'Back'}
      </button>

      <div className="text-center">
        <div className="text-6xl mb-3">🕵️</div>
        <h1 className="text-5xl font-black text-white tracking-tight">
          IMPOS<span className="text-red-500">TOR</span>
        </h1>
        <p className="text-white/40 mt-2 text-sm tracking-widest uppercase">{t.tagline}</p>
      </div>

      {/* Language toggle */}
      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5">
        {['en', 'es'].map(l => (
          <button
            key={l}
            onClick={() => handleLangChange(l)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-colors ${
              lang === l ? 'bg-indigo-500 text-white' : 'text-white/40 active:text-white/60'
            }`}
          >
            <span>{l === 'en' ? '🇺🇸' : '🇲🇽'}</span>
            <span>{l === 'en' ? 'English' : 'Español'}</span>
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* Join section */}
        <div className="flex flex-col gap-2">
          <CodeInput value={code} onChange={v => { setCode(v); setError('') }} />

          <button
            onClick={handleInitiateJoin}
            disabled={!codeReady}
            className={`w-full py-4 rounded-xl font-bold text-base transition-colors ${
              codeReady
                ? 'bg-green-500 active:bg-green-600 text-white shadow-lg shadow-green-500/20'
                : 'bg-white/10 text-white/40'
            }`}
          >
            {t.joinBtn}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* Divider */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px bg-white/10" />
          <p className="text-white/30 text-xs uppercase tracking-widest">{t.orCreate}</p>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Stepper label={t.impostors} value={numImpostors} onChange={setNumImpostors} min={1} max={5} />

        <div className="bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
          <label className="text-white font-semibold text-lg block mb-3">{t.category}</label>
          <div className="flex flex-wrap gap-2">
            {[t.all, ...categoryNames].map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === cat ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60 active:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleInitiateCreate}
          disabled={loading || !ready}
          className="mt-2 w-full bg-red-500 active:bg-red-600 text-white font-black text-xl py-5 rounded-2xl tracking-wide transition-colors shadow-lg shadow-red-500/30 disabled:opacity-40"
        >
          {!ready ? t.connecting : t.createBtn}
        </button>
      </div>
    </div>
  )
}
