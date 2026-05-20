'use client'

import type { TeamState } from '@/lib/gameState'

type TeamNameBlockTeam = Pick<TeamState, 'name' | 'players'>

interface TeamNameBlockProps {
  team: TeamNameBlockTeam
  className?: string
  nameClassName?: string
  playersClassName?: string
  emptyLabel?: string
  maxPlayers?: number
}

export function teamPlayerLine(players: string[], emptyLabel = 'No players assigned', maxPlayers = 5): string {
  if (!players.length) return emptyLabel
  const visible = players.slice(0, maxPlayers)
  const extra = players.length - visible.length
  return extra > 0 ? `${visible.join(' / ')} / +${extra}` : visible.join(' / ')
}

export default function TeamNameBlock({
  team,
  className = '',
  nameClassName = '',
  playersClassName = '',
  emptyLabel,
  maxPlayers,
}: TeamNameBlockProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`min-w-0 truncate ${nameClassName}`}>{team.name}</div>
      <div className={`min-w-0 truncate ${playersClassName}`}>
        {teamPlayerLine(team.players, emptyLabel, maxPlayers)}
      </div>
    </div>
  )
}
