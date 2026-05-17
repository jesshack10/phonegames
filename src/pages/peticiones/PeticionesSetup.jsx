import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createPeticionesSession,
  joinPeticionesPlayer,
  lookupSessionGame,
  SESSION_TTL,
  deleteSession,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'

function CodeInput({ value, onChange }) {
  const inputRef = useRef(null)
  const filled = value.length
  const allFilled = filled === 6
  return (
    <div className="relative flex gap-2 justify-center" onClick={() => inputRef.current?.focus()}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={`w-12 h-14 flex items-center justify-center text-2xl font-mono font-bold rounded-xl border-2 select-none transition-colors
          ${allFilled ? 'border-green-400 text-green-300 bg-green-400/10' : value[i] ? 'border-blue-400 text-white bg-white/10' : i === filled ? 'border-blue-400/50 bg-white/5 text-white' : 'border-white/20 bg-white/5 text-white/20'}`}>
          {value[i] ?? ''}
        </div>
      ))}
      <input ref={inputRef} type="text" value={value} onChange={e => onChange(e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6))} maxLength={6} autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} className="absolute inset-0 w-full h-full opacity-0 cursor-text" style={{ caretColor: 'transparent' }} />
    </div>
  )
}

export default function PeticionesSetup() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const codeReady = code.length === 6
  const noFirebase = ready && !uid

  function handleInitiateJoin() {
    if (!codeReady) return setError('El código debe tener 6 caracteres')
    setError('')
    setStep('join')
  }

  function handleInitiateCreate() { setError(''); setStep('create') }
  function handleBack() { setStep(null); setName(''); setError('') }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Escribe tu nombre')
    if (trimmed.length > 24) return setError('Nombre muy largo (máx 24)')
    if (!uid) return setError('Firebase no configurado — agrega los secrets en GitHub Actions')
    if (loading) return
    setLoading(true); setError('')
    try {
      const sessionId = await createPeticionesSession(uid)
      await joinPeticionesPlayer(sessionId, uid, trimmed)
      localStorage.setItem(`pet_${sessionId}`, JSON.stringify({ uid, name: trimmed }))
      navigate(`/peticiones/host/${sessionId}`, { replace: true })
    } catch { setError('Error al crear la sesión. Intenta de nuevo.') }
    finally { setLoading(false) }
  }

  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Escribe tu nombre')
    if (trimmed.length > 24) return setError('Nombre muy largo (máx 24)')
    if (!uid) return setError('Firebase no configurado — agrega los secrets en GitHub Actions')
    if (loading) return
    setLoading(true); setError('')
    try {
      const { meta, game } = await lookupSessionGame(code)
      if (!meta) { setError('Sesión no encontrada'); return }
      if (game !== 'peticiones') { setError('Ese código no es de Peticiones'); return }
      if (Date.now() - meta.createdAt > SESSION_TTL) { await deleteSession(code); setError('Sesión expirada'); return }
      await joinPeticionesPlayer(code, uid, trimmed)
      localStorage.setItem(`pet_${code}`, JSON.stringify({ uid, name: trimmed }))
      navigate(`/peticiones/lobby/${code}`, { replace: true })
    } catch (e) { setError(`Error al unirte: ${e?.code || e?.message || 'desconocido'}`) }
    finally { setLoading(false) }
  }

  if (step === 'join' || step === 'create') {
    const isJoin = step === 'join'
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-6">
        <button onClick={handleBack} className="text-white/40 text-sm self-start">← Atrás</button>
        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="text-7xl">🙏</div>
          <p className="text-white/40 text-sm tracking-widest uppercase font-mono">{isJoin ? `Uniéndose · ${code}` : 'Nueva sesión'}</p>
        </div>
        <div className="w-full max-w-sm flex flex-col gap-4 mt-2">
          <input type="text" placeholder="Tu nombre…" value={name} onChange={e => { setName(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && (isJoin ? handleJoin() : handleCreate())} maxLength={24} autoFocus className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-blue-500" />
          {noFirebase && (
            <p className="text-amber-400 text-sm text-center">⚠ Firebase no configurado — agrega los secrets en GitHub Actions</p>
          )}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button onClick={isJoin ? handleJoin : handleCreate} disabled={!name.trim() || loading || !ready || !uid} className="w-full py-5 rounded-2xl bg-blue-500 active:bg-blue-600 text-white font-black text-xl tracking-wide shadow-lg shadow-blue-500/20 disabled:opacity-40 transition-colors">
            {!ready ? 'Conectando…' : !uid ? 'Firebase no configurado' : loading ? (isJoin ? 'Uniéndose…' : 'Creando…') : (isJoin ? 'Unirme →' : 'Crear sesión →')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-6">
      <button onClick={() => navigate('/')} className="text-white/40 text-sm self-start">← Atrás</button>
      <div className="flex flex-col items-center gap-3">
        <div className="text-7xl">🙏</div>
        <h1 className="text-white text-4xl font-black tracking-tight text-center">PETI<span className="text-blue-400">CIONES</span></h1>
      </div>
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-white/40 text-xs uppercase tracking-widest text-center">Únete con código</p>
          <CodeInput value={code} onChange={v => { setCode(v); setError('') }} />
          <button onClick={handleInitiateJoin} disabled={!codeReady} className={`w-full py-4 rounded-xl font-bold text-base transition-colors ${codeReady ? 'bg-green-500 active:bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-white/10 text-white/40'}`}>Unirme →</button>
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <div className="flex items-center gap-3"><div className="flex-1 h-px bg-white/10" /><p className="text-white/30 text-xs uppercase tracking-widest">o crea una nueva sesión</p><div className="flex-1 h-px bg-white/10" /></div>
        <button onClick={handleInitiateCreate} disabled={loading || !ready || !uid} className="w-full py-5 rounded-2xl bg-blue-500 active:bg-blue-600 text-white font-black text-xl tracking-wide shadow-lg shadow-blue-500/20 disabled:opacity-40 transition-colors">
          {!ready ? 'Conectando…' : !uid ? 'Firebase no configurado' : 'Crear sesión →'}
        </button>
      </div>
    </div>
  )
}
