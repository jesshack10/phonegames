import Avatar from './Avatar.jsx'
import { ROLE_CONFIG } from '../../utils/werewolf.js'

export default function PlayerList({ players = [], showRoles = false, compact = false }) {
  const visible = players.filter(p => p.role !== 'moderator')
  return (
    <div className="flex flex-col gap-2">
      {visible.map(player => (
        <div
          key={player.id}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
            player.alive === false ? 'opacity-40' : 'bg-white/5'
          }`}
        >
          <Avatar avatar={player.avatar} size={compact ? 'sm' : 'md'} />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-white truncate ${compact ? 'text-sm' : ''}`}>
              {player.name}
              {player.alive === false && <span className="ml-1 text-xs">💀</span>}
            </p>
            {showRoles && player.role && (
              <p className={`text-xs ${ROLE_CONFIG[player.role]?.text || 'text-gray-400'}`}>
                {ROLE_CONFIG[player.role]?.emoji} {ROLE_CONFIG[player.role]?.label}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
