'use client'

import type { TeamIndex } from '@/lib/teamSetup'

interface PlayerChipProps {
  player: string
  assignment: TeamIndex | null
  team1Name: string
  team2Name: string
  onAssign: (player: string, team: TeamIndex | null) => void
  onRemove: (player: string) => void
}

export default function PlayerChip({ player, assignment, team1Name, team2Name, onAssign, onRemove }: PlayerChipProps) {
  return (
    <div className="grid h-8 min-w-0 shrink-0 basis-[calc(50%_-_0.1875rem)] grid-cols-[minmax(0,1fr)_auto] items-center gap-1 overflow-hidden rounded-md border border-white/10 bg-white/[0.055] px-1.5 leading-none sm:h-9 sm:basis-[calc(50%_-_0.1875rem)] sm:gap-1.5 sm:px-2 2xl:basis-[calc(33.333%_-_0.25rem)]">
      <span className="min-w-0 truncate text-[11px] font-black leading-none sm:text-xs">{player}</span>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {assignment !== null && (
          <button
            type="button"
            onClick={() => onAssign(player, null)}
            aria-label={`Move ${player} to bench`}
            className="h-5 w-5 rounded border border-[#ffd23f]/35 text-[9px] font-black leading-none text-[#ffd23f] transition-colors hover:bg-[#ffd23f]/10 sm:h-6 sm:w-6"
          >
            B
          </button>
        )}
        {assignment !== 0 && (
          <button
            type="button"
            onClick={() => onAssign(player, 0)}
            aria-label={`Move ${player} to ${team1Name || 'Team 1'}`}
            className="h-5 w-5 rounded border border-[#ff3a6d]/35 text-[9px] font-black leading-none text-[#ff8cab] transition-colors hover:bg-[#ff3a6d]/10 sm:h-6 sm:w-6"
          >
            1
          </button>
        )}
        {assignment !== 1 && (
          <button
            type="button"
            onClick={() => onAssign(player, 1)}
            aria-label={`Move ${player} to ${team2Name || 'Team 2'}`}
            className="h-5 w-5 rounded border border-[#3a8bff]/35 text-[9px] font-black leading-none text-[#8bb8ff] transition-colors hover:bg-[#3a8bff]/10 sm:h-6 sm:w-6"
          >
            2
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(player)}
          aria-label={`Remove ${player}`}
          className="h-5 w-5 rounded border border-white/10 text-[9px] leading-none text-white/45 transition-colors hover:text-white sm:h-6 sm:w-6"
        >
          x
        </button>
      </div>
    </div>
  )
}
