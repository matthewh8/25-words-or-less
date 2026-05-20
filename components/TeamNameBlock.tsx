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
  maxChars?: number
}

function truncatePlayerText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  if (maxChars <= 3) return value.slice(0, maxChars)
  return `${value.slice(0, maxChars - 3).trimEnd()}...`
}

export function teamPlayerLine(
  players: string[],
  emptyLabel = 'No players assigned',
  maxPlayers = 5,
  maxChars = 38
): string {
  const names = players.map(player => player.trim()).filter(Boolean)
  if (!names.length) return emptyLabel

  const charBudget = Math.max(8, maxChars)
  const visible: string[] = []
  const maxVisible = Math.max(1, maxPlayers)

  for (let i = 0; i < Math.min(names.length, maxVisible); i++) {
    const remaining = names.length - i - 1
    const suffix = remaining > 0 ? ` / +${remaining}` : ''
    const candidate = `${[...visible, names[i]].join(' / ')}${suffix}`
    if (candidate.length <= charBudget) {
      visible.push(names[i])
      continue
    }

    if (!visible.length) {
      const firstSuffix = names.length > 1 ? ` / +${names.length - 1}` : ''
      const firstBudget = Math.max(4, charBudget - firstSuffix.length)
      return `${truncatePlayerText(names[i], firstBudget)}${firstSuffix}`
    }
    break
  }

  const extra = names.length - visible.length
  const line = extra > 0 ? `${visible.join(' / ')} / +${extra}` : visible.join(' / ')
  return truncatePlayerText(line, charBudget)
}

export default function TeamNameBlock({
  team,
  className = '',
  nameClassName = '',
  playersClassName = '',
  emptyLabel,
  maxPlayers,
  maxChars,
}: TeamNameBlockProps) {
  const playerTitle = team.players.map(player => player.trim()).filter(Boolean).join(' / ')
  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`min-w-0 truncate ${nameClassName}`}>{team.name}</div>
      <div className={`min-w-0 truncate ${playersClassName}`} title={playerTitle || undefined}>
        {teamPlayerLine(team.players, emptyLabel, maxPlayers, maxChars)}
      </div>
    </div>
  )
}
