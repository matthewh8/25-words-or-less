import { describe, expect, it } from 'vitest'
import { buildGameMode } from './gameMode'
import { scoreCluing, type ScoringCluingState } from './scoring'

function cluing(overrides: Partial<ScoringCluingState> = {}): ScoringCluingState {
  return {
    stream: 'bidding',
    words: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'],
    guessed: [false, false, false, false, false],
    cluingTeam: 0,
    ...overrides,
  }
}

describe('scoreCluing', () => {
  it('scores bid success and failure to the correct team', () => {
    expect(scoreCluing(cluing({ guessed: [true, true, true, true, true] }))).toMatchObject({
      points: 10,
      awardTeam: 0,
      allCorrect: true,
    })

    expect(scoreCluing(cluing({ guessed: [true, false, false, false, false] }))).toMatchObject({
      points: 5,
      awardTeam: 1,
      allCorrect: false,
    })
  })

  it('honors configured bid failure award rules', () => {
    const cluingFailure = buildGameMode({
      bidding: {
        failureAward: 'cluing',
        failurePoints: 8,
      },
    })
    expect(scoreCluing(cluing({ cluingTeam: 1, guessed: [true, false, false, false, false] }), cluingFailure))
      .toMatchObject({ points: 8, awardTeam: 1 })

    const noFailurePoints = buildGameMode({
      bidding: {
        failureAward: 'none',
        failurePoints: 8,
      },
    })
    expect(scoreCluing(cluing({ cluingTeam: 1, guessed: [true, false, false, false, false] }), noFailurePoints))
      .toMatchObject({ points: 0, awardTeam: 1 })
  })

  it('scores color rounds with per-word points and all-correct bonus', () => {
    expect(scoreCluing(cluing({
      stream: 'stack',
      stackId: 'yellow',
      guessed: [true, true, false, false, false],
    }))).toMatchObject({ points: 4, awardTeam: 0, allCorrect: false })

    expect(scoreCluing(cluing({
      stream: 'stack',
      stackId: 'red',
      guessed: [true, true, true, true, true],
    }))).toMatchObject({ points: 20, awardTeam: 0, allCorrect: true })
  })

  it('does not award fallback stack points for malformed stack state', () => {
    expect(scoreCluing(cluing({
      stream: 'stack',
      stackId: 'missing',
      guessed: [true, true, true, true, true],
    }))).toMatchObject({ points: 0, awardTeam: 0, allCorrect: true, moneyWon: false })
  })

  it('sets jackpot state only when all money words are correct', () => {
    expect(scoreCluing(cluing({
      stream: 'money',
      words: Array.from({ length: 10 }, (_, i) => `WORD${i}`),
      guessed: Array(10).fill(true),
    }))).toMatchObject({ points: 25, moneyWon: true })

    expect(scoreCluing(cluing({
      stream: 'money',
      words: Array.from({ length: 10 }, (_, i) => `WORD${i}`),
      guessed: [true, true, true, true, true, true, true, true, true, false],
    }))).toMatchObject({ points: 0, moneyWon: false })
  })

  it('does not treat an empty malformed clue round as all-correct', () => {
    expect(scoreCluing(cluing({ guessed: [], words: [] }))).toMatchObject({
      points: 0,
      awardTeam: 0,
      allCorrect: false,
      correctCount: 0,
    })

    expect(scoreCluing(cluing({ stream: 'money', guessed: [], words: [] }))).toMatchObject({
      points: 0,
      allCorrect: false,
      moneyWon: false,
    })
  })

  it('caps scoring to the number of dealt words in malformed clue state', () => {
    expect(scoreCluing(cluing({
      stream: 'stack',
      stackId: 'yellow',
      words: ['ONE', 'TWO'],
      guessed: [true, true, true, true],
    }))).toMatchObject({
      points: 9,
      correctCount: 2,
      allCorrect: true,
    })

    expect(scoreCluing(cluing({
      stream: 'money',
      words: ['ONE', 'TWO'],
      guessed: [true, true, false],
    }))).toMatchObject({
      points: 25,
      correctCount: 2,
      moneyWon: true,
    })
  })
})
