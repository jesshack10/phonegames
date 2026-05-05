import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  subscribePeticionesSession,
  subscribePeticionesPlayers,
  subscribePeticionAssignment,
  submitPeticion,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'

function formatAssignment(a) {
  if (!a) return ''
  const author = a.anonymous ? 'Anónimo' : a.name
  return `${author}\n${(a.text || '').trim()}\n`
}

export default function PeticionesPlayer() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [myName, setMyName] = useState('')
  const [text, setText] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const sessionExistedRef = useRef(false)

  const storageKey = `pet_${sessionId}`
  const me = players.find(p => p.id === uid)
  const mySubmitted = !!me?.submitted
  const phase = meta?.phase

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      navigate(`/peticiones/lobby/${sessionId}`, { replace: true })
      return
    }
    try {
      const { name } = JSON.parse(stored)
      setMyName(name)
    } catch {
      localStorage.removeItem(storageKey)
      navigate(`/peticiones/lobby/${sessionId}`, { replace: true })
    }
  }, [sessionId, navigate, storageKey])

  useEffect(() => {
    const u1 = subscribePeticionesSession(sessionId, setMeta)
    const u2 = subscribePeticionesPlayers(sessionId, setPlayers)
    return () => { u1(); u2() }
  }, [sessionId])

  // Subscribe to my own assignment only after the session enters the 'assigned'
  // phase (otherwise rules will reject the read with PERMISSION_DENIED until it
  // exists, which is noisy in the console).
  useEffect(() => {
    if (!uid || phase !== 'assigned') return
    const u = subscribePeticionAssignment(sessionId, uid, setAssignment)
    return () => u()
  }, [sessionId, uid, phase])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (meta.phase === 'ended' || Date.now() - meta.createdAt > SESSION_TTL) {
        deleteSession(sessionId).then(() => navigate('/', { replace: true }))
      }
    } else if (sessionExistedRef.current) {
      localStorage.removeItem(storageKey)
      navigate('/', { replace: true })
    }
  }, [meta, sessionId, navigate, storageKey])

  async function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return setError('Escribe tu petición primero')
    if (!uid || !myName || submitting) return

    setSubmitting(true)
    setError('')
    try {
      await submitPeticion(sessionId, uid, myName, trimmed, anonymous)
    } catch (e) {
      console.error('submitPeticion failed:', e)
      const code = e?.code || e?.message || 'desconocido'
      setError(`Error al enviar: ${code}`)
      setSubmitting(false)
    }
  }

  async function handleCopyAssignment() {
    const txt = formatAssignment(assignment)
    if (!txt) return
    try {
      await navigator.clipboard.writeText(txt)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = txt
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!myName || !meta) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // ── ASSIGNED PHASE ──────────────────────────────────────────────────────────
  if (phase === 'assigned') {
    if (!mySubmitted) {
      return (
        <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-5 text-center">
          <div className="text-6xl">🙏</div>
          <h2 className="text-white text-2xl font-black">Las peticiones ya fueron asignadas</h2>
          <p className="text-white/50 text-sm">No participaste en esta ronda.</p>
        </div>
      )
    }
    if (!assignment) {
      return (
        <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-5 text-center">
          <div className="text-5xl">⏳</div>
          <p className="text-white/70 text-sm">Buscando tu petición asignada…</p>
        </div>
      )
    }
    const author = assignment.anonymous ? 'Anónimo' : assignment.name
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col px-6 py-10 gap-5">
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-xs uppercase tracking-widest">{myName}</p>
          <p className="text-white/30 text-xs font-mono">{sessionId}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-4xl">🙏</div>
          <h2 className="text-white text-2xl font-black tracking-tight">Tu petición asignada</h2>
        </div>

        <p className="text-white/50 text-sm">
          Recibiste esta petición para llevártela contigo.
        </p>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          <p className={`text-base font-bold ${assignment.anonymous ? 'text-white/60 italic' : 'text-blue-300'}`}>
            {author}
          </p>
          <p className="text-white/90 text-base leading-relaxed whitespace-pre-wrap">
            {assignment.text}
          </p>
        </div>

        <button
          onClick={handleCopyAssignment}
          className="w-full py-4 rounded-2xl bg-blue-500 active:bg-blue-600 text-white text-base font-bold transition-colors"
        >
          {copied ? '¡Copiada! ✓' : '📋 Copiar petición'}
        </button>

        <p className="text-white/30 text-xs text-center mt-auto">
          Gracias por participar, {myName}.
        </p>
      </div>
    )
  }

  // ── ACTIVE PHASE, ALREADY SUBMITTED ─────────────────────────────────────────
  if (mySubmitted) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-5 text-center">
        <div className="text-6xl">✓</div>
        <h2 className="text-white text-3xl font-black">Petición enviada</h2>
        <p className="text-white/60 text-base">Gracias, {myName}.</p>
        <p className="text-white/40 text-sm max-w-xs">
          Espera mientras el moderador asigna las peticiones.
        </p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── ACTIVE PHASE, NOT YET SUBMITTED ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col px-6 py-10 gap-5">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-xs uppercase tracking-widest">{myName}</p>
        <p className="text-white/30 text-xs font-mono">{sessionId}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-4xl">🙏</div>
        <h2 className="text-white text-2xl font-black tracking-tight">Tu petición</h2>
      </div>

      <p className="text-white/50 text-sm">
        Escribe lo que quieras compartir con el grupo.
      </p>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setError('') }}
        placeholder="Escribe aquí tu petición…"
        rows={10}
        autoFocus
        className="w-full px-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white text-base placeholder-white/30 outline-none focus:border-blue-500 resize-none leading-relaxed"
      />

      <label className="flex items-center gap-3 px-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={e => setAnonymous(e.target.checked)}
          className="w-5 h-5 accent-blue-500"
        />
        <span className="text-white/70 text-sm">Enviar de forma anónima</span>
      </label>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!text.trim() || submitting}
        className="w-full py-5 rounded-2xl bg-blue-500 active:bg-blue-600 text-white text-lg font-black tracking-wide shadow-lg shadow-blue-500/20 disabled:opacity-40 transition-colors mt-auto"
      >
        {submitting ? 'Enviando…' : 'Enviar petición →'}
      </button>
    </div>
  )
}
