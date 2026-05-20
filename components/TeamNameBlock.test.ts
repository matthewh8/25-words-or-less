import { describe, expect, it } from 'vitest'
import { teamPlayerLine } from './TeamNameBlock'

describe('teamPlayerLine', () => {
  it('collapses large rosters into a bounded one-line summary', () => {
    const line = teamPlayerLine([
      'Alexandria Montgomery',
      'Benjamin',
      'Cassandra',
      'Dominic',
      'Evangeline',
      'Fatima',
      'Gabriel',
    ], 'No players', 5, 24)

    expect(line.length).toBeLessThanOrEqual(24)
    expect(line).toContain('+6')
  })

  it('keeps several short names visible when they fit', () => {
    expect(teamPlayerLine(['Ava', 'Ben', 'Cam'], 'No players', 5, 24)).toBe('Ava / Ben / Cam')
  })
})
