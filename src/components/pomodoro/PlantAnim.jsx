export default function PlantAnim({ progress, phase }) {
  const stemColor = '#4ade80'
  const leafColor = phase === 'work' ? '#16a34a' : '#0d9488'
  const petalColor = phase === 'work' ? '#f59e0b' : '#a78bfa'
  const petalCenter = phase === 'work' ? '#fef3c7' : '#ede9fe'

  const stemH = progress * 70
  const stemTopY = 108 - stemH

  const leaf1P = Math.min(1, Math.max(0, (progress - 0.22) / 0.28))
  const leaf2P = Math.min(1, Math.max(0, (progress - 0.5) / 0.28))
  const flowerP = Math.min(1, Math.max(0, (progress - 0.82) / 0.18))

  const leaf1Y = 108 - stemH * 0.38
  const leaf2Y = 108 - stemH * 0.65

  return (
    <svg viewBox="0 0 120 150" width="130" height="155">
      <path d="M 37 112 L 32 138 L 88 138 L 83 112 Z" fill="#6b4232" />
      <rect x="30" y="106" width="60" height="11" rx="5" fill="#7c5140" />
      <ellipse cx="60" cy="112" rx="25" ry="5" fill="#2a1a0a" />

      {stemH > 1 && (
        <line
          x1="60" y1="110"
          x2="60" y2={stemTopY}
          stroke={stemColor} strokeWidth="3.5" strokeLinecap="round"
          style={{ transition: 'y2 0.9s ease' }}
        />
      )}

      {leaf1P > 0.01 && (
        <ellipse
          cx={60 - 17 * leaf1P}
          cy={leaf1Y}
          rx={16 * leaf1P}
          ry={7.5 * leaf1P}
          fill={leafColor}
          opacity={Math.min(1, leaf1P * 1.5)}
          transform={`rotate(-38, ${60 - 17 * leaf1P}, ${leaf1Y})`}
          style={{ transition: 'all 0.9s ease' }}
        />
      )}

      {leaf2P > 0.01 && (
        <ellipse
          cx={60 + 17 * leaf2P}
          cy={leaf2Y}
          rx={16 * leaf2P}
          ry={7.5 * leaf2P}
          fill={leafColor}
          opacity={Math.min(1, leaf2P * 1.5)}
          transform={`rotate(38, ${60 + 17 * leaf2P}, ${leaf2Y})`}
          style={{ transition: 'all 0.9s ease' }}
        />
      )}

      {flowerP > 0.01 && (
        <g transform={`translate(60, ${stemTopY})`} opacity={flowerP}
          style={{ transition: 'opacity 0.9s ease' }}>
          {[0, 60, 120, 180, 240, 300].map(angle => {
            const rad = (angle * Math.PI) / 180
            const px = Math.cos(rad) * 10 * flowerP
            const py = Math.sin(rad) * 10 * flowerP
            return (
              <ellipse key={angle}
                cx={px} cy={py}
                rx={7 * flowerP} ry={4.5 * flowerP}
                fill={petalColor}
                transform={`rotate(${angle}, ${px}, ${py})`}
              />
            )
          })}
          <circle cx="0" cy="0" r={5.5 * flowerP} fill={petalCenter} />
        </g>
      )}
    </svg>
  )
}
