'use client'

import { TeamState } from '@/lib/gameState'

interface ScoreboardProps {
  teams: [TeamState, TeamState]
  highlight?: 0 | 1
  compact?: boolean
}

export default function Scoreboard({ teams, highlight, compact }: ScoreboardProps) {
  if (compact) {
    return (
      <div className="flex gap-2 justify-center">
        {teams.map((t, i) => (
          <div
            key={i}
            className={`flex-1 px-3 py-2 rounded-xl text-center transition-all ${
              highlight === i
                ? 'bg-[#e8774d] text-white'
                : 'bg-white/[0.06] border border-white/[0.08] text-white'
            }`}
          >
            <div className="text-[10px] uppercase tracking-widest font-semibold opacity-60 truncate">{t.name}</div>
            <div className="text-lg font-black tabular-nums">{t.score.toLocaleString()}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      {teams.map((t, i) => (
        <div
          key={i}
          className={`flex-1 rounded-2xl p-5 text-center transition-all ${
            highlight === i
              ? 'bg-[#e8774d] text-white'
              : 'bg-white/[0.06] border border-white/[0.08] text-white'
          }`}
        >
          <div className="text-xs uppercase tracking-widest font-semibold opacity-60 mb-0.5 truncate">{t.name}</div>
          <div className="text-4xl font-black tabular-nums">{t.score.toLocaleString()}</div>
          <div className="text-xs mt-0.5 opacity-40">pts</div>
        </div>
      ))}
    </div>
  )
}
