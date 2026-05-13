export default function PaintingAnim({ progress, phase }) {
  const color = phase === 'work' ? '#f59e0b' : '#2dd4bf'
  const bg = phase === 'work' ? '#1a1100' : '#001a18'

  function drawn(start, end) {
    return Math.min(1, Math.max(0, (progress - start) / (end - start)))
  }

  const faceC = 2 * Math.PI * 26
  const faceD = drawn(0, 0.32)
  const smileC = 44
  const smileD = drawn(0.55, 0.75)
  const brushAngle = progress * Math.PI * 10
  const bx = 55 + Math.cos(brushAngle) * 30
  const by = 54 + Math.sin(brushAngle) * 30

  return (
    <svg viewBox="0 0 110 110" width="150" height="150">
      <rect x="4" y="4" width="102" height="102" rx="7"
        fill={bg} stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />

      <circle cx="55" cy="54" r="26"
        fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={faceC}
        strokeDashoffset={faceC * (1 - faceD)}
        strokeLinecap="round"
        transform="rotate(-90 55 54)"
        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
      />

      <circle cx="46" cy="48" r="3.5"
        fill={color}
        opacity={drawn(0.35, 0.43)}
        style={{ transition: 'opacity 0.5s ease' }}
      />

      <circle cx="64" cy="48" r="3.5"
        fill={color}
        opacity={drawn(0.44, 0.52)}
        style={{ transition: 'opacity 0.5s ease' }}
      />

      <path d="M 44 62 Q 55 76 66 62"
        fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={smileC}
        strokeDashoffset={smileC * (1 - smileD)}
        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
      />

      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x1 = 55 + Math.cos(rad) * 33
        const y1 = 54 + Math.sin(rad) * 33
        const x2 = 55 + Math.cos(rad) * 44
        const y2 = 54 + Math.sin(rad) * 44
        const d = drawn(0.76 + i * 0.03, 0.8 + i * 0.03)
        return (
          <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth="2.5" strokeLinecap="round"
            opacity={d}
            style={{ transition: 'opacity 0.3s ease' }}
          />
        )
      })}

      {progress > 0.01 && progress < 0.99 && (
        <circle cx={bx} cy={by} r="2.5" fill="white" opacity="0.2" />
      )}
    </svg>
  )
}
