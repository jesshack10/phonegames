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
    codePh: 'A B C 1 2 3',
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
    scanQr: 'Scan QR',
    scanTitle: 'Scan QR Code',
    scanHint: 'Point at the QR code on the host\'s screen',
    scanUnsupported: 'QR scanning is not supported on this browser. Type the code manually.',
    scanDenied: 'Camera access denied',
    cancel: 'Cancel',
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
    codePh: 'A B C 1 2 3',
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
    scanQr: 'Escanear QR',
    scanTitle: 'Escanear código QR',
    scanHint: 'Apunta al código QR en la pantalla del anfitrión',
    scanUnsupported: 'Tu navegador no soporta escaneo QR. Escribe el código manualmente.',
    scanDenied: 'Acceso a cámara denegado',
    cancel: 'Cancelar',
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
function CodeInput({ value, onChange, placeholder }) {
  const refs = useRef([])
  const filled = value.length
  const allFilled = filled === 6

  function handleChange(i, e) {
    const raw = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    if (!raw) {
      // Backspace / delete in the onChange path (mobile)
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1))
      } else if (i > 0) {
        refs.current[i - 1]?.focus()
        onChange(value.slice(0, i - 1) + value.slice(i))
      }
      return
    }
    const char = raw.slice(-1)
    const newValue = (value.slice(0, i) + char + value.slice(i + 1)).slice(0, 6)
    onChange(newValue)
    if (i < 5) refs.current[i + 1]?.focus()
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1))
      } else if (i > 0) {
        refs.current[i - 1]?.focus()
        onChange(value.slice(0, i - 1) + value.slice(i))
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs.current[i + 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const raw = e.clipboardData.getData('text').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)
    onChange(raw)
    refs.current[Math.min(raw.length, 5)]?.focus()
  }

  function handleFocus(i) {
    // Redirect to first empty box when code is incomplete
    if (filled < 6 && i > filled) {
      refs.current[filled]?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="text"
          maxLength={2}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder?.[i] ?? '·'}
          className={`w-12 h-14 text-center text-2xl font-mono font-bold rounded-xl border-2 outline-none transition-colors bg-white/10
            ${value[i]
              ? allFilled
                ? 'border-green-400 text-green-300 bg-green-400/10'
                : 'border-indigo-400 text-white'
              : 'border-white/20 text-white/40 placeholder-white/20'}
            focus:border-indigo-400`}
        />
      ))}
    </div>
  )
}

// ── QR scanner modal ────────────────────────────────────────────────────────────
function QrScannerModal({ onScan, onClose, lang }) {
  const t = T[lang]
  const videoRef = useRef(null)
  const [err, setErr] = useState(null)
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    if (!supported) return

    let stopped = false
    let timeoutId = null
    let stream = null
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })

    async function scan() {
      if (stopped || !videoRef.current) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          const raw = barcodes[0].rawValue
          const match = raw.match(/\/impostor\/lobby\/([A-Z0-9]{6})/i)
          const code = (match ? match[1] : raw.replace(/[^A-Z0-9]/gi, '').slice(0, 6)).toUpperCase()
          if (code.length === 6) {
            stop()
            onScan(code)
            return
          }
        }
      } catch {}
      timeoutId = setTimeout(scan, 300)
    }

    function stop() {
      stopped = true
      clearTimeout(timeoutId)
      stream?.getTracks().forEach(t => t.stop())
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        if (stopped) { s.getTracks().forEach(t => t.stop()); return }
        stream = s
        videoRef.current.srcObject = s
        return videoRef.current.play()
      })
      .then(() => { if (!stopped) scan() })
      .catch(() => setErr(t.scanDenied))

    return stop
  }, [supported, onScan, t.scanDenied])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 bg-black/80 shrink-0">
        <p className="text-white font-bold text-lg">{t.scanTitle}</p>
        <button onClick={onClose} className="text-white/60 text-2xl leading-none active:text-white">✕</button>
      </div>

      {!supported ? (
        <div className="flex-1 flex items-center justify-center px-8 text-center">
          <p className="text-white/60 text-sm leading-relaxed">{t.scanUnsupported}</p>
        </div>
      ) : err ? (
        <div className="flex-1 flex items-center justify-center px-8 text-center">
          <p className="text-red-400 text-sm">{err}</p>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
          {/* Dimmed overlay with viewfinder cutout via box-shadow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          </div>
          {/* Corner brackets */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {[['top-0 left-0', 'border-t-[3px] border-l-[3px] rounded-tl-2xl'],
                ['top-0 right-0', 'border-t-[3px] border-r-[3px] rounded-tr-2xl'],
                ['bottom-0 left-0', 'border-b-[3px] border-l-[3px] rounded-bl-2xl'],
                ['bottom-0 right-0', 'border-b-[3px] border-r-[3px] rounded-br-2xl'],
              ].map(([pos, border]) => (
                <div key={pos} className={`absolute ${pos} w-8 h-8 border-white ${border}`} />
              ))}
            </div>
          </div>
          <p className="absolute bottom-8 left-0 right-0 text-center text-white/60 text-sm px-8">
            {t.scanHint}
          </p>
        </div>
      )}

      <div className="px-5 py-4 shrink-0">
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-white/10 active:bg-white/20 text-white font-bold transition-colors"
        >
          {t.cancel}
        </button>
      </div>
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
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const t = T[lang]
  const categoryNames = getCategoryNames(lang)

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
    if (code.trim().length !== 6) return setError(t.errCodeLen)
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

  function handleScanSuccess(scannedCode) {
    setCode(scannedCode)
    setShowScanner(false)
    setStep('join')
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
    <>
      {showScanner && (
        <QrScannerModal
          onScan={handleScanSuccess}
          onClose={() => setShowScanner(false)}
          lang={lang}
        />
      )}

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
            <CodeInput value={code} onChange={v => { setCode(v); setError('') }} placeholder="ABCDEF" />

            <div className="flex gap-2">
              <button
                onClick={handleInitiateJoin}
                disabled={code.trim().length !== 6}
                className="flex-1 py-4 rounded-xl bg-white/10 active:bg-white/20 text-white font-bold text-base disabled:opacity-30 transition-colors"
              >
                {t.joinBtn}
              </button>
              <button
                onClick={() => setShowScanner(true)}
                className="w-14 h-14 flex items-center justify-center rounded-xl bg-white/10 active:bg-white/20 text-2xl transition-colors"
                title={t.scanQr}
              >
                📷
              </button>
            </div>
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
    </>
  )
}
