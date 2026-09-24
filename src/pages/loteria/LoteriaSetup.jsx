import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createLoteriaSession,
  joinLoteriaPlayer,
  lookupSessionGame,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'
import { PATTERNS, PATTERN_KEYS } from '../../utils/loteria.js'
import { DECKS, DECK_IDS, DEFAULT_DECK } from '../../data/decks/index.js'

const SETTINGS_KEY = 'loteria_settings'

const AUTH_PENDING = 'Aún conectando con el servidor. Espera un momento y vuelve a intentar.'

// Firebase errors carry the useful part in `code`; without it a failed write
// shows up as a bare "no se pudo" and there is nothing left to diagnose with.
function describe(e) {
  return e?.code || e?.message || 'error desconocido'
}

// ── Entrada del código — input oculto + 6 casillas visuales ──────────────────
function CodeInput({ value, onChange }) {
  const inputRef = useRef(null)
  const filled = value.length
  const allFilled = filled === 6

  return (
    <div
      className="relative flex gap-2 justify-center"
      onClick={() => inputRef.current?.focus()}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className={`w-12 h-14 flex items-center justify-center text-2xl font-mono font-bold rounded-xl border-2 select-none transition-colors
            ${allFilled
              ? 'border-green-400 text-green-300 bg-green-400/10'
              : value[i]
                ? 'border-amber-400 text-white bg-white/10'
                : i === filled
                  ? 'border-amber-400/50 bg-white/5 text-white'
                  : 'border-white/20 bg-white/5 text-white/20'
            }`}
        >
          {value[i] ?? ''}
        </div>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6))}
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

export default function LoteriaSetup() {
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [patterns, setPatterns] = useState(['full'])
  const [deck, setDeck] = useState(DEFAULT_DECK)
  const [step, setStep] = useState(null) // null | 'join' | 'create'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const codeReady = code.length === 6

  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (!saved) return
    try {
      const { patterns: p, deck: d } = JSON.parse(saved)
      if (Array.isArray(p) && p.length) setPatterns(p)
      if (d && DECKS[d]) setDeck(d)
    } catch {}
  }, [])

  function togglePattern(key) {
    setPatterns(prev =>
      prev.includes(key)
        ? (prev.length === 1 ? prev : prev.filter(k => k !== key)) // siempre queda uno
        : [...prev, key]
    )
  }

  function handleInitiateJoin() {
    if (!codeReady) return setError('El código debe tener 6 caracteres')
    setError('')
    setStep('join')
  }

  function handleBack() {
    setStep(null)
    setName('')
    setError('')
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Escribe tu nombre')
    if (loading) return
    if (!uid) return setError(AUTH_PENDING)
    setLoading(true)
    setError('')
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ patterns, deck }))
      const ordered = PATTERN_KEYS.filter(k => patterns.includes(k))
      const sessionId = await createLoteriaSession(uid, { patterns: ordered, deck })
      await joinLoteriaPlayer(sessionId, uid, trimmed, true)
      localStorage.setItem(`lot_${sessionId}`, JSON.stringify({ uid, name: trimmed }))
      navigate(`/loteria/moderador/${sessionId}`)
    } catch (e) {
      console.error('crear sala falló:', e)
      setError(`No se pudo crear la sala: ${describe(e)}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Escribe tu nombre')
    if (loading) return
    if (!uid) return setError(AUTH_PENDING)
    setLoading(true)
    setError('')
    try {
      const { meta, game } = await lookupSessionGame(code)
      if (!meta) { setError('Sala no encontrada'); return }
      if (game !== 'loteria') { setError('Ese código no es de Lotería'); return }
      if (Date.now() - meta.createdAt > SESSION_TTL) {
        await deleteSession(code)
        setError('La sala expiró')
        return
      }
      if (meta.phase !== 'lobby') { setError('La partida ya comenzó') ; return }
      await joinLoteriaPlayer(code, uid, trimmed, false)
      localStorage.setItem(`lot_${code}`, JSON.stringify({ uid, name: trimmed }))
      navigate(`/loteria/sala/${code}`, { replace: true })
    } catch (e) {
      console.error('unirse falló:', e)
      setError(`Error al unirte: ${describe(e)}`)
    } finally {
      setLoading(false)
    }
  }

  // ── Paso del nombre ────────────────────────────────────────────────────────
  if (step === 'join' || step === 'create') {
    const isJoin = step === 'join'
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-8 gap-5">
        <button onClick={handleBack} className="text-white/40 text-sm self-start">← Atrás</button>

        <div className="text-center mt-8">
          <div className="text-6xl mb-3">🃏</div>
          <p className="text-white/40 text-sm tracking-widest uppercase font-mono">
            {isJoin ? `Uniéndose · ${code}` : 'Nueva sala'}
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3 mt-4">
          <div className="bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
            <label className="text-white font-semibold text-lg block mb-3">Tu nombre</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && (isJoin ? handleJoin() : handleCreate())}
              placeholder="Escribe tu nombre…"
              maxLength={16}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-amber-500"
            />
          </div>

          {!isJoin && (
            <p className="text-white/40 text-sm text-center px-4">
              Tú cantas las cartas. No juegas con tabla.
            </p>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={isJoin ? handleJoin : handleCreate}
            disabled={!name.trim() || loading || !uid}
            className="mt-2 w-full bg-amber-500 active:bg-amber-600 text-white font-black text-xl py-5 rounded-2xl tracking-wide transition-colors shadow-lg shadow-amber-500/30 disabled:opacity-40"
          >
            {!uid
              ? 'Conectando…'
              : loading
                ? (isJoin ? 'Uniéndose…' : 'Creando…')
                : (isJoin ? 'Unirme →' : 'Crear sala →')}
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla principal ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-8 gap-5">
      <button onClick={() => navigate('/')} className="text-white/40 text-sm self-start">← Atrás</button>

      <div className="text-center">
        <div className="text-6xl mb-3">🃏</div>
        <h1 className="text-5xl font-black text-white tracking-tight">
          LOTE<span className="text-amber-500">RÍA</span>
        </h1>
        <p className="text-white/40 mt-2 text-sm tracking-widest uppercase">Lotería mexicana</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* Unirse */}
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
          Unirme →
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px bg-white/10" />
          <p className="text-white/30 text-xs uppercase tracking-widest">o crea una sala</p>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Baraja */}
        <div className="bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
          <p className="text-white font-semibold text-lg mb-1">¿Con qué baraja?</p>
          <p className="text-white/40 text-xs mb-3">{DECKS[deck].tagline}</p>
          <div className="flex flex-wrap gap-2">
            {DECK_IDS.map(id => (
              <button
                key={id}
                onClick={() => setDeck(id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  deck === id ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60 active:bg-white/20'
                }`}
              >
                {DECKS[id].emoji} {DECKS[id].name}
              </button>
            ))}
          </div>
        </div>

        {/* Patrones ganadores */}
        <div className="bg-white/5 rounded-2xl px-5 py-4 border border-white/10">
          <p className="text-white font-semibold text-lg mb-1">¿Cómo se gana?</p>
          <p className="text-white/40 text-xs mb-3">Gana quien complete cualquiera de los elegidos</p>
          <div className="flex flex-wrap gap-2">
            {PATTERN_KEYS.map(key => (
              <button
                key={key}
                onClick={() => togglePattern(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  patterns.includes(key)
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/10 text-white/60 active:bg-white/20'
                }`}
              >
                {PATTERNS[key].label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setError(''); setStep('create') }}
          disabled={loading || !uid}
          className="mt-2 w-full bg-amber-500 active:bg-amber-600 text-white font-black text-xl py-5 rounded-2xl tracking-wide transition-colors shadow-lg shadow-amber-500/30 disabled:opacity-40"
        >
          {!uid ? 'Conectando…' : 'Crear sala'}
        </button>
      </div>
    </div>
  )
}
