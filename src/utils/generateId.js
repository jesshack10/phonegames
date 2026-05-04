const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateSessionId() {
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return id
}
