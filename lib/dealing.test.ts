import { describe, expect, it } from 'vitest'
import { appendUsedWords, dealtWordsOrFallback, initialStackBoard } from './dealing'
import { buildGameMode } from './gameMode'

describe('dealing helpers', () => {
  it('normalizes used-word history while preserving first-seen order', () => {
    expect(appendUsedWords([' alpha ', 'BRAVO'], ['ALPHA', '', ' charlie '])).toEqual([
      'ALPHA',
      'BRAVO',
      'CHARLIE',
    ])
  })

  it('uses a complete dealt payload before falling back to bundled emergency words', () => {
    expect(dealtWordsOrFallback('bidding', 3, [], [' custom one ', 'Custom Two', 'custom three'])).toEqual([
      'CUSTOM ONE',
      'CUSTOM TWO',
      'CUSTOM THREE',
    ])

    const fallback = dealtWordsOrFallback('bidding', 2, [' ALPHA '], ['partial'], () => 0)
    expect(fallback).toHaveLength(2)
    expect(fallback).not.toContain('PARTIAL')
    expect(fallback).not.toContain('ALPHA')
  })

  it('builds stack boards from mode rules and supplied stack deals', () => {
    const mode = buildGameMode({
      stacks: {
        wordCount: 2,
        rounds: [{ number: 7, turns: 4, startTeam: 1 }],
        options: [
          { id: 'easy', label: 'Easy', wordDeck: 'green', pointsPerWord: 1, color: '#2de584' },
          { id: 'hard', label: 'Hard', wordDeck: 'red', pointsPerWord: 3, color: '#ff3a6d' },
        ],
      },
    })

    const { board, drawnWords } = initialStackBoard(mode, 7, [], {
      wordsByStack: {
        easy: [' apple ', 'bread'],
        hard: ['gravity', 'fiction'],
      },
      definitions: {
        APPLE: 'fruit',
        BREAD: 'food',
      },
    })

    expect(board).toEqual({
      wordsByStack: {
        easy: ['APPLE', 'BREAD'],
        hard: ['GRAVITY', 'FICTION'],
      },
      definitions: {
        APPLE: 'fruit',
        BREAD: 'food',
      },
      usedStackIds: [],
      currentTeam: 1,
      turnsLeft: 4,
      roundNumber: 7,
    })
    expect(drawnWords).toEqual(['APPLE', 'BREAD', 'GRAVITY', 'FICTION'])
  })
})
