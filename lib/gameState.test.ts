import { describe, expect, it } from 'vitest'
import {
  canSkipCurrentWord,
  canPlaceBid,
  clampMoneySeconds,
  clampTurnSeconds,
  gameReducer,
  initGame,
  type CluingState,
  type GameState,
} from './gameState'
import { buildGameMode, DEFAULT_GAME_MODE } from './gameMode'

function startCluingByConcede(initial: GameState, amount = 20): GameState {
  const afterBid = gameReducer(initial, { type: 'PLACE_BID', amount })
  const conceded = gameReducer(afterBid, { type: 'CONCEDE' })
  return gameReducer(conceded, { type: 'START_CLUING_NOW' })
}

function cluing(overrides: Partial<CluingState> = {}): CluingState {
  return {
    stream: 'bidding',
    deckId: 'bidding',
    label: 'The Bid',
    words: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'],
    definitions: {},
    wordsLeft: 10,
    wordLimit: 10,
    timeLeft: 20,
    guessed: [false, false, false, false, false],
    skipCount: 0,
    cluingTeam: 0,
    currentWordIndex: 0,
    ...overrides,
  }
}

describe('bid validation', () => {
  it('allows only lower bids at or above the minimum', () => {
    expect(canPlaceBid(24, 25)).toBe(true)
    expect(canPlaceBid(25, 25)).toBe(false)
    expect(canPlaceBid(5, 25)).toBe(true)
    expect(canPlaceBid(4, 25)).toBe(false)
    expect(canPlaceBid(12.5, 25)).toBe(false)
    expect(DEFAULT_GAME_MODE.bidding.wordCount).toBe(5)
  })

  it('ignores invalid bids in the reducer', () => {
    const started = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })

    const invalid = gameReducer(started, { type: 'PLACE_BID', amount: 25 })
    expect(invalid.bid?.currentBid).toBe(25)
    expect(invalid.bid?.activeBidder).toBe(0)

    const valid = gameReducer(started, { type: 'PLACE_BID', amount: 20 })
    expect(valid.bid?.currentBid).toBe(20)
    expect(valid.bid?.activeBidder).toBe(1)
    expect(valid.bid?.biddingTeam).toBe(0)
  })

  it('enters premeditation when a team bids all the way to five before cluing starts', () => {
    const started = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })

    const wonBid = gameReducer(started, { type: 'PLACE_BID', amount: 5 })

    expect(wonBid.phase).toBe('round1_premeditation')
    expect(wonBid.bid?.currentBid).toBe(5)
    expect(wonBid.bid?.biddingTeam).toBe(0)
    expect(wonBid.cluing?.cluingTeam).toBe(0)
    expect(wonBid.cluing?.wordLimit).toBe(5)

    const started2 = gameReducer(wonBid, { type: 'START_CLUING_NOW' })
    expect(started2.phase).toBe('round1_cluing')
  })

  it('auto-advances from premeditation to cluing when the timer hits zero', () => {
    const started = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const conceded = gameReducer(started, { type: 'CONCEDE' })
    expect(conceded.phase).toBe('round1_premeditation')
    const lastTick: GameState = {
      ...conceded,
      bid: conceded.bid ? { ...conceded.bid, premeditationTimeLeft: 1 } : null,
    }
    const advanced = gameReducer(lastTick, { type: 'PREMEDITATION_TICK' })
    expect(advanced.phase).toBe('round1_cluing')
    expect(advanced.bid?.premeditationTimeLeft).toBe(0)
  })

  it('does not auto-concede when the bidding timer reaches zero', () => {
    const started = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const almostExpired: GameState = {
      ...started,
      bid: started.bid ? { ...started.bid, biddingTimeLeft: 1 } : null,
    }

    const expired = gameReducer(almostExpired, { type: 'BIDDING_TICK' })

    expect(expired.phase).toBe('round1_bidding')
    expect(expired.bid?.biddingTimeLeft).toBe(0)
    expect(expired.cluing).toBeNull()
  })

  it('ignores stale bidding actions after bidding has ended', () => {
    const started = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(started)

    expect(cluingState.phase).toBe('round1_cluing')
    expect(gameReducer(cluingState, { type: 'PLACE_BID', amount: 20 })).toBe(cluingState)
    expect(gameReducer(cluingState, { type: 'BIDDING_TICK' })).toBe(cluingState)
  })

  it('passes cluing to the opponent when the opener concedes before bidding', () => {
    const started = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const conceded = gameReducer(started, { type: 'CONCEDE' })
    expect(conceded.phase).toBe('round1_premeditation')
    expect(conceded.cluing?.cluingTeam).toBe(1)
    expect(conceded.cluing?.wordLimit).toBe(started.gameMode.bidding.maxBid)
    expect(gameReducer(conceded, { type: 'START_CLUING_NOW' }).phase).toBe('round1_cluing')
  })
})

describe('phase edges', () => {
  it('clamps turn and money timers with their own defaults', () => {
    const mode = buildGameMode({
      timing: {
        turnSeconds: 35,
        moneySeconds: 70,
        minSeconds: 10,
        maxSeconds: 120,
      },
    })

    expect(clampTurnSeconds(Number.NaN, mode)).toBe(35)
    expect(clampMoneySeconds(Number.NaN, mode)).toBe(70)
    expect(clampTurnSeconds(2, mode)).toBe(10)
    expect(clampMoneySeconds(500, mode)).toBe(120)
  })

  it('starts the money round with team one when regular scoring is tied', () => {
    const state: GameState = {
      ...initGame('A', 'B'),
      phase: 'money_intro',
      teams: [
        { name: 'A', score: 12, players: [] },
        { name: 'B', score: 12, players: [] },
      ],
    }

    const result = gameReducer(state, { type: 'START_MONEY_ROUND' })
    expect(result.phase).toBe('money_cluing')
    expect(result.cluing?.cluingTeam).toBe(0)
  })

  it('only allows skip when there is another unguessed word to move to', () => {
    expect(canSkipCurrentWord(cluing({
      guessed: [true, true, true, true, false],
      currentWordIndex: 4,
    }))).toBe(false)
    expect(canSkipCurrentWord(cluing({
      guessed: [true, true, false, true, false],
      currentWordIndex: 2,
    }))).toBe(true)
  })

  it('deals from action payloads instead of requiring a bundled client word bank', () => {
    const words = ['BID ONE', 'BID TWO', 'BID THREE', 'BID FOUR', 'BID FIVE']
    const started = gameReducer(
      initGame('A', 'B', [], buildGameMode({})),
      { type: 'START_BIDDING', firstTeam: 0, words }
    )

    expect(started.bid?.words).toEqual(words)
    expect(started.usedWords).toEqual(expect.arrayContaining(words))
  })

  it('keeps direct intro advancement deterministic unless a first team is supplied', () => {
    const defaultStarted = gameReducer(initGame('A', 'B'), { type: 'ADVANCE_PHASE' })
    expect(defaultStarted.phase).toBe('round1_bidding')
    expect(defaultStarted.bid?.activeBidder).toBe(0)

    const injectedStarted = gameReducer(initGame('A', 'B'), { type: 'ADVANCE_PHASE', firstTeam: 1 })
    expect(injectedStarted.phase).toBe('round1_bidding')
    expect(injectedStarted.bid?.activeBidder).toBe(1)
  })

  it('keeps the clue budget at zero and ends when spending with no words left', () => {
    const bidding = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const almostOut: GameState = {
      ...cluingState,
      cluing: cluingState.cluing ? { ...cluingState.cluing, wordsLeft: 1 } : null,
    }

    const atZero = gameReducer(almostOut, { type: 'WORD_USED' })
    expect(atZero.phase).toBe('round1_cluing')
    expect(atZero.cluing?.wordsLeft).toBe(0)

    const result = gameReducer(atZero, { type: 'WORD_USED' })
    expect(result.phase).toBe('round1_result')
    expect(result.cluing?.wordsLeft).toBe(0)
    expect(result.teams[1].score).toBe(10)
  })

  it('can win while exactly at zero words left', () => {
    const bidding = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const lastWord: GameState = {
      ...cluingState,
      cluing: cluingState.cluing
        ? { ...cluingState.cluing, wordsLeft: 0, guessed: [true, true, true, true, false], currentWordIndex: 4 }
        : null,
    }

    const result = gameReducer(lastWord, { type: 'MARK_CORRECT' })
    expect(result.phase).toBe('round1_result')
    expect(result.teams[0].score).toBe(10)
    expect(result.lastResult?.allCorrect).toBe(true)
  })

  it('does not spend a word when the last answer is marked correct', () => {
    const bidding = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const lastWord: GameState = {
      ...cluingState,
      cluing: cluingState.cluing
        ? { ...cluingState.cluing, wordsLeft: 1, guessed: [true, true, true, true, false], currentWordIndex: 4 }
        : null,
    }

    const result = gameReducer(lastWord, { type: 'MARK_CORRECT' })
    expect(result.phase).toBe('round1_result')
    expect(result.cluing?.wordsLeft).toBe(1)
  })

  it('does not count no-op skips when only one word is left unresolved', () => {
    const bidding = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const lastWord: GameState = {
      ...cluingState,
      cluing: cluingState.cluing
        ? { ...cluingState.cluing, guessed: [true, true, true, true, false], currentWordIndex: 4, skipCount: 2 }
        : null,
    }

    const skipped = gameReducer(lastWord, { type: 'MARK_SKIP' })
    expect(skipped).toBe(lastWord)
    expect(skipped.cluing?.skipCount).toBe(2)
    expect(skipped.cluing?.currentWordIndex).toBe(4)
  })

  it('adds one clue word back without exceeding the configured budget', () => {
    const bidding = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const spent: GameState = {
      ...cluingState,
      cluing: cluingState.cluing ? { ...cluingState.cluing, wordsLeft: 4, wordLimit: 5 } : null,
    }

    const refunded = gameReducer(spent, { type: 'WORD_REFUND' })
    expect(refunded.cluing?.wordsLeft).toBe(5)
    const capped = gameReducer(refunded, { type: 'WORD_REFUND' })
    expect(capped.cluing?.wordsLeft).toBe(5)
  })

  it('applies clue action flags from the game mode', () => {
    const mode = buildGameMode({
      clueActions: {
        allowSkip: false,
        allowBudgetRefund: false,
        autoAdvanceOnCorrect: false,
      },
    })
    const bidding = gameReducer(initGame('A', 'B', [], mode), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const started: GameState = {
      ...cluingState,
      cluing: cluingState.cluing ? { ...cluingState.cluing, wordsLeft: 4, wordLimit: 5 } : null,
    }

    const refunded = gameReducer(started, { type: 'WORD_REFUND' })
    expect(refunded.cluing?.wordsLeft).toBe(4)

    const skipped = gameReducer(started, { type: 'MARK_SKIP' })
    expect(skipped.cluing?.skipCount).toBe(0)
    expect(skipped.cluing?.currentWordIndex).toBe(0)

    const correct = gameReducer(started, { type: 'MARK_CORRECT' })
    expect(correct.cluing?.guessed[0]).toBe(true)
    expect(correct.cluing?.currentWordIndex).toBe(0)
  })

  it('ignores clue actions after the round has ended', () => {
    const bidding = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const result = gameReducer(cluingState, { type: 'END_CLUING' })

    const changed = gameReducer(result, { type: 'MARK_CORRECT' })
    expect(changed).toBe(result)
  })

  it('does not rescore if an end-cluing action arrives after the result screen', () => {
    const bidding = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const result = gameReducer(cluingState, { type: 'END_CLUING' })
    const duplicate = gameReducer(result, { type: 'END_CLUING' })

    expect(duplicate).toBe(result)
    expect(duplicate.teams[1].score).toBe(10)
  })

  it('ignores stale timer ticks after the round has ended', () => {
    const bidding = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const result = gameReducer(cluingState, { type: 'END_CLUING' })

    expect(gameReducer(result, { type: 'TIMER_TICK' })).toBe(result)
  })

  it('captures the revealed words, statuses, and dealt definitions when cluing ends', () => {
    const words = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO']
    const wordDefinitions = {
      ALPHA: 'the first letter of the Greek alphabet',
      BRAVO: 'a cry of approval',
    }
    const bidding = gameReducer(initGame('A', 'B'), {
      type: 'START_BIDDING',
      firstTeam: 0,
      words,
      wordDefinitions,
    })
    const cluingState = startCluingByConcede(bidding)
    const partiallyCorrect: GameState = {
      ...cluingState,
      cluing: cluingState.cluing ? { ...cluingState.cluing, guessed: [true, false, false, false, false] } : null,
    }

    const result = gameReducer(partiallyCorrect, { type: 'END_CLUING' })

    expect(result.lastReveal).toMatchObject({
      words,
      guessed: [true, false, false, false, false],
      definitions: wordDefinitions,
    })
  })

  it('ends a clue turn when the timer reaches zero', () => {
    const bidding = gameReducer(initGame('A', 'B'), { type: 'START_BIDDING', firstTeam: 0 })
    const cluingState = startCluingByConcede(bidding)
    const almostOut: GameState = {
      ...cluingState,
      cluing: cluingState.cluing ? { ...cluingState.cluing, timeLeft: 1 } : null,
    }

    const result = gameReducer(almostOut, { type: 'TIMER_TICK' })
    expect(result.phase).toBe('round1_result')
    expect(result.cluing?.timeLeft).toBe(0)
  })

  it('keeps invalid custom money times on the money default instead of the turn default', () => {
    const mode = buildGameMode({
      timing: {
        turnSeconds: 35,
        moneySeconds: 70,
        minSeconds: 10,
        maxSeconds: 120,
      },
    })
    const state: GameState = {
      ...initGame('A', 'B', [], mode),
      phase: 'money_intro',
    }

    const result = gameReducer(state, { type: 'START_MONEY_ROUND', moneyTime: Number.NaN })
    expect(result.phase).toBe('money_cluing')
    expect(result.moneyTime).toBe(70)
    expect(result.cluing?.timeLeft).toBe(70)
  })

  it('awards a successful money round to the leading team and then advances to final', () => {
    const state: GameState = {
      ...initGame('A', 'B'),
      phase: 'money_intro',
      teams: [
        { name: 'A', score: 10, players: [] },
        { name: 'B', score: 12, players: [] },
      ],
    }

    const words = Array.from({ length: state.gameMode.money.wordCount }, (_, i) => `MONEY ${i}`)
    const moneyStarted = gameReducer(state, { type: 'START_MONEY_ROUND', words })
    expect(moneyStarted.phase).toBe('money_cluing')
    expect(moneyStarted.cluing?.cluingTeam).toBe(1)

    const result = gameReducer({
      ...moneyStarted,
      cluing: moneyStarted.cluing ? {
        ...moneyStarted.cluing,
        guessed: Array(moneyStarted.cluing.words.length).fill(true),
      } : null,
    }, { type: 'END_CLUING' })

    expect(result.phase).toBe('money_result')
    expect(result.teams[1].score).toBe(12 + state.gameMode.money.jackpotPoints)
    expect(result.moneyWon).toBe(true)
    expect(result.lastResult).toMatchObject({ awardTeam: 1, allCorrect: true })

    const final = gameReducer(result, { type: 'NEXT_AFTER_RESULT' })
    expect(final.phase).toBe('final')
  })

  it('keeps close scores intact when the money round fails', () => {
    const state: GameState = {
      ...initGame('A', 'B'),
      phase: 'money_intro',
      teams: [
        { name: 'A', score: 14, players: [] },
        { name: 'B', score: 13, players: [] },
      ],
    }

    const words = Array.from({ length: state.gameMode.money.wordCount }, (_, i) => `MONEY ${i}`)
    const moneyStarted = gameReducer(state, { type: 'START_MONEY_ROUND', words })
    expect(moneyStarted.cluing?.cluingTeam).toBe(0)

    const result = gameReducer({
      ...moneyStarted,
      cluing: moneyStarted.cluing ? {
        ...moneyStarted.cluing,
        guessed: [...Array(moneyStarted.cluing.words.length - 1).fill(true), false],
      } : null,
    }, { type: 'END_CLUING' })

    expect(result.phase).toBe('money_result')
    expect(result.teams.map(team => team.score)).toEqual([14, 13])
    expect(result.moneyWon).toBe(false)
    expect(result.lastResult).toMatchObject({ points: 0, awardTeam: 0, allCorrect: false })
  })

  it('prevents reusing a color stack in the same round', () => {
    const state: GameState = {
      ...initGame('A', 'B'),
      phase: 'round23_selection',
      currentRound: 2,
      stackBoard: {
        wordsByStack: {
          green: ['G1', 'G2', 'G3', 'G4', 'G5'],
          yellow: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'],
          red: ['R1', 'R2', 'R3', 'R4', 'R5'],
        },
        definitions: {
          Y1: 'yellow one',
        },
        usedStackIds: ['green'],
        currentTeam: 0,
        turnsLeft: 3,
        roundNumber: 2,
      },
    }

    const unchanged = gameReducer(state, { type: 'SELECT_STACK', stackId: 'green' })
    expect(unchanged.phase).toBe('round23_selection')

    const invalid = gameReducer(state, { type: 'SELECT_STACK', stackId: 'missing' })
    expect(invalid).toBe(state)

    const selected = gameReducer(state, { type: 'SELECT_STACK', stackId: 'yellow' })
    expect(selected.phase).toBe('round23_cluing')
    expect(selected.cluing?.wordLimit).toBe(25)
  })

  it('adjusts a team score by delta and floors at zero', () => {
    const state = initGame('A', 'B')
    const withScore: GameState = {
      ...state,
      teams: [{ name: 'A', score: 10, players: [] }, { name: 'B', score: 5, players: [] }],
    }

    const up = gameReducer(withScore, { type: 'ADJUST_SCORE', teamId: 0, delta: 1 })
    expect(up.teams[0].score).toBe(11)
    expect(up.teams[1].score).toBe(5)

    const down = gameReducer(withScore, { type: 'ADJUST_SCORE', teamId: 1, delta: -1 })
    expect(down.teams[1].score).toBe(4)
    expect(down.teams[0].score).toBe(10)

    const floored = gameReducer(withScore, { type: 'ADJUST_SCORE', teamId: 1, delta: -10 })
    expect(floored.teams[1].score).toBe(0)

    const atZero = gameReducer(withScore, { type: 'ADJUST_SCORE', teamId: 1, delta: -5 })
    expect(atZero.teams[1].score).toBe(0)
  })

  it('advances when a stack round has turns left but no unused stacks', () => {
    const mode = buildGameMode({
      bidding: { contests: 1 },
      stacks: {
        rounds: [{ number: 2, turns: 3, startTeam: 0 }],
        options: [
          { id: 'solo', label: 'Solo', wordDeck: 'green', pointsPerWord: 100, color: '#2de584' },
        ],
      },
    })
    const state: GameState = {
      ...initGame('A', 'B', [], mode),
      phase: 'round23_result',
      currentRound: 2,
      stackBoard: {
        wordsByStack: { solo: ['S1', 'S2', 'S3', 'S4', 'S5'] },
        definitions: {},
        usedStackIds: ['solo'],
        currentTeam: 0,
        turnsLeft: 3,
        roundNumber: 2,
      },
    }

    const result = gameReducer(state, { type: 'NEXT_AFTER_RESULT' })
    expect(result.phase).toBe('money_intro')
  })
})
