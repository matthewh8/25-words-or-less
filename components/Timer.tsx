'use client'

interface TimerProps {
  timeLeft: number
  total: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export default function Timer({ timeLeft, total, size = 'sm' }: TimerProps) {
  const safeTotal = Math.max(1, total)
  const pct = Math.max(0, Math.min(100, (timeLeft / safeTotal) * 100))
  const urgent = timeLeft <= 10
  const warning = timeLeft <= 20
  const ring = size === 'lg' ? 248 : size === 'md' ? 176 : size === 'xs' ? 104 : 132
  const text = size === 'lg' ? 'text-7xl' : size === 'md' ? 'text-5xl' : size === 'xs' ? 'text-3xl' : 'text-4xl'

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
        <div className={`${text} font-black tabular-nums leading-none tracking-normal transition-colors duration-500 ${
          urgent ? 'text-[#ff3a6d]' : warning ? 'text-[#ffd23f]' : 'text-white'
        }`}>
          {timeLeft}
        </div>
        <div className="mono-label mt-1 text-[10px] text-white/45">seconds</div>
      </div>
    </div>
  )
}
