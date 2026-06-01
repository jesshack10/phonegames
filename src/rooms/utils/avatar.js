export const COLORS = [
  'Red', 'Orange', 'Yellow', 'Green', 'Teal',
  'Blue', 'Indigo', 'Purple', 'Pink', 'Gray',
]

export const ANIMALS = [
  'Fox', 'Wolf', 'Bear', 'Owl', 'Crow',
  'Cat', 'Rabbit', 'Deer', 'Tiger', 'Frog',
]

export const ANIMAL_EMOJI = {
  Fox: '🦊', Wolf: '🐺', Bear: '🐻', Owl: '🦉', Crow: '🐦‍⬛',
  Cat: '🐱', Rabbit: '🐰', Deer: '🦌', Tiger: '🐯', Frog: '🐸',
}

export const COLOR_BG = {
  Red: 'bg-red-600',    Orange: 'bg-orange-500', Yellow: 'bg-yellow-500',
  Green: 'bg-green-600', Teal: 'bg-teal-500',    Blue: 'bg-blue-600',
  Indigo: 'bg-indigo-600', Purple: 'bg-purple-600', Pink: 'bg-pink-500',
  Gray: 'bg-gray-500',
}

export function generateAvatar() {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `${color}${animal}`
}

export function parseAvatar(avatar = 'GrayWolf') {
  for (const color of COLORS) {
    if (avatar.startsWith(color)) {
      return { color, animal: avatar.slice(color.length) }
    }
  }
  return { color: 'Gray', animal: 'Wolf' }
}
