import { ROLE_CONFIG } from '../../utils/werewolf.js'

const ROLE_TIPS = {
  werewolf: 'Work with fellow werewolves at night. Blend in during the day. Eliminate villagers one by one.',
  villager: 'Use your instincts to find the werewolves. Discuss, debate, and vote wisely.',
  seer: 'Each night you can investigate one player and learn if they are a werewolf. Use your knowledge carefully.',
  doctor: 'Each night you can protect one player from being killed. You may protect yourself once.',
}

export default function RoleCard({ role, onReveal, revealed }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.villager

  if (!revealed) {
    return (
      <button
        onClick={onReveal}
        className="w-full h-full min-h-[60vh] rounded-2xl bg-white/5 border-2 border-white/20 flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform"
      >
        <span className="text-6xl">🃏</span>
        <p className="text-white/60 text-lg">Tap to reveal your role</p>
        <p className="text-white/30 text-sm">Keep your screen private</p>
      </button>
    )
  }

  return (
    <div className={`w-full rounded-2xl border-2 ${config.bg} ${config.border} flex flex-col items-center justify-center gap-4 p-8 min-h-[60vh]`}>
      <span className="text-7xl">{config.emoji}</span>
      <p className={`text-4xl font-bold tracking-wide ${config.text}`}>{config.label.toUpperCase()}</p>
      <p className="text-white/60 text-sm text-center leading-relaxed max-w-xs mt-2">{ROLE_TIPS[role]}</p>
    </div>
  )
}
