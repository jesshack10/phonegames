import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  createSession,
  setHostPlayer,
  joinSession,
  lookupSessionGame,
  SESSION_TTL,
  deleteSession,
} from '../firebase/session.js'
import { suggestRoles, generateAvatar } from '../utils/werewolf.js'
import { useAuth } from '../hooks/useAuth.js'
import RoleBalanceBadge from '../components/werewolf/RoleBalanceBadge.jsx'
import ShareSessionLink from '../components/ShareSessionLink.jsx'

export default function WerewolfSetup() {
  const navigate = useNavigate()
  const { uid, ready } = useAuth()
  const [playerCount, setPlayerCount] = useState(6)
  const [roleConfig, setRoleConfig] = useState(suggestRoles(6))
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const total = roleConfig.werewolves + roleConfig.seers + roleConfig.doctors + roleConfig.villagers
  const isValid = total === playerCount && roleConfig.villagers >= 0

  function handlePlayerCountChange(n) {
    setPlayerCount(n)
    setRoleConfig(suggestRoles(n))
  }

  function setRole(key, delta) {
    setRoleConfig(prev => {
      const next = { ...prev, [key]: Math.max(0, prev[key] + delta) }
      const fixed = next.werewolves + next.seers + next.doctors
      next.villagers = Math.max(0, playerCount - fixed)
      return next
    })
  }

  async function handleCreate() {
    if (!isValid || !uid) return
    setLoading(true)
    try {
      const id = await createSession(uid, roleConfig)
      await setHostPlayer(id, uid)
      setSessionId(id)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    const trimmed = joinName.trim()
    if (!trimmed) return setJoinError('Enter your name')
    if (trimmed.length > 16) return setJoinError('Name too long (max 16)')
    const normalized = joinCode.trim().toUpperCase()
    if (normalized.length !== 6) return setJoinError('Code must be 6 characters')
    if (!uid || joining || loading) return

    setJoining(true)
    setJoinError('')
    try {
      const { meta, game } = await lookupSessionGame(normalized)
      if (!meta) {
        setJoinError('Session not found')
        return
      }
      if (game !== 'werewolf') {
        setJoinError("That code isn't a Werewolf game")
        return
      }
      if (Date.now() - meta.createdAt > SESSION_TTL) {
        await deleteSession(normalized)
        setJoinError('Session expired')
        return
      }
      if (meta.phase !== 'lobby') {
        setJoinError('This game has already started')
        return
      }
      const avatar = generateAvatar()
      await joinSession(normalized, uid, trimmed, avatar)
      localStorage.setItem(
        `ww_player_${normalized}`,
        JSON.stringify({ playerId: uid, name: trimmed, avatar })
      )
      navigate(`/werewolf/lobby/${normalized}`, { replace: true })
    } catch (e) {
      console.error('join failed:', e)
      setJoinError(`Failed to join: ${e?.code || e?.message || ''}`)
    } finally {
      setJoining(false)
    }
  }

  const lobbyUrl = sessionId
    ? `${window.location.origin}${window.location.pathname}#/werewolf/lobby/${sessionId}`
    : null

  if (sessionId) {
    return (
      <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center px-6 py-10 gap-6">
        <h2 className="text-white text-2xl font-bold tracking-wide">Session Ready</h2>
        <p className="text-white/60 text-sm text-center">Players scan this QR to join</p>

        <div className="bg-white rounded-2xl p-4">
          <QRCodeSVG value={lobbyUrl} size={220} />
        </div>

        <div className="text-center">
          <p className="text-white/40 text-xs mb-1">Session code</p>
          <p className="text-white text-4xl font-mono font-bold tracking-widest">{sessionId}</p>
        </div>

        <div className="w-full max-w-xs">
          <ShareSessionLink
            url={lobbyUrl}
            shareTitle="Werewolf"
            shareText={`Join the Werewolf game (code ${sessionId})`}
          />
        </div>

        <div className="w-full max-w-xs text-center text-white/50 text-xs">
          {roleConfig.werewolves}W · {roleConfig.seers}S · {roleConfig.doctors}D · {roleConfig.villagers}V
          · {playerCount} players total
        </div>

        <button
          onClick={() => navigate(`/werewolf/moderator/${sessionId}`)}
          className="w-full max-w-xs py-4 rounded-2xl bg-red-700 border border-red-500 text-white text-lg font-bold active:scale-95 transition-transform"
        >
          Open Moderator Panel →
        </button>

        <button
          onClick={() => navigate('/')}
          className="text-white/30 text-sm"
        >
          ← Back to games
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col px-6 py-10 gap-6">
      <button onClick={() => navigate('/')} className="text-white/40 text-sm self-start">← Back</button>
      <h1 className="text-white text-3xl font-bold tracking-wide">🐺 Werewolf</h1>

      {/* Join section */}
      <input
        type="text"
        value={joinName}
        onChange={e => { setJoinName(e.target.value); setJoinError('') }}
        placeholder="Your name…"
        maxLength={16}
        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 outline-none focus:border-red-500"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={joinCode}
          onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError('') }}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="CODE"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center text-lg font-mono font-bold tracking-widest placeholder-white/30 outline-none focus:border-white/40"
        />
        <button
          onClick={handleJoin}
          disabled={!ready || !uid || !joinName.trim() || joinCode.trim().length !== 6 || loading || joining}
          className="px-5 py-3 rounded-xl bg-white/10 active:bg-white/20 text-white font-bold disabled:opacity-30 transition-colors"
        >
          {joining ? '…' : 'Join →'}
        </button>
      </div>
      {joinError && <p className="text-red-400 text-sm text-center">{joinError}</p>}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <p className="text-white/30 text-xs uppercase tracking-widest">or create a new game</p>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <p className="text-white/50 text-sm">Configure your game as the moderator.</p>

      <div>
        <label className="text-white/60 text-xs uppercase tracking-widest mb-2 block">Players</label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handlePlayerCountChange(Math.max(4, playerCount - 1))}
            className="w-10 h-10 rounded-full bg-white/10 text-white text-xl font-bold active:bg-white/20"
          >−</button>
          <span className="text-white text-3xl font-bold w-10 text-center">{playerCount}</span>
          <button
            onClick={() => handlePlayerCountChange(Math.min(20, playerCount + 1))}
            className="w-10 h-10 rounded-full bg-white/10 text-white text-xl font-bold active:bg-white/20"
          >+</button>
        </div>
      </div>

      <div>
        <label className="text-white/60 text-xs uppercase tracking-widest mb-3 block">Role counts</label>
        <div className="flex flex-col gap-3">
          {[
            { key: 'werewolves', label: '🐺 Werewolves', min: 1 },
            { key: 'seers', label: '🔮 Seers', min: 0 },
            { key: 'doctors', label: '💉 Doctors', min: 0 },
          ].map(({ key, label, min }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-white text-sm">{label}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRole(key, -1)}
                  disabled={roleConfig[key] <= min}
                  className="w-8 h-8 rounded-full bg-white/10 text-white font-bold disabled:opacity-30 active:bg-white/20"
                >−</button>
                <span className="text-white font-bold w-5 text-center">{roleConfig[key]}</span>
                <button
                  onClick={() => setRole(key, 1)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white font-bold active:bg-white/20"
                >+</button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between opacity-50">
            <span className="text-white text-sm">🏡 Villagers</span>
            <span className="text-white font-bold pr-11">{Math.max(0, roleConfig.villagers)}</span>
          </div>
        </div>
      </div>

      <RoleBalanceBadge playerCount={playerCount} roleConfig={roleConfig} />

      <button
        onClick={handleCreate}
        disabled={!isValid || loading || joining || !ready || !uid}
        className="w-full py-4 rounded-2xl bg-red-700 border border-red-500 text-white text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform mt-auto"
      >
        {!ready ? 'Connecting…' : loading ? 'Creating...' : !uid ? 'Firebase not configured' : 'Create Session →'}
      </button>
    </div>
  )
}
