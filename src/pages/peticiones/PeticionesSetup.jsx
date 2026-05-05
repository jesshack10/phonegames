import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createPeticionesSession,
  joinPeticionesPlayer,
  lookupSessionGame,
  SESSION_TTL,
  deleteSession,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'

export default function PeticionesSetup() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  function validateName() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Escribe tu nombre'); return null }
    if (trimmed.length > 24) { setError('Nombre muy largo (máx 24)'); return null }
    return trimmed
  }

  async function handleCreate() {
    const trimmed = validateName()
    if (!trimmed || !uid || creating || joining) return
    setCreating(true)
    setError('')
    try {
      const sessionId = await createPeticionesSession(uid)
      await joinPeticionesPlayer(sessionId, uid, trimmed)
      localStorage.setItem(`pet_${sessionId}`, JSON.stringify({ uid, name: trimmed }))
      navigate(`/peticiones/host/${sessionId}`, { replace: true })
    } catch {
      setError('Error al crear la sesión. Intenta de nuevo.')
      setCreating(false)
    }
  }

  async function handleJoin() {
    const trimmed = validateName()
    if (!trimmed) return
    const normalizedCode = code.trim().toUpperCase()
    if (normalizedCode.length !== 6) return setError('El código debe tener 6 caracteres')
    if (!uid || creating || joining) return

    setJoining(true)
    setError('')
    try {
      const { meta, game } = await lookupSessionGame(normalizedCode)
      if (!meta) {
        setError('Sesión no encontrada')
        return
      }
      if (game !== 'peticiones') {
        setError('Ese código no es de Peticiones')
        return
      }
      if (Date.now() - meta.createdAt > SESSION_TTL) {
        await deleteSession(normalizedCode)
        setError('Sesión expirada')
        return
      }
      await joinPeticionesPlayer(normalizedCode, uid, trimmed)
      localStorage.setItem(`pet_${normalizedCode}`, JSON.stringify({ uid, name: trimmed }))
      navigate(`/peticiones/lobby/${normalizedCode}`, { replace: true })
    } catch (e) {
      console.error('join failed:', e)
      setError(`Error al unirte: ${e?.code || e?.message || 'desconocido'}`)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-6">
      <button
        onClick={() => navigate('/')}
        className="text-white/40 text-sm self-start"
      >
        ← Atrás
      </button>

      <div className="flex flex-col items-center gap-3">
        <div className="text-7xl">🙏</div>
        <h1 className="text-white text-4xl font-black tracking-tight text-center">
          PETI<span className="text-blue-400">CIONES</span>
        </h1>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-5">
        <input
          type="text"
          placeholder="Tu nombre…"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          maxLength={24}
          className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-blue-500"
        />

        {/* Create section */}
        <div className="flex flex-col gap-2">
          <p className="text-white/40 text-xs uppercase tracking-widest">Empieza una sesión</p>
          <button
            onClick={handleCreate}
            disabled={!ready || !uid || !name.trim() || creating || joining}
            className="w-full py-5 rounded-2xl bg-blue-500 active:bg-blue-600 text-white font-black text-xl tracking-wide shadow-lg shadow-blue-500/20 disabled:opacity-40 transition-colors"
          >
            {!ready ? 'Conectando…' : creating ? 'Creando…' : 'Crear sesión →'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <p className="text-white/30 text-xs uppercase tracking-widest">o únete a una existente</p>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Join section */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="CÓDIGO"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center text-lg font-mono font-bold tracking-widest placeholder-white/30 outline-none focus:border-white/40"
            />
            <button
              onClick={handleJoin}
              disabled={!ready || !uid || !name.trim() || code.trim().length !== 6 || creating || joining}
              className="px-5 py-3 rounded-xl bg-white/10 active:bg-white/20 text-white font-bold disabled:opacity-30 transition-colors"
            >
              {joining ? '…' : 'Unirme →'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  )
}
