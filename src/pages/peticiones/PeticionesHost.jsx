import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  subscribePeticionesSession,
  subscribePeticionesPlayers,
  subscribePeticiones,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'

function formatPetitions(petitions) {
  if (petitions.length === 0) return ''
  const date = new Date().toLocaleDateString('es', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const header = `# Peticiones — ${date}\n\n`
  const body = petitions
    .map(p => `**${p.name}**\n\n${p.text.trim()}`)
    .join('\n\n---\n\n')
  return header + body + '\n'
}

export default function PeticionesHost() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [petitions, setPetitions] = useState([])
  const [copied, setCopied] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const sessionExistedRef = useRef(false)

  useEffect(() => {
    const u1 = subscribePeticionesSession(sessionId, setMeta)
    const u2 = subscribePeticionesPlayers(sessionId, setPlayers)
    const u3 = subscribePeticiones(sessionId, setPetitions)
    return () => { u1(); u2(); u3() }
  }, [sessionId])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (meta.phase === 'ended' || Date.now() - meta.createdAt > SESSION_TTL) {
        deleteSession(sessionId).then(() => navigate('/', { replace: true }))
      }
    } else if (sessionExistedRef.current) {
      navigate('/', { replace: true })
    }
  }, [meta, sessionId, navigate])

  const formatted = useMemo(() => formatPetitions(petitions), [petitions])

  const lobbyUrl = `${window.location.origin}${window.location.pathname}#/peticiones/lobby/${sessionId}`
  const submittedCount = players.filter(p => p.submitted).length
  const totalCount = players.length

  async function handleCopy() {
    if (!formatted) return
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = formatted
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
      document.body.removeChild(ta)
    }
  }

  async function handleEnd() {
    if (!confirmEnd) {
      setConfirmEnd(true)
      setTimeout(() => setConfirmEnd(false), 4000)
      return
    }
    await deleteSession(sessionId)
    navigate('/', { replace: true })
  }

  if (!meta) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-8 gap-5">
      <button
        onClick={() => navigate('/')}
        className="text-white/40 text-sm self-start"
      >
        ← Salir
      </button>

      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl">🙏</div>
        <h1 className="text-white text-2xl font-black tracking-tight">PETICIONES</h1>
      </div>

      {/* QR + code */}
      <div className="flex flex-col items-center gap-3">
        <div className="bg-white p-3 rounded-2xl shadow-2xl shadow-black/50">
          <QRCodeSVG value={lobbyUrl} size={160} level="M" includeMargin={false} />
        </div>
        <p className="text-white/40 text-xs">Escanea para unirte</p>
        <p className="text-white text-3xl font-mono font-bold tracking-widest">{sessionId}</p>
      </div>

      {/* Counter */}
      <div className="text-center">
        <p className="text-white/60 text-sm">
          <span className="text-blue-400 font-bold">{submittedCount}</span>
          <span className="text-white/40"> / {totalCount} </span>
          {totalCount === 1 ? 'participante ha enviado' : 'participantes han enviado'}
        </p>
      </div>

      {/* Participant chips */}
      {players.length > 0 && (
        <div className="w-full max-w-md flex flex-wrap gap-2 justify-center">
          {players.map(p => (
            <div
              key={p.id}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                p.submitted
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              {p.submitted ? '✓ ' : '○ '}{p.name}
            </div>
          ))}
        </div>
      )}

      {/* Petitions preview */}
      {petitions.length > 0 ? (
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 max-h-80 overflow-y-auto">
          <pre className="text-white/85 text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {formatted}
          </pre>
        </div>
      ) : (
        <p className="text-white/30 text-sm text-center mt-4">
          Aún no hay peticiones enviadas.
        </p>
      )}

      {/* Actions */}
      <div className="w-full max-w-md flex flex-col gap-2 mt-2">
        <button
          onClick={handleCopy}
          disabled={petitions.length === 0}
          className="w-full py-4 rounded-2xl bg-blue-500 active:bg-blue-600 text-white font-bold text-base disabled:opacity-30 transition-colors"
        >
          {copied ? '¡Copiado! ✓' : '📋 Copiar todas las peticiones'}
        </button>

        <button
          onClick={handleEnd}
          className={`w-full py-3 rounded-2xl font-semibold text-sm transition-colors ${
            confirmEnd
              ? 'bg-red-500 active:bg-red-600 text-white'
              : 'bg-white/5 active:bg-white/10 text-white/60 border border-white/10'
          }`}
        >
          {confirmEnd ? 'Toca de nuevo para confirmar' : 'Terminar y borrar sesión'}
        </button>
      </div>
    </div>
  )
}
