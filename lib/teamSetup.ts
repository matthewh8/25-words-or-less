export type TeamIndex = 0 | 1
export type TeamPlayers = [string[], string[]]

export function normalizePlayerName(value: string): string {
  return value.trim().replace(/\|/g, ' ').replace(/\s+/g, ' ').slice(0, 24)
}

export function parsePlayerNames(value: string, limit = 24): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map(normalizePlayerName)
        .filter(Boolean)
    )
  ).slice(0, limit)
}

export function assignPlayerToTeam(current: TeamPlayers, player: string, team: TeamIndex | null): TeamPlayers {
  const next: TeamPlayers = [
    current[0].filter(name => name !== player),
    current[1].filter(name => name !== player),
  ]
  if (team !== null) next[team] = [...next[team], player]
  return next
}

export function randomizeBalancedTeams(players: string[], random = Math.random): TeamPlayers {
  const copy = [...players]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const current = copy[i]
    copy[i] = copy[j]
    copy[j] = current
  }

  const teams: TeamPlayers = [[], []]
  copy.forEach((player, index) => teams[index % 2].push(player))
  return teams
}
