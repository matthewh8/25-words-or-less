'use client'

import type { TeamState } from '@/lib/gameState'

interface ScoreboardProps {
  teams: [TeamState, TeamState]
  highlight?: 0 | 1
  compact?: boolean
}

export default function Scoreboard({ teams, highlight, compact }: ScoreboardProps) {
  const colors = ['#ff3a6d', '#3a8bff'] as const

  if (compact) {
    return (
      <div className="flex min-w-0 max-w-full flex-1 gap-2 justify-center">
        {teams.map((t, i) => (
          <div
            key={i}
            className={`min-w-0 flex-1 rounded-md px-2 py-2 text-center transition-all sm:px-3 ${
              highlight === i
                ? 'bg-[#ffd23f] text-[#0a0d14]'
                : 'bg-[#141826] border border-white/10 text-white'
            }`}
          >
            <div className="mono-label flex min-w-0 items-center justify-center gap-1.5 text-[9px] opacity-70">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colors[i] }} />
              <span className="min-w-0 truncate">{t.name}</span>
            </div>
            <div className="text-xl font-black tabular-nums tracking-normal">{t.score.toLocaleString()}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 gap-3">
      {teams.map((t, i) => (
        <div
          key={i}
          className={`min-w-0 flex-1 rounded-lg p-5 text-center transition-all ${
            highlight === i
              ? 'bg-[#ffd23f] text-[#0a0d14]'
              : 'bg-[#141826] border border-white/10 text-white'
          }`}
        >
          <div className="mono-label mb-1 flex min-w-0 items-center justify-center gap-2 text-[10px] opacity-70">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[i] }} />
            <span className="min-w-0 truncate">{t.name}</span>
          </div>
          <div className="text-5xl font-black tabular-nums tracking-normal">{t.score.toLocaleString()}</div>
          <div className="mono-label mt-1 text-[9px] opacity-45">points</div>
        </div>
      ))}
    </div>
  )
}
