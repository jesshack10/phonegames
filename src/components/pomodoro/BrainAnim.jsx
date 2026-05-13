const BRAIN_PATH =
  'M 15,65 C 10,52 10,38 18,30 C 18,18 28,10 40,14 C 44,6 54,4 60,10 ' +
  'C 66,4 76,6 80,14 C 92,10 102,18 102,30 C 110,38 110,52 105,65 ' +
  'C 108,76 98,80 88,76 C 84,86 74,90 60,87 C 46,90 36,86 32,76 ' +
  'C 22,80 12,76 15,65 Z'

export default function BrainAnim({ progress, phase }) {
  const color = phase === 'work' ? '#4ade80' : '#a78bfa'

  function p(start, end) {
    return Math.min(1, Math.max(0, (progress - start) / (end - start)))
  }

  // Stage 1 (0–30%): outline strokes in
  const BRAIN_PERIM = 400
  const outlineP = p(0, 0.30)
  const outlineOffset = BRAIN_PERIM * (1 - outlineP)
  const glowP = p(0.88, 1.0)

  // Stage 2 (30–65%): four wrinkles appear sequentially
  const WRINKLE_LEN = 30
  const wrinkles = [
    { d: 'M 28,40 C 33,32 43,32 48,40', prog: p(0.30, 0.43) },
    { d: 'M 72,38 C 77,30 87,32 92,40', prog: p(0.40, 0.53) },
    { d: 'M 52,30 C 58,24 62,24 68,30', prog: p(0.50, 0.60) },
    { d: 'M 34,56 C 44,48 58,48 66,56', prog: p(0.56, 0.65) },
  ]

  // Stage 3 (65–90%): semitransparent fill rises from bottom
  const fillP = p(0.65, 0.90)
  const fillY = 90 - fillP * (90 - 6)
  const fillH = 90 - fillY + 5

  // Stage 4 (90–100%): sinister glowing eyes appear
  const eyeP = p(0.90, 1.0)
  const eyeHi = (eyeP * 0.9).toFixed(2)
  const eyeLo = (eyeP * 0.2).toFixed(2)

  return (
    <svg viewBox="0 0 120 110" width="130" height="120" style={{ overflow: 'visible' }}>
      <defs>
        <filter id="brain-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="brain-fill-clip">
          <path d={BRAIN_PATH} />
        </clipPath>
      </defs>

      {/* Stage 3: fill — rendered first so outline sits on top */}
      {fillP > 0 && (
        <g clipPath="url(#brain-fill-clip)">
          <rect
            x="0" y={fillY} width="120" height={fillH}
            fill={color} opacity="0.22"
            style={{ transition: 'y 0.9s ease, height 0.9s ease' }}
          />
        </g>
      )}

      {/* Stage 2: wrinkles */}
      {wrinkles.map((w, i) => w.prog > 0.01 && (
        <path
          key={i}
          d={w.d}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={w.prog * 0.65}
          strokeDasharray={WRINKLE_LEN}
          strokeDashoffset={WRINKLE_LEN * (1 - w.prog)}
          style={{ transition: 'stroke-dashoffset 0.9s ease, opacity 0.9s ease' }}
        />
      ))}

      {/* Stage 1: brain outline — on top of fill and wrinkles */}
      {outlineP > 0 && (
        <path
          d={BRAIN_PATH}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={BRAIN_PERIM}
          strokeDashoffset={outlineOffset}
          opacity={0.5 + glowP * 0.5}
          filter={glowP > 0.05 ? 'url(#brain-glow-filter)' : undefined}
          style={{ transition: 'stroke-dashoffset 0.9s ease, opacity 0.9s ease' }}
        />
      )}

      {/* Stage 4: sinister eyes, alternating pulse */}
      {eyeP > 0.01 && (
        <>
          <ellipse cx="44" cy="100" rx="6" ry="4" fill={color} opacity={eyeP * 0.12} />
          <ellipse cx="76" cy="100" rx="6" ry="4" fill={color} opacity={eyeP * 0.12} />
          <ellipse cx="44" cy="100" rx="4.5" ry="3" fill={color}>
            <animate attributeName="opacity"
              values={`${eyeHi};${eyeLo};${eyeHi}`}
              dur="1.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="76" cy="100" rx="4.5" ry="3" fill={color}>
            <animate attributeName="opacity"
              values={`${eyeLo};${eyeHi};${eyeLo}`}
              dur="1.5s" repeatCount="indefinite" begin="0.75s" />
          </ellipse>
        </>
      )}
    </svg>
  )
}
