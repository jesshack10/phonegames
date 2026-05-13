import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  subscribePeticionesSession,
  subscribePeticionesPlayers,
  subscribePeticiones,
  subscribePeticionAssignment,
  submitPeticion,
  assignPetitions,
  deleteSession,
  SESSION_TTL,
} from '../../firebase/session.js'
import { useAuth } from '../../hooks/useAuth.js'
import ShareSessionLink from '../../components/ShareSessionLink.jsx'

function getDateLabel() {
  return new Date().toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatPetitions(petitions) {
  if (petitions.length === 0) return ''
  const sections = petitions.map((p, i) => {
    const author = p.anonymous ? 'Anónimo' : p.name
    const lines = p.text.trim().split('\n').filter(l => l.trim())
    const bullets = lines.map(l => `• ${l.trim()}`).join('\n')
    return `###${i + 1}\nDe: ${author}\n${bullets}`
  }).join('\n\n')
  return `Peticiones · ${getDateLabel()}\n\n${sections}\n`
}

export default function PeticionesHost() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [meta, setMeta] = useState(null)
  const [players, setPlayers] = useState([])
  const [petitions, setPetitions] = useState([])
  const [myAssignment, setMyAssignment] = useState(null)
  const [copied, setCopied] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [myText, setMyText] = useState('')
  const [myAnonymous, setMyAnonymous] = useState(false)
  const [submittingMine, setSubmittingMine] = useState(false)
  const [myError, setMyError] = useState('')
  const [skipNonSubmitters, setSkipNonSubmitters] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [readError, setReadError] = useState('')
  const [assignmentCopied, setAssignmentCopied] = useState(false)
  const sessionExistedRef = useRef(false)

  const me = players.find(p => p.id === uid)
  const mySubmitted = !!me?.submitted
  const phase = meta?.phase
  const isAssigned = phase === 'assigned'

  useEffect(() => {
    const onErr = (label) => (err) => setReadError(`${label}: ${err?.code || err?.message || 'desconocido'}`)
    const u1 = subscribePeticionesSession(sessionId, setMeta, onErr('meta'))
    const u2 = subscribePeticionesPlayers(sessionId, setPlayers, onErr('players'))
    const u3 = subscribePeticiones(sessionId, setPetitions, onErr('petitions'))
    return () => { u1(); u2(); u3() }
  }, [sessionId])

  useEffect(() => {
    if (!uid || !isAssigned) return
    const u = subscribePeticionAssignment(sessionId, uid, setMyAssignment)
    return () => u()
  }, [sessionId, uid, isAssigned])

  useEffect(() => {
    if (meta) {
      sessionExistedRef.current = true
      if (meta.phase === 'ended' || Date.now() - meta.createdAt > SESSION_TTL) {
        deleteSession(sessionId).then(() => navigate('/', { replace: true }))
      }
    } else if (sessionExistedRef.current) { navigate('/', { replace: true }) }
  }, [meta, sessionId, navigate])

  const formatted = useMemo(() => formatPetitions(petitions), [petitions])
  const lobbyUrl = `${window.location.origin}${window.location.pathname}#/peticiones/lobby/${sessionId}`
  const submittedCount = players.filter(p => p.submitted).length
  const totalCount = players.length
  const pending = players.filter(p => !p.submitted)
  const allSubmitted = totalCount > 0 && submittedCount === totalCount
  const canAssign = !isAssigned && submittedCount >= 2 && (allSubmitted || skipNonSubmitters)

  async function handleCopy() {
    if (!formatted) return
    try { await navigator.clipboard.writeText(formatted); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { const ta = document.createElement('textarea'); ta.value = formatted; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {} document.body.removeChild(ta) }
  }

  async function handleCopyAssignment() {
    if (!myAssignment) return
    const author = myAssignment.anonymous ? 'Anónimo' : myAssignment.name
    const lines = (myAssignment.text || '').trim().split('\n').filter(l => l.trim())
    const bullets = lines.map(l => `• ${l.trim()}`).join('\n')
    const txt = `###1\nDe: ${author}\n${bullets}\n`
    try { await navigator.clipboard.writeText(txt) } catch { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy') } catch {} document.body.removeChild(ta) }
    setAssignmentCopied(true); setTimeout(() => setAssignmentCopied(false), 2000)
  }

  async function handleEnd() {
    if (!confirmEnd) { setConfirmEnd(true); setTimeout(() => setConfirmEnd(false), 4000); return }
    await deleteSession(sessionId)
    navigate('/', { replace: true })
  }

  async function handleSubmitMine() {
    const trimmed = myText.trim()
    if (!trimmed) return setMyError('Escribe tu petición primero')
    if (!uid || !me?.name || submittingMine) return
    setSubmittingMine(true); setMyError('')
    try { await submitPeticion(sessionId, uid, me.name, trimmed, myAnonymous); setMyText('') }
    catch (e) { setMyError(`Error al enviar: ${e?.code || e?.message || 'desconocido'}`) }
    finally { setSubmittingMine(false) }
  }

  async function handleAssign() {
    if (!canAssign || assigning) return
    setAssigning(true); setAssignError('')
    try {
      const recipients = (skipNonSubmitters ? players.filter(p => p.submitted) : players).map(p => p.id)
      await assignPetitions(sessionId, recipients)
    } catch (e) { setAssignError(`Error al asignar: ${e?.code || e?.message || 'desconocido'}`) }
    finally { setAssigning(false) }
  }

  if (!meta) return <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-5 py-8 gap-5">
      <button onClick={() => navigate('/')} className="text-white/40 text-sm self-start">← Salir</button>
      <div className="flex flex-col items-center gap-3"><div className="text-4xl">🙏</div><h1 className="text-white text-2xl font-black tracking-tight">PETICIONES</h1></div>

      {!isAssigned && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <div className="bg-white p-3 rounded-2xl shadow-2xl shadow-black/50"><QRCodeSVG value={lobbyUrl} size={160} level="M" includeMargin={false} /></div>
          <p className="text-white/40 text-xs">Escanea o comparte el enlace</p>
          <p className="text-white text-3xl font-mono font-bold tracking-widest">{sessionId}</p>
          <ShareSessionLink url={lobbyUrl} shareTitle="Peticiones" shareText={`Únete a la sesión de peticiones (código ${sessionId})`} copyLabel="Copiar enlace" copiedLabel="¡Copiado! ✓" shareLabel="Compartir" />
        </div>
      )}

      {isAssigned && <div className="w-full max-w-md bg-blue-500/10 border border-blue-500/30 rounded-2xl px-4 py-3 text-center"><p className="text-blue-300 text-sm font-semibold">🔒 Sesión cerrada · {petitions.length} peticiones asignadas</p></div>}

      <div className="text-center"><p className="text-white/60 text-sm"><span className="text-blue-400 font-bold">{submittedCount}</span><span className="text-white/40"> / {totalCount} </span>{totalCount === 1 ? 'participante ha enviado' : 'participantes han enviado'}</p></div>

      {readError && <div className="w-full max-w-md bg-red-500/10 border border-red-500/40 rounded-2xl px-4 py-3"><p className="text-red-300 text-xs font-mono break-all">⚠ {readError}</p></div>}

      {players.length > 0 && <div className="w-full max-w-md flex flex-wrap gap-2 justify-center">{players.map(p => <div key={p.id} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${p.submitted ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-white/50'} ${p.id === uid ? 'ring-1 ring-white/30' : ''}`}>{p.submitted ? '✓ ' : '○ '}{p.name}{p.id === uid ? ' (tú)' : ''}</div>)}</div>}

      {me && !mySubmitted && !isAssigned && (
        <div className="w-full max-w-md flex flex-col gap-2 bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/80 text-sm font-semibold">Tu petición</p>
          <textarea value={myText} onChange={e => { setMyText(e.target.value); setMyError('') }} placeholder="Escribe tu petición…" rows={4} className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder-white/30 outline-none focus:border-blue-500 resize-none leading-relaxed" />
          <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={myAnonymous} onChange={e => setMyAnonymous(e.target.checked)} className="w-4 h-4 accent-blue-500" /><span className="text-white/60 text-xs">Enviar de forma anónima</span></label>
          {myError && <p className="text-red-400 text-xs">{myError}</p>}
          <button onClick={handleSubmitMine} disabled={!myText.trim() || submittingMine} className="w-full py-3 rounded-xl bg-blue-500 active:bg-blue-600 text-white text-sm font-bold disabled:opacity-40 transition-colors">{submittingMine ? 'Enviando…' : 'Enviar mi petición →'}</button>
        </div>
      )}
      {me && mySubmitted && !isAssigned && <div className="w-full max-w-md flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-2xl px-4 py-3"><span className="text-blue-300 text-sm font-semibold">✓ Tu petición ya está enviada</span></div>}

      {isAssigned && myAssignment && (
        <div className="w-full max-w-md flex flex-col gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/80 text-sm font-semibold">Tu petición asignada</p>
          <div className="flex flex-col gap-2">
            <p className="text-white/25 text-xs font-mono">###1</p>
            <p className={`text-sm font-bold ${myAssignment.anonymous ? 'text-white/60 italic' : 'text-blue-300'}`}>De: {myAssignment.anonymous ? 'Anónimo' : myAssignment.name}</p>
            <ul className="flex flex-col gap-1">{(myAssignment.text || '').trim().split('\n').filter(l => l.trim()).map((line, i) => <li key={i} className="flex gap-2 text-white/90 text-sm leading-relaxed"><span className="text-white/30 shrink-0">•</span><span>{line.trim()}</span></li>)}</ul>
          </div>
          <button onClick={handleCopyAssignment} className="w-full py-3 rounded-xl bg-blue-500 active:bg-blue-600 text-white text-sm font-bold transition-colors">{assignmentCopied ? '¡Copiada! ✓' : '📋 Copiar mi petición'}</button>
        </div>
      )}
      {isAssigned && !myAssignment && me && !mySubmitted && <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center"><p className="text-white/60 text-sm">No enviaste petición — no recibiste asignación.</p></div>}

      {!isAssigned && (
        <div className="w-full max-w-md flex flex-col gap-2 bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/80 text-sm font-semibold">Asignar peticiones</p>
          <p className="text-white/50 text-xs">Cada participante recibirá una petición que no es la suya.</p>
          {!allSubmitted && pending.length > 0 && <p className="text-white/40 text-xs">Esperando: {pending.map(p => p.name).join(', ')}</p>}
          {!allSubmitted && <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={skipNonSubmitters} onChange={e => setSkipNonSubmitters(e.target.checked)} className="w-4 h-4 accent-blue-500" /><span className="text-white/60 text-xs">Asignar sin esperar a quienes no enviaron</span></label>}
          {assignError && <p className="text-red-400 text-xs">{assignError}</p>}
          <button onClick={handleAssign} disabled={!canAssign || assigning} className="w-full py-3 rounded-xl bg-blue-500 active:bg-blue-600 text-white text-sm font-bold disabled:opacity-30 transition-colors">{assigning ? 'Asignando…' : submittedCount < 2 ? `Necesitas ${2 - submittedCount} petición más` : `Asignar peticiones (${skipNonSubmitters ? submittedCount : totalCount})`}</button>
        </div>
      )}

      {petitions.length > 0 ? (
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-5 max-h-[28rem] overflow-y-auto flex flex-col gap-1">
          <p className="text-white/50 text-sm capitalize mb-4">{getDateLabel()}</p>
          {petitions.map((p, i) => {
            const lines = p.text.trim().split('\n').filter(l => l.trim())
            return (
              <div key={p.id} className={i > 0 ? 'pt-4 border-t border-white/5' : ''}>
                <p className="text-white/25 text-xs font-mono mb-1">###{i + 1}</p>
                <p className={`text-sm font-bold mb-2 ${p.anonymous ? 'text-white/50 italic' : 'text-blue-300'}`}>De: {p.anonymous ? 'Anónimo' : p.name}</p>
                <ul className="flex flex-col gap-1">{lines.map((line, j) => <li key={j} className="flex gap-2 text-white/80 text-sm leading-relaxed"><span className="text-white/30 shrink-0">•</span><span>{line.trim()}</span></li>)}</ul>
              </div>
            )
          })}
        </div>
      ) : <p className="text-white/30 text-sm text-center mt-4">Aún no hay peticiones enviadas.</p>}

      <div className="w-full max-w-md flex flex-col gap-2 mt-2">
        <button onClick={handleCopy} disabled={petitions.length === 0} className="w-full py-4 rounded-2xl bg-blue-500 active:bg-blue-600 text-white font-bold text-base disabled:opacity-30 transition-colors">{copied ? '¡Copiado! ✓' : '📋 Copiar todas las peticiones'}</button>
        <button onClick={handleEnd} className={`w-full py-3 rounded-2xl font-semibold text-sm transition-colors ${confirmEnd ? 'bg-red-500 active:bg-red-600 text-white' : 'bg-white/5 active:bg-white/10 text-white/60 border border-white/10'}`}>{confirmEnd ? 'Toca de nuevo para confirmar' : 'Terminar y borrar sesión'}</button>
      </div>
    </div>
  )
}
