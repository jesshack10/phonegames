export default function HourglassAnim({ progress, phase }) {
  const color = phase === 'work' ? '#f59e0b' : '#2dd4bf'

  const topSurfaceY = 10 + progress * 68
  const topSandH = (1 - progress) * 68
  const botSandY = 150 - progress * 68
  const botSandH = progress * 68
  const isFlowing = progress > 0.01 && progress < 0.99

  return (
    <svg viewBox="0 0 100 160" width="110" height="160" style={{ overflow: 'visible' }}>
      <defs>
        <clipPath id="hg-clip-top">
          <polygon points="10,10 90,10 52,80 48,80" />
        </clipPath>
        <clipPath id="hg-clip-bot">
          <polygon points="48,82 52,82 90,150 10,150" />
        </clipPath>
      </defs>

      <polygon points="10,10 90,10 52,80 48,80"
        fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="48,82 52,82 90,150 10,150"
        fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="5" y1="10" x2="95" y2="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
      <line x1="5" y1="150" x2="95" y2="150" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />

      {topSandH > 0 && (
        <g clipPath="url(#hg-clip-top)">
          <rect x="0" y={topSurfaceY} width="100" height={topSandH + 4}
            fill={color} opacity="0.75"
            style={{ transition: 'y 0.9s ease, height 0.9s ease' }}
          />
        </g>
      )}

      {botSandH > 0 && (
        <g clipPath="url(#hg-clip-bot)">
          <rect x="0" y={botSandY} width="100" height={botSandH + 4}
            fill={color} opacity="0.75"
            style={{ transition: 'y 0.9s ease, height 0.9s ease' }}
          />
        </g>
      )}

      {isFlowing && (
        <>
          <line x1="50" y1="79" x2="50" y2="83"
            stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          <circle cx="50" cy="88" r="1.8" fill={color} opacity="0.7">
            <animateTransform attributeName="transform" type="translate"
              values="0,0; 0,10; 0,0" dur="0.45s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0.15;0.7" dur="0.45s" repeatCount="indefinite" />
          </circle>
          <circle cx="50" cy="97" r="1.2" fill={color} opacity="0.4">
            <animateTransform attributeName="transform" type="translate"
              values="0,0; 0,7; 0,0" dur="0.55s" repeatCount="indefinite" begin="0.22s" />
            <animate attributeName="opacity" values="0.4;0.05;0.4" dur="0.55s" repeatCount="indefinite" begin="0.22s" />
          </circle>
        </>
      )}

      <line x1="16" y1="18" x2="20" y2="30"
        stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
