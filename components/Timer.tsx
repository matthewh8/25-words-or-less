'use client'

interface TimerProps {
  timeLeft: number
  total: number
}

export default function Timer({ timeLeft, total }: TimerProps) {
  const pct = (timeLeft / total) * 100
  const urgent = timeLeft <= 10
  const warning = timeLeft <= 20

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className={`text-6xl font-black tabular-nums transition-colors duration-500 ${
        urgent ? 'text-red-400' : warning ? 'text-amber-400' : 'text-white'
      }`}>
        {timeLeft}
        <span className="text-2xl font-medium text-white/30">s</span>
      </div>
      <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            urgent ? 'bg-red-400' : warning ? 'bg-amber-400' : 'bg-[#e8774d]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
