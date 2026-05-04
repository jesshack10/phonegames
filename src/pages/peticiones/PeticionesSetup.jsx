import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPeticionesSession } from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'

export default function PeticionesSetup() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!uid || loading) return
    setLoading(true)
    setError('')
    try {
      const sessionId = await createPeticionesSession(uid)
      navigate(`/peticiones/host/${sessionId}`, { replace: true })
    } catch {
      setError('Error al crear la sesión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 py-10 gap-6">
      <button
        onClick={() => navigate('/')}
        className="text-white/40 text-sm self-start"
      >
        ← Atrás
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-sm">
        <div className="text-7xl">🙏</div>
        <h1 className="text-white text-4xl font-black tracking-tight text-center">
          PETI<span className="text-blue-400">CIONES</span>
        </h1>
        <p className="text-white/50 text-sm text-center">
          Recoge las peticiones de los participantes en una sola pantalla.
        </p>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={!ready || !uid || loading}
          className="w-full py-5 rounded-2xl bg-blue-500 active:bg-blue-600 text-white font-black text-xl tracking-wide shadow-lg shadow-blue-500/20 disabled:opacity-40 transition-colors"
        >
          {!ready ? 'Conectando…' : loading ? 'Creando…' : 'Crear sesión →'}
        </button>
      </div>
    </div>
  )
}
