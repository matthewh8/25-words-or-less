import type { ChallengeSettings } from './challenges'
import { DEFAULT_GAME_MODE } from './gameMode'
import { normalizePlayerName, type TeamPlayers } from './teamSetup'

export type GameSearchParams = { [key: string]: string | string[] | undefined }

export interface ParsedGameQuery {
  team1Name: string
  team2Name: string
  teamPlayers: TeamPlayers
  challengeSettings: ChallengeSettings
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function shortName(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 24) : fallback
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const MAX_QUERY_PLAYERS = 24

function playerList(value: string | undefined, excluded: Set<string> = new Set(), limit = MAX_QUERY_PLAYERS): string[] {
  if (!value) return []
  const players = value
    .split('|')
    .map(name => normalizePlayerName(safeDecode(name)))
    .filter(name => name && !excluded.has(name))

  return Array.from(new Set(players)).slice(0, Math.max(0, limit))
}

function boolParam(value: string | undefined, fallback: boolean): boolean {
  if (value === '1') return true
  if (value === '0') return false
  return fallback
}

export function parseGameQuery(params: GameSearchParams): ParsedGameQuery {
  const teamOnePlayers = playerList(firstParam(params.p1))
  const teamOneSet = new Set(teamOnePlayers)
  const teamTwoPlayers = playerList(firstParam(params.p2), teamOneSet, MAX_QUERY_PLAYERS - teamOnePlayers.length)

  return {
    team1Name: shortName(firstParam(params.t1), 'Team 1'),
    team2Name: shortName(firstParam(params.t2), 'Team 2'),
    teamPlayers: [teamOnePlayers, teamTwoPlayers],
    challengeSettings: {
      enabled: boolParam(firstParam(params.challenges), DEFAULT_GAME_MODE.challenge.enabledByDefault),
      includeAlcohol: boolParam(firstParam(params.alcohol), DEFAULT_GAME_MODE.challenge.includeAlcoholByDefault),
    },
  }
}
