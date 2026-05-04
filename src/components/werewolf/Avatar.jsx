import { parseAvatar, ANIMAL_EMOJI, COLOR_BG } from '../../utils/werewolf.js'

const SIZE = {
  sm: 'w-8 h-8 text-base',
  md: 'w-12 h-12 text-xl',
  lg: 'w-20 h-20 text-4xl',
}

export default function Avatar({ avatar = 'GrayWolf', size = 'md' }) {
  const { color, animal } = parseAvatar(avatar)
  return (
    <div className={`${SIZE[size]} ${COLOR_BG[color] || 'bg-gray-500'} rounded-full flex items-center justify-center flex-shrink-0`}>
      <span>{ANIMAL_EMOJI[animal] || '🐺'}</span>
    </div>
  )
}
