import { getNextStackRound, type WordDeckId } from './gameMode'
import type { StackDeal } from './dealing'
import type { GameAction, GameState } from './gameState'

export type DealRequest =
  | { kind: 'bidding'; modeId: string; usedWords: string[] }
  | { kind: 'money'; modeId: string; usedWords: string[] }
  | { kind: 'stack'; modeId: string; usedWords: string[]; roundNumber: number }
  | { kind: 'deck'; modeId: string; usedWords: string[]; deckId: WordDeckId; count: number }

export interface WordsDealResponse {
  kind: 'words'
  deckId: string
  words: string[]
  definitions?: Record<string, string>
}

export interface StackDealResponse extends StackDeal {
  kind: 'stack'
  roundNumber: number
  drawnWords: string[]
}

export type DealResponse = WordsDealResponse | StackDealResponse

export type DealPlan =
  | { type: 'direct'; action: GameAction }
  | { type: 'start-bidding'; request: DealRequest; firstTeam: 0 | 1; roundTime?: number }
  | { type: 'advance-stack'; request: DealRequest; action: Extract<GameAction, { type: 'ADVANCE_PHASE' }> }
  | { type: 'start-money'; request: DealRequest; moneyTime?: number }
  | { type: 'next-bid'; request: DealRequest }
  | { type: 'next-stack'; request: DealRequest }
  | { type: 'refresh-bid'; request: DealRequest }
  | { type: 'refresh-words'; request: DealRequest }

function dealBase(state: GameState): { modeId: string; usedWords: string[] } {
  return {
    modeId: state.gameMode.id,
    usedWords: state.usedWords,
  }
}

function isCluingPhase(phase: GameState['phase']): boolean {
  return phase === 'round1_cluing' || phase === 'round23_cluing' || phase === 'money_cluing'
}

export function randomTeam(): 0 | 1 {
  return Math.random() < 0.5 ? 0 : 1
}

export function planDeal(
  state: GameState,
  action: GameAction,
  pickFirstTeam: () => 0 | 1 = randomTeam
): DealPlan {
  const base = dealBase(state)

  if (action.type === 'ADVANCE_PHASE' && state.phase === 'round1_intro') {
    return {
      type: 'start-bidding',
      request: { ...base, kind: 'bidding' },
      firstTeam: action.firstTeam ?? pickFirstTeam(),
      roundTime: action.roundTime,
    }
  }

  if (action.type === 'ADVANCE_PHASE' && state.phase === 'round23_intro' && !state.stackBoard) {
    return {
      type: 'advance-stack',
      request: { ...base, kind: 'stack', roundNumber: state.currentRound },
      action,
    }
  }

  if (action.type === 'ADVANCE_PHASE' && state.phase === 'money_intro') {
    return {
      type: 'start-money',
      request: { ...base, kind: 'money' },
      moneyTime: action.moneyTime,
    }
  }

  if (action.type === 'NEXT_AFTER_RESULT' && state.phase === 'round1_result') {
    const newContests = state.round1Contests + 1
    if (newContests >= state.gameMode.bidding.contests) {
      const firstStackRound = state.gameMode.stacks.rounds[0]
      return {
        type: 'next-stack',
        request: { ...base, kind: 'stack', roundNumber: firstStackRound.number },
      }
    }

    return {
      type: 'next-bid',
      request: { ...base, kind: 'bidding' },
    }
  }

  if (action.type === 'NEXT_AFTER_RESULT' && state.phase === 'round23_result' && state.stackBoard) {
    const board = state.stackBoard
    const newTurns = board.turnsLeft - 1
    const stacksExhausted = board.usedStackIds.length >= state.gameMode.stacks.options.length
    const nextStackRound = getNextStackRound(state.gameMode, state.currentRound)

    if ((newTurns <= 0 || stacksExhausted) && nextStackRound) {
      return {
        type: 'next-stack',
        request: { ...base, kind: 'stack', roundNumber: nextStackRound.number },
      }
    }
  }

  if (action.type === 'REFRESH_BID' && state.phase === 'round1_bidding' && state.bid) {
    return {
      type: 'refresh-bid',
      request: { ...base, kind: 'bidding' },
    }
  }

  if (action.type === 'REFRESH_WORDS' && state.cluing && isCluingPhase(state.phase)) {
    return {
      type: 'refresh-words',
      request: {
        ...base,
        kind: 'deck',
        deckId: state.cluing.deckId,
        count: state.cluing.words.length,
      },
    }
  }

  return { type: 'direct', action }
}

function wordsFromDeal(deal: DealResponse): string[] {
  if (deal.kind !== 'words') {
    throw new Error('Expected words deal response')
  }
  return deal.words
}

function definitionsFromDeal(deal: DealResponse): Record<string, string> {
  return deal.definitions ?? {}
}

function stackFromDeal(deal: DealResponse): StackDeal {
  if (deal.kind !== 'stack') {
    throw new Error('Expected stack deal response')
  }
  return deal
}

export function actionFromDeal(plan: Exclude<DealPlan, { type: 'direct' }>, deal: DealResponse): GameAction {
  switch (plan.type) {
    case 'start-bidding':
      return {
        type: 'START_BIDDING',
        firstTeam: plan.firstTeam,
        words: wordsFromDeal(deal),
        wordDefinitions: definitionsFromDeal(deal),
        roundTime: plan.roundTime,
      }
    case 'advance-stack':
      return { ...plan.action, nextStackDeal: stackFromDeal(deal) }
    case 'start-money':
      return {
        type: 'START_MONEY_ROUND',
        words: wordsFromDeal(deal),
        wordDefinitions: definitionsFromDeal(deal),
        moneyTime: plan.moneyTime,
      }
    case 'next-bid':
      return {
        type: 'NEXT_AFTER_RESULT',
        nextBidWords: wordsFromDeal(deal),
        nextBidDefinitions: definitionsFromDeal(deal),
      }
    case 'next-stack':
      return { type: 'NEXT_AFTER_RESULT', nextStackDeal: stackFromDeal(deal) }
    case 'refresh-bid':
      return { type: 'REFRESH_BID', words: wordsFromDeal(deal), wordDefinitions: definitionsFromDeal(deal) }
    case 'refresh-words':
      return { type: 'REFRESH_WORDS', words: wordsFromDeal(deal), wordDefinitions: definitionsFromDeal(deal) }
  }
}
