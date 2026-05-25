import { describe, expect, it } from 'vitest'
import { actionFromDeal, planDeal, type StackDealResponse, type WordsDealResponse } from './dealPlan'
import { buildGameMode } from './gameMode'
import { gameReducer, initGame, type GameState } from './gameState'

const bidWords: WordsDealResponse = {
  kind: 'words',
  deckId: 'bidding',
  words: ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'],
  definitions: {
    ALPHA: 'the first letter of the Greek alphabet',
    BRAVO: 'a cry of approval',
  },
}

const moneyWords: WordsDealResponse = {
  kind: 'words',
  deckId: 'money',
  words: ['M1', 'M2', 'M3'],
  definitions: {
    M1: 'money word one',
  },
}

const stackDeal: StackDealResponse = {
  kind: 'stack',
  roundNumber: 2,
  drawnWords: ['G1', 'G2', 'Y1', 'Y2'],
  wordsByStack: {
    green: ['G1', 'G2'],
    yellow: ['Y1', 'Y2'],
  },
  definitions: {
    G1: 'green word one',
    Y1: 'yellow word one',
  },
}

function bidResultState(): GameState {
  const mode = buildGameMode({ bidding: { contests: 1 } })
  const bidding = gameReducer(initGame('Team A', 'Team B', [], mode), {
    type: 'START_BIDDING',
    firstTeam: 0,
    words: bidWords.words,
  })
  const afterBid = gameReducer(bidding, { type: 'PLACE_BID', amount: 20 })
  const conceded = gameReducer(afterBid, { type: 'CONCEDE' })
  const cluing = gameReducer(conceded, { type: 'START_CLUING_NOW' })
  return gameReducer(cluing, { type: 'END_CLUING' })
}

describe('deal planning', () => {
  it('plans the opening bidding deal and converts the response into a reducer action', () => {
    const state = initGame('Team A', 'Team B', ['USED'])
    const plan = planDeal(state, { type: 'ADVANCE_PHASE', roundTime: 30 }, () => 1)

    expect(plan).toMatchObject({
      type: 'start-bidding',
      firstTeam: 1,
      roundTime: 30,
      request: { kind: 'bidding', usedWords: ['USED'] },
    })
    if (plan.type === 'direct') throw new Error('expected async deal plan')

    expect(actionFromDeal(plan, bidWords)).toEqual({
      type: 'START_BIDDING',
      firstTeam: 1,
      words: bidWords.words,
      wordDefinitions: bidWords.definitions,
      roundTime: 30,
    })
  })

  it('uses an injected first team before random planning for deterministic callers', () => {
    const state = initGame('Team A', 'Team B')
    const plan = planDeal(state, { type: 'ADVANCE_PHASE', firstTeam: 0 }, () => 1)

    expect(plan).toMatchObject({
      type: 'start-bidding',
      firstTeam: 0,
    })
  })

  it('deals the first stack board after the last bidding contest', () => {
    const state = bidResultState()
    const plan = planDeal(state, { type: 'NEXT_AFTER_RESULT' })

    expect(plan).toMatchObject({
      type: 'next-stack',
      request: { kind: 'stack', roundNumber: 2 },
    })
    if (plan.type === 'direct') throw new Error('expected stack deal plan')

    expect(actionFromDeal(plan, stackDeal)).toEqual({
      type: 'NEXT_AFTER_RESULT',
      nextStackDeal: stackDeal,
    })
  })

  it('deals money words from the money intro phase', () => {
    const state: GameState = { ...initGame('Team A', 'Team B'), phase: 'money_intro' }
    const plan = planDeal(state, { type: 'ADVANCE_PHASE', moneyTime: 45 })

    expect(plan).toMatchObject({
      type: 'start-money',
      moneyTime: 45,
      request: { kind: 'money' },
    })
    if (plan.type === 'direct') throw new Error('expected money deal plan')

    expect(actionFromDeal(plan, moneyWords)).toEqual({
      type: 'START_MONEY_ROUND',
      words: moneyWords.words,
      wordDefinitions: moneyWords.definitions,
      moneyTime: 45,
    })
  })

  it('does not request refresh deals outside active bidding', () => {
    const bidding = gameReducer(initGame('Team A', 'Team B'), {
      type: 'START_BIDDING',
      firstTeam: 0,
      words: bidWords.words,
    })
    const afterBid = gameReducer(bidding, { type: 'PLACE_BID', amount: 20 })
    const conceded = gameReducer(afterBid, { type: 'CONCEDE' })
    const cluing = gameReducer(conceded, { type: 'START_CLUING_NOW' })

    expect(planDeal(cluing, { type: 'REFRESH_BID' })).toEqual({
      type: 'direct',
      action: { type: 'REFRESH_BID' },
    })
  })

  it('keeps non-dealing actions synchronous', () => {
    expect(planDeal(initGame('Team A', 'Team B'), { type: 'PLACE_BID', amount: 20 })).toEqual({
      type: 'direct',
      action: { type: 'PLACE_BID', amount: 20 },
    })
  })

  it('throws when a deal response does not match the planned action', () => {
    const state = initGame('Team A', 'Team B')
    const plan = planDeal(state, { type: 'ADVANCE_PHASE' }, () => 0)
    if (plan.type === 'direct') throw new Error('expected async deal plan')

    expect(() => actionFromDeal(plan, stackDeal)).toThrow('Expected words deal response')
  })
})
