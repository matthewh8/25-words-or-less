import { describe, expect, it } from 'vitest'
import { DEFAULT_GAME_MODE } from './gameMode'
import { firstParam, parseGameQuery } from './gameQuery'

describe('game query parsing', () => {
  it('uses the first repeated query value to match Next searchParams semantics', () => {
    expect(firstParam(['first', 'second'])).toBe('first')
    expect(firstParam('only')).toBe('only')
    expect(firstParam(undefined)).toBeUndefined()
  })

  it('normalizes team names, player lists, and cross-team duplicates', () => {
    const parsed = parseGameQuery({
      t1: '  A very very very very long team name  ',
      t2: '',
      p1: ' Ava | Ben | Ava | This Player Name Is Definitely Too Long ',
      p2: 'Ben|Cam|  |Cam',
      challenges: '0',
      alcohol: '1',
    }, DEFAULT_GAME_MODE)

    expect(parsed.team1Name).toBe('A very very very very lo')
    expect(parsed.team2Name).toBe('Team 2')
    expect(parsed.teamPlayers).toEqual([
      ['Ava', 'Ben', 'This Player Name Is Defi'],
      ['Cam'],
    ])
    expect(parsed.challengeSettings).toEqual({ enabled: false, includeAlcohol: true })
  })

  it('normalizes escaped separator characters inside URL roster names', () => {
    const parsed = parseGameQuery({
      p1: 'Ava%7CBen|Cam',
      p2: 'Cam|Dee%7CRay',
    }, DEFAULT_GAME_MODE)

    expect(parsed.teamPlayers).toEqual([
      ['Ava Ben', 'Cam'],
      ['Dee Ray'],
    ])
  })

  it('caps URL player payloads and falls back to mode challenge defaults', () => {
    const parsed = parseGameQuery({
      p1: Array.from({ length: 40 }, (_, index) => `P${index}`).join('|'),
      challenges: 'maybe',
      alcohol: 'maybe',
    }, DEFAULT_GAME_MODE)

    expect(parsed.teamPlayers[0]).toHaveLength(24)
    expect(parsed.teamPlayers[0][0]).toBe('P0')
    expect(parsed.teamPlayers[0][23]).toBe('P23')
    expect(parsed.challengeSettings).toEqual({
      enabled: DEFAULT_GAME_MODE.challenge.enabledByDefault,
      includeAlcohol: DEFAULT_GAME_MODE.challenge.includeAlcoholByDefault,
    })
  })

  it('caps combined URL rosters to the setup player limit', () => {
    const parsed = parseGameQuery({
      p1: Array.from({ length: 20 }, (_, index) => `A${index}`).join('|'),
      p2: Array.from({ length: 20 }, (_, index) => `B${index}`).join('|'),
    }, DEFAULT_GAME_MODE)

    expect(parsed.teamPlayers[0]).toHaveLength(20)
    expect(parsed.teamPlayers[1]).toHaveLength(4)
    expect(parsed.teamPlayers[1]).toEqual(['B0', 'B1', 'B2', 'B3'])
  })
})
