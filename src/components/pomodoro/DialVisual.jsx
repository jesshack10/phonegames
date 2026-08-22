// A kitchen-timer face: a tick per minute of the current phase, going out as
// each minute is spent, plus a thin arc carrying the seconds in between.
//
// Short phases get a finer step so the ring still reads as a dial — a two
// minute break would otherwise be two lonely marks. A normal 25 minute focus
// block stays at exactly one tick per minute.
const STEPS = [60, 30, 15, 10, 5]

export default function DialVisual({ remaining, totalSeconds, size, tickOn, tickOff, accent }) {
  const step = STEPS.find(s => totalSeconds / s >= 12) || STEPS[STEPS.length - 1]
  const count = Math.min(90, Math.max(1, Math.round(totalSeconds / step)))
  const spent = Math.min(count - 1, Math.floor((1 - remaining) * count))
  const weight = count > 60 ? 1.7 : count > 40 ? 2.3 : 3

  const ticks = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const current = i === spent
    ticks.push(
      <line
        key={i}
        x1={(100 + cos * 82).toFixed(2)}
        y1={(100 + sin * 82).toFixed(2)}
        x2={(100 + cos * (current ? 98 : 96)).toFixed(2)}
        y2={(100 + sin * (current ? 98 : 96)).toFixed(2)}
        stroke={i < spent ? tickOff : current ? accent : tickOn}
        strokeWidth={current ? weight * 1.5 : weight}
        strokeLinecap="round"
      />
    )
  }

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      aria-hidden="true"
    >
      {/* rotated so minute zero sits at twelve o'clock */}
      <g transform="rotate(-90 100 100)">
        {ticks}
        <circle
          cx="100"
          cy="100"
          r="74"
          fill="none"
          stroke={accent}
          strokeWidth="2.2"
          strokeLinecap="round"
          pathLength="1000"
          strokeDasharray={`${(1000 * remaining).toFixed(1)} 1000`}
          style={{ transition: 'stroke-dasharray 1s linear' }}
        />
      </g>
    </svg>
  )
}
