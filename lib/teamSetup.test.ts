import { describe, expect, it } from 'vitest'
import { assignPlayerToTeam, normalizePlayerName, parsePlayerNames, randomizeBalancedTeams } from './teamSetup'

describe('team setup helpers', () => {
  it('parses comma and newline separated names with de-duping', () => {
    expect(parsePlayerNames('Ava, Ben\nAva,  Cam  ')).toEqual(['Ava', 'Ben', 'Cam'])
  })

  it('normalizes names that would otherwise break URL roster separators', () => {
    expect(normalizePlayerName('  Ava|Ben   Carter  ')).toBe('Ava Ben Carter')
    expect(parsePlayerNames('Ava|Ben, Cam')).toEqual(['Ava Ben', 'Cam'])
  })

  it('caps each player name and the player count', () => {
    const names = Array.from({ length: 30 }, (_, index) => `Player ${index}`)
    const parsed = parsePlayerNames(`A very very very very long player, ${names.join(',')}`)

    expect(parsed).toHaveLength(24)
    expect(parsed[0]).toBe('A very very very very lo')
    expect(parsed[23]).toBe('Player 22')
  })

  it('moves a player between bench and teams without duplicates', () => {
    const assigned = assignPlayerToTeam([['Ava'], ['Ben']], 'Ava', 1)
    expect(assigned).toEqual([[], ['Ben', 'Ava']])

    expect(assignPlayerToTeam(assigned, 'Ava', null)).toEqual([[], ['Ben']])
  })

  it('randomizes into balanced teams', () => {
    const teams = randomizeBalancedTeams(['A', 'B', 'C', 'D', 'E'], () => 0.5)

    expect(Math.abs(teams[0].length - teams[1].length)).toBeLessThanOrEqual(1)
    expect(new Set([...teams[0], ...teams[1]])).toEqual(new Set(['A', 'B', 'C', 'D', 'E']))
  })
})
