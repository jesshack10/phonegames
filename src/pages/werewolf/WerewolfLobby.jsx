import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { joinSession, subscribeSession, subscribePlayers, getSessionMeta } from '../../firebase/session.js'
import { generateAvatar } from '../../utils/werewolf.js'
import { useAuth } from '../../hooks/useAuth.js'
import Avatar from '../../components/werewolf/Avatar.jsx'

export default function WerewolfLobby() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [players, setPlayers] = useState([])
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const [myAvatar, setMyAvatar] = useState(() => generateAvatar())

  const storageKey = `ww_player_${sessionId}`

  useEffect(() => {
    if (!uid) return
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const { playerId } = JSON.parse(stored)
      if (uid === playerId) setJoined(true)
    }
  }, [uid, storageKey])

  useEffect(() => {
    if (!joined) return
    const unsubMeta = subscribeSession(sessionId, setMeta)
    const unsubPlayers = subscribePlayers(sessionId, setPlayers)
    return () => { unsubMeta(); unsubPlayers() }
  }, [joined, sessionId])

  useEffect(() => {
    if (!meta) return
    if (meta.phase === 'role_reveal' || meta.phase === 'night' || meta.phase === 'day_announce' ||
        meta.phase === 'day_discuss' || meta.phase === 'voting' || meta.phase === 'day_elimination' || meta.phase === 'ended') {
      navigate(`/werewolf/play/${sessionId}`)
    }
  }, [meta, navigate, sessionId])

  async function handleJoin() {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length < 1) return setError('Enter your name')
    if (trimmed.length > 16) return setError('Name too long (max 16 chars)')

    if (!uid) return setError('Not connected — please wait and retry')

    try {
      const meta = await getSessionMeta(sessionId)
      if (!meta) return setError('Session not found')
      if (meta.phase !== 'lobby') return setError('This game has already started')

      await joinSession(sessionId, uid, trimmed, myAvatar)
      localStorage.setItem(storageKey, JSON.stringify({ playerId: uid, name: trimmed, avatar: myAvatar }))
      setJoined(true)
    } catch {
      setError('Failed to join. Try again.')
    }
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-6 gap-6">
        <h1 className="text-white text-3xl font-bold tracking-wide">🐺 Werewolf</h1>
        <p className="text-white/50 text-sm">Session <span className="font-mono text-white/80">{sessionId}</span></p>

        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <Avatar avatar={myAvatar} size="lg" />
          <button
            onClick={() => setMyAvatar(generateAvatar())}
            className="text-white/40 text-xs active:text-white/70"
          >
            🎲 Shuffle avatar
          </button>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={16}
            className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-red-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={!name.trim()}
            className="w-full py-4 rounded-2xl bg-red-700 border border-red-500 text-white text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform"
          >
            Join Game →
          </button>
        </div>
      </div>
    )
  }

  const visiblePlayers = players.filter(p => p.role !== 'moderator')

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-6">
      <h2 className="text-white text-2xl font-bold">Waiting for game to start…</h2>
      <p className="text-white/40 text-sm">{visiblePlayers.length} player{visiblePlayers.length !== 1 ? 's' : ''} in lobby</p>

      <div className="w-full max-w-xs flex flex-col gap-2">
        {visiblePlayers.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2">
            <Avatar avatar={p.avatar} size="sm" />
            <span className="text-white font-semibold">{p.name}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mt-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}
