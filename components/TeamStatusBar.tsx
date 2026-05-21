'use client'

import type { TeamState } from '@/lib/gameState'
import { teamPlayerLine } from './TeamNameBlock'

interface TeamStatusBarProps {
  teams: [TeamState, TeamState]
  activeTeam?: 0 | 1
  activeLabel?: string
  caption?: string
  compact?: boolean
  showScores?: boolean
}

const TEAM_COLORS = ['#ff3a6d', '#3a8bff'] as const

export default function TeamStatusBar({
  teams,
  activeTeam,
  activeLabel = 'Up',
  caption,
  compact,
  showScores = true,
}: TeamStatusBarProps) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg border border-white/10 bg-[#101522] ${compact ? 'p-2' : 'p-3 md:p-4'}`} aria-label="Team assignments">
      {caption && (
        <p className="mono-label mb-2 truncate text-[9px] font-bold text-[#ffd23f] md:text-[10px]">{caption}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {teams.map((team, index) => {
          const teamIndex = index as 0 | 1
          const active = activeTeam === teamIndex
          const playerLine = teamPlayerLine(team.players, 'No players assigned', compact ? 3 : 4, compact ? 24 : 32)
          return (
            <div
              key={`${team.name}-${index}`}
              className={`min-w-0 rounded-md border px-2 py-2 transition-all md:px-3 ${
                active
                  ? 'border-[#ffd23f]/70 bg-[#ffd23f]/12 shadow-[0_0_0_1px_rgba(255,210,63,0.18)]'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TEAM_COLORS[teamIndex] }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className="min-w-0 flex-1 truncate text-sm font-black uppercase tracking-normal text-white md:text-base">{team.name}</div>
                      {active && (
                        <span className="shrink-0 rounded-sm bg-[#ffd23f] px-1.5 py-0.5 text-[8px] font-black uppercase text-[#0a0d14]">
                          {activeLabel}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 truncate text-[10px] font-bold leading-snug text-white/45 md:text-[11px]">{playerLine}</div>
                  </div>
                </div>
                {showScores && (
                  <div className={`shrink-0 text-xl font-black tabular-nums tracking-normal ${active ? 'text-[#ffd23f]' : 'text-white'} md:text-2xl`}>
                    {team.score.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
