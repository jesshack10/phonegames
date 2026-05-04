import { suggestRoles } from '../../utils/werewolf.js'

export default function RoleBalanceBadge({ playerCount, roleConfig }) {
  const suggested = suggestRoles(playerCount)
  const { werewolves, seers, doctors, villagers } = roleConfig
  const total = werewolves + seers + doctors + villagers
  const isBalanced = werewolves === suggested.werewolves
  const isValid = total === playerCount && villagers >= 0

  let color = 'bg-green-900/60 border-green-600 text-green-300'
  if (!isValid) color = 'bg-red-900/60 border-red-600 text-red-300'
  else if (!isBalanced) color = 'bg-yellow-900/60 border-yellow-600 text-yellow-300'

  return (
    <div className={`rounded-lg px-3 py-2 border text-xs font-mono ${color}`}>
      {isValid ? (
        <span>
          {isBalanced ? '✓ Balanced' : '⚠ Custom'}: {werewolves}W {seers}S {doctors}D {villagers}V
        </span>
      ) : (
        <span>✗ Roles don't add up to {playerCount} players</span>
      )}
    </div>
  )
}
