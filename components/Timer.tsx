'use client'

type TimerSize = 'xs' | 'sm' | 'md' | 'lg'

interface TimerProps {
  timeLeft: number
  total: number
  size?: TimerSize
  landscapeShortSize?: TimerSize
}

const RING: Record<TimerSize, number> = { lg: 248, md: 176, sm: 132, xs: 104 }
const TEXT: Record<TimerSize, string> = { lg: 'text-7xl', md: 'text-5xl', sm: 'text-4xl', xs: 'text-3xl' }

function TimerRing({ timeLeft, total, size }: { timeLeft: number; total: number; size: TimerSize }) {
  const safeTotal = Math.max(1, total)
  const pct = Math.max(0, Math.min(100, (timeLeft / safeTotal) * 100))
  const urgent = timeLeft <= 10
  const warning = timeLeft <= 20
  const ring = RING[size]

  return (
    <div
      className="relative grid place-items-center shrink-0"
      style={{
        width: ring,
        height: ring,
        borderRadius: ring / 2,
        background: `conic-gradient(${urgent ? '#ff3a6d' : '#ffd23f'} ${pct}%, rgba(255,255,255,0.08) 0)`,
      }}
      aria-label={`${timeLeft} seconds left`}
    >
      <div className="absolute inset-2 rounded-full bg-[#0a0d14] border border-white/10" />
      <div className="relative flex flex-col items-center">
        <div className={`${TEXT[size]} font-black tabular-nums leading-none tracking-normal transition-colors duration-500 ${
          urgent ? 'text-[#ff3a6d]' : warning ? 'text-[#ffd23f]' : 'text-white'
        }`}>
          {timeLeft}
        </div>
        <div className="mono-label mt-1 text-[10px] text-white/45">seconds</div>
      </div>
    </div>
  )
}

export default function Timer({ timeLeft, total, size = 'sm', landscapeShortSize }: TimerProps) {
  if (landscapeShortSize) {
    return (
      <>
        <div className="landscape-short:hidden">
          <TimerRing timeLeft={timeLeft} total={total} size={size} />
        </div>
        <div className="hidden landscape-short:block">
          <TimerRing timeLeft={timeLeft} total={total} size={landscapeShortSize} />
        </div>
      </>
    )
  }
  return <TimerRing timeLeft={timeLeft} total={total} size={size} />
}
