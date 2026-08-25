import { parseAvatar, ANIMAL_EMOJI, COLOR_BG } from '../utils/avatar.js'

const SIZE = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-xl',
  lg: 'w-16 h-16 text-3xl',
}

export function Avatar({ avatar = 'GrayWolf', size = 'md' }) {
  const { color, animal } = parseAvatar(avatar)
  return (
    <div
      className={`${SIZE[size]} ${COLOR_BG[color] ?? 'bg-gray-500'} rounded-full flex items-center justify-center flex-shrink-0`}
    >
      <span>{ANIMAL_EMOJI[animal] ?? '🐺'}</span>
    </div>
  )
}
