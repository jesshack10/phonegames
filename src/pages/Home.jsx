import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { lookupSessionGame } from '../firebase/session.js'

export default function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return setError('Escribe un código')
    if (normalized.length !== 6) return setError('El código debe tener 6 caracteres')
    setJoining(true)
    setError('')
    try {
      const { meta, game } = await lookupSessionGame(normalized)
      if (!meta) {
        setError('Sesión no encontrada')
        return
      }
      navigate(`/${game}/lobby/${normalized}`)
    } catch (e) {
      console.error('lookupSessionGame failed:', e)
      setError('Error al buscar la sesión')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center gap-6 px-6 py-10">
      <h1 className="text-4xl font-bold text-white tracking-widest mb-4">PHONE GAMES</h1>

      <button
        onClick={() => navigate('/impostor')}
        className="w-full max-w-xs py-6 rounded-2xl bg-gradient-to-br from-violet-700 to-violet-900 border border-violet-500 text-white text-2xl font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
      >
        👾 Impostor
      </button>

      <button
        onClick={() => navigate('/werewolf/setup')}
        className="w-full max-w-xs py-6 rounded-2xl bg-gradient-to-br from-red-800 to-red-950 border border-red-600 text-white text-2xl font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
      >
        🐺 Werewolf
      </button>

      <button
        onClick={() => navigate('/peticiones')}
        className="w-full max-w-xs py-6 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-950 border border-blue-500 text-white text-2xl font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
      >
        🙏 Peticiones
      </button>

      {/* Join with session code */}
      <div className="w-full max-w-xs flex flex-col gap-3 mt-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <p className="text-white/30 text-xs uppercase tracking-widest">o únete</p>
          <div className="flex-1 h-px bg-white/10" />
        </div>
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
            disabled={joining || code.trim().length !== 6}
            className="px-5 py-3 rounded-xl bg-white/10 active:bg-white/20 text-white font-bold disabled:opacity-30 transition-colors"
          >
            {joining ? '…' : 'Unirme →'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  )
}
