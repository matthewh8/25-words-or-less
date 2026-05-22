import {
  DEFAULT_GAME_MODE,
  findStackOption,
  getNextStackRound,
  getStackRound,
  type ClueStream,
  type GameMode,
  type WordDeckId,
} from './gameMode'
import { selectChallenge, type Challenge, type ChallengeSettings } from './challenges'
import {
  appendUsedWords,
  dealtWordsOrFallback,
  initialStackBoard,
  type StackBoardState,
  type StackDeal,
} from './dealing'
import { scoreCluing } from './scoring'
import { pickDefinitions } from './wordSelection'

export type Phase =
  | 'setup'
  | 'round1_intro'
  | 'round1_bidding'
  | 'round1_premeditation'
  | 'round1_cluing'
  | 'round1_result'
  | 'round23_intro'
  | 'round23_selection'
  | 'round23_cluing'
  | 'round23_result'
  | 'money_intro'
  | 'money_cluing'
  | 'money_result'
  | 'final'

export interface TeamState {
  name: string
  score: number
  players: string[]
}

export interface BidState {
  words: string[]
  definitions: Record<string, string>
  currentBid: number
  biddingTeam: 0 | 1
  activeBidder: 0 | 1
  biddingTimeLeft: number
}

export interface CluingState {
  stream: ClueStream
  deckId: WordDeckId
  stackId?: string
  label: string
  words: string[]
  definitions: Record<string, string>
  wordsLeft: number
  wordLimit: number
  timeLeft: number
  guessed: boolean[]
  skipCount: number
  cluingTeam: 0 | 1
  currentWordIndex: number
}

export interface WordRevealState {
  stream: ClueStream
  deckId: WordDeckId
  label: string
  words: string[]
  definitions: Record<string, string>
  guessed: boolean[]
  cluingTeam: 0 | 1
}

export interface GameState {
  phase: Phase
  gameMode: GameMode
  teams: [TeamState, TeamState]
  currentRound: number
  round1Contests: number
  bid: BidState | null
  cluing: CluingState | null
  stackBoard: StackBoardState | null
  lastResult: { points: number; team: 0 | 1; awardTeam: 0 | 1; allCorrect: boolean } | null
  lastReveal: WordRevealState | null
  lastChallenge: Challenge | null
  challengesShown: number
  challengeSettings: ChallengeSettings
  moneyWon: boolean
  usedWords: string[]
  roundTime: number
  moneyTime: number
  premeditationTimeLeft: number
}

export function clampTurnSeconds(value: number, gameMode: GameMode = DEFAULT_GAME_MODE): number {
  return clampSeconds(value, gameMode.timing.turnSeconds, gameMode)
}

export function clampMoneySeconds(value: number, gameMode: GameMode = DEFAULT_GAME_MODE): number {
  return clampSeconds(value, gameMode.timing.moneySeconds, gameMode)
}

function clampSeconds(value: number, fallback: number, gameMode: GameMode): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(gameMode.timing.maxSeconds, Math.max(gameMode.timing.minSeconds, Math.round(value)))
}

const CLUING_PHASES = new Set<Phase>(['round1_cluing', 'round23_cluing', 'money_cluing'])

export function isCluingPhase(phase: Phase): boolean {
  return CLUING_PHASES.has(phase)
}

export function biddingExhausted(state: GameState): boolean {
  return state.round1Contests + 1 >= state.gameMode.bidding.contests
}

export function leadingTeam(teams: [TeamState, TeamState]): 0 | 1 {
  return teams[0].score >= teams[1].score ? 0 : 1
}

export function stackRoundDone(state: GameState): boolean {
  if (!state.stackBoard) return false
  const board = state.stackBoard
  const stacksExhausted = board.usedStackIds.length >= state.gameMode.stacks.options.length
  return board.turnsLeft - 1 <= 0 || stacksExhausted
}

export function canPlaceBid(
  amount: number,
  currentBid: number,
  gameMode: GameMode = DEFAULT_GAME_MODE
): boolean {
  return Number.isInteger(amount)
    && amount >= gameMode.bidding.wordCount
    && amount < currentBid
    && currentBid <= gameMode.bidding.maxBid
}

function nextUnguessed(guessed: boolean[], from: number): number {
  const n = guessed.length
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n
    if (!guessed[idx]) return idx
  }
  return from
}

function dealHand(
  state: GameState,
  deckId: WordDeckId,
  count: number,
  action: { words?: string[]; wordDefinitions?: Record<string, string> },
): { words: string[]; definitions: Record<string, string>; usedWords: string[] } {
  const words = dealtWordsOrFallback(deckId, count, state.usedWords, action.words)
  return {
    words,
    definitions: pickDefinitions(words, action.wordDefinitions),
    usedWords: appendUsedWords(state.usedWords, words),
  }
}


function revealFromCluing(cluing: CluingState): WordRevealState {
  return {
    stream: cluing.stream,
    deckId: cluing.deckId,
    label: cluing.label,
    words: [...cluing.words],
    definitions: pickDefinitions(cluing.words, cluing.definitions),
    guessed: [...cluing.guessed],
    cluingTeam: cluing.cluingTeam,
  }
}

function startBiddingClue(state: GameState, bid: BidState, mode: GameMode): GameState {
  return {
    ...state,
    bid,
    phase: 'round1_premeditation',
    lastReveal: null,
    premeditationTimeLeft: mode.timing.premeditationSeconds,
    cluing: {
      stream: 'bidding',
      deckId: mode.bidding.wordDeck,
      label: mode.bidding.title,
      words: bid.words,
      definitions: pickDefinitions(bid.words, bid.definitions),
      wordsLeft: bid.currentBid,
      wordLimit: bid.currentBid,
      timeLeft: state.roundTime,
      guessed: Array(bid.words.length).fill(false),
      skipCount: 0,
      cluingTeam: bid.biddingTeam,
      currentWordIndex: 0,
    },
  }
}

export function canSkipCurrentWord(cluing: CluingState): boolean {
  return cluing.guessed.filter(guessed => !guessed).length > 1
}

export function initGame(
  team1Name: string,
  team2Name: string,
  initialUsedWords: string[] = [],
  gameMode: GameMode = DEFAULT_GAME_MODE,
  teamPlayers: [string[], string[]] = [[], []],
  challengeSettings: ChallengeSettings = {
    enabled: gameMode.challenge.enabledByDefault,
    includeAlcohol: gameMode.challenge.includeAlcoholByDefault,
  }
): GameState {
  return {
    phase: 'round1_intro',
    gameMode,
    teams: [
      { name: team1Name || 'Team 1', score: 0, players: teamPlayers[0] },
      { name: team2Name || 'Team 2', score: 0, players: teamPlayers[1] },
    ],
    currentRound: 1,
    round1Contests: 0,
    bid: null,
    cluing: null,
    stackBoard: null,
    lastResult: null,
    lastReveal: null,
    lastChallenge: null,
    challengesShown: 0,
    challengeSettings,
    moneyWon: false,
    usedWords: appendUsedWords([], initialUsedWords),
    roundTime: gameMode.timing.turnSeconds,
    moneyTime: gameMode.timing.moneySeconds,
    premeditationTimeLeft: gameMode.timing.premeditationSeconds,
  }
}

export type GameAction =
  | { type: 'START_BIDDING'; firstTeam: 0 | 1; words?: string[]; wordDefinitions?: Record<string, string>; roundTime?: number }
  | { type: 'PLACE_BID'; amount: number }
  | { type: 'CONCEDE' }
  | { type: 'BIDDING_TICK' }
  | { type: 'PREMEDITATION_TICK' }
  | { type: 'START_CLUING_NOW' }
  | { type: 'WORD_REFUND' }
  | { type: 'WORD_USED' }
  | { type: 'MARK_CORRECT' }
  | { type: 'MARK_SKIP' }
  | { type: 'TIMER_TICK' }
  | { type: 'END_CLUING' }
  | { type: 'NEXT_AFTER_RESULT'; nextBidWords?: string[]; nextBidDefinitions?: Record<string, string>; nextStackDeal?: StackDeal }
  | { type: 'SELECT_STACK'; stackId: string }
  | { type: 'START_MONEY_ROUND'; words?: string[]; wordDefinitions?: Record<string, string>; moneyTime?: number }
  | { type: 'ADVANCE_PHASE'; roundTime?: number; moneyTime?: number; firstTeam?: 0 | 1; nextStackDeal?: StackDeal }
  | { type: 'REFRESH_BID'; words?: string[]; wordDefinitions?: Record<string, string> }

export function gameReducer(state: GameState, action: GameAction): GameState {
  const mode = state.gameMode

  switch (action.type) {
    case 'START_BIDDING': {
      const hand = dealHand(state, mode.bidding.wordDeck, mode.bidding.wordCount, action)
      return {
        ...state,
        phase: 'round1_bidding',
        ...(action.roundTime !== undefined && { roundTime: clampTurnSeconds(action.roundTime, mode) }),
        usedWords: hand.usedWords,
        lastResult: null,
        lastReveal: null,
        bid: {
          words: hand.words,
          definitions: hand.definitions,
          currentBid: mode.bidding.maxBid,
          biddingTeam: action.firstTeam,
          activeBidder: action.firstTeam,
          biddingTimeLeft: mode.timing.biddingSeconds,
        },
      }
    }

    case 'PLACE_BID': {
      if (!state.bid) return state
      if (state.phase !== 'round1_bidding') return state
      if (!canPlaceBid(action.amount, state.bid.currentBid, mode)) return state
      const next: 0 | 1 = state.bid.activeBidder === 0 ? 1 : 0
      const bid: BidState = {
        ...state.bid,
        currentBid: action.amount,
        activeBidder: next,
        biddingTeam: state.bid.activeBidder,
      }
      if (action.amount === mode.bidding.wordCount) {
        return startBiddingClue(state, bid, mode)
      }
      return {
        ...state,
        bid,
      }
    }

    case 'CONCEDE': {
      if (!state.bid) return state
      if (state.phase !== 'round1_bidding') return state
      const cluer: 0 | 1 = state.bid.activeBidder === 0 ? 1 : 0
      return startBiddingClue(state, { ...state.bid, biddingTeam: cluer }, mode)
    }

    case 'WORD_REFUND': {
      if (!state.cluing || !isCluingPhase(state.phase)) return state
      if (!mode.clueActions.allowBudgetRefund) return state
      if (state.cluing.timeLeft <= 0) return state
      const wordsLeft = Math.min(state.cluing.wordLimit, state.cluing.wordsLeft + 1)
      return { ...state, cluing: { ...state.cluing, wordsLeft } }
    }

    case 'WORD_USED': {
      if (!state.cluing || !isCluingPhase(state.phase)) return state
      if (state.cluing.timeLeft <= 0) return state
      if (state.cluing.wordsLeft <= 0) {
        return state.cluing.guessed.every(Boolean) ? state : gameReducer(state, { type: 'END_CLUING' })
      }
      const newWordsLeft = state.cluing.wordsLeft - 1
      const nextState = { ...state, cluing: { ...state.cluing, wordsLeft: newWordsLeft } }
      return nextState
    }

    case 'MARK_CORRECT': {
      if (!state.cluing || !isCluingPhase(state.phase)) return state
      if (state.cluing.timeLeft <= 0) return state
      const { guessed, currentWordIndex } = state.cluing
      const newGuessed = [...guessed]
      newGuessed[currentWordIndex] = true
      const allDone = newGuessed.every(Boolean)
      const shouldAdvance = mode.clueActions.autoAdvanceOnCorrect
      const nextIndex = allDone || !shouldAdvance ? currentWordIndex : nextUnguessed(newGuessed, currentWordIndex)
      const newCluing = { ...state.cluing, guessed: newGuessed, currentWordIndex: nextIndex }
      if (allDone) {
        return gameReducer({ ...state, cluing: newCluing }, { type: 'END_CLUING' })
      }
      return { ...state, cluing: newCluing }
    }

    case 'MARK_SKIP': {
      if (!state.cluing || !isCluingPhase(state.phase)) return state
      if (!mode.clueActions.allowSkip) return state
      if (state.cluing.timeLeft <= 0) return state
      if (!canSkipCurrentWord(state.cluing)) return state
      const { guessed, currentWordIndex } = state.cluing
      const nextIndex = nextUnguessed(guessed, currentWordIndex)
      return { ...state, cluing: { ...state.cluing, currentWordIndex: nextIndex, skipCount: state.cluing.skipCount + 1 } }
    }

    case 'TIMER_TICK': {
      if (!state.cluing || !isCluingPhase(state.phase) || state.cluing.timeLeft <= 0) return state
      const newTime = state.cluing.timeLeft - 1
      if (newTime <= 0) {
        return gameReducer(
          { ...state, cluing: { ...state.cluing, timeLeft: 0 } },
          { type: 'END_CLUING' }
        )
      }
      return { ...state, cluing: { ...state.cluing, timeLeft: newTime } }
    }

    case 'END_CLUING': {
      if (!state.cluing) return state
      if (!isCluingPhase(state.phase)) return state
      const result = scoreCluing(state.cluing, mode)

      const teams = [...state.teams] as [TeamState, TeamState]
      teams[result.awardTeam] = { ...teams[result.awardTeam], score: teams[result.awardTeam].score + result.points }

      const isMoneyRound = state.cluing.stream === 'money'
      const nextPhase = isMoneyRound ? 'money_result' :
        state.phase === 'round1_cluing' ? 'round1_result' : 'round23_result'
      const roundMarker = isMoneyRound ? 99 : state.currentRound * 10 + state.round1Contests
      const challenge = selectChallenge(mode.challenge, state.challengeSettings, {
        stream: state.cluing.stream,
        allCorrect: result.allCorrect,
        correctCount: result.correctCount,
        totalWords: state.cluing.words.length,
        skipCount: state.cluing.skipCount,
        moneyWon: result.moneyWon,
        roundMarker,
        challengesShown: state.challengesShown,
      })

      return {
        ...state,
        phase: nextPhase,
        teams,
        lastResult: {
          points: result.points,
          team: state.cluing.cluingTeam,
          awardTeam: result.awardTeam,
          allCorrect: result.allCorrect,
        },
        lastReveal: revealFromCluing(state.cluing),
        lastChallenge: challenge,
        challengesShown: challenge ? state.challengesShown + 1 : state.challengesShown,
        ...(isMoneyRound && { moneyWon: result.moneyWon }),
      }
    }

    case 'NEXT_AFTER_RESULT': {
      if (state.phase === 'round1_result') {
        const newContests = state.round1Contests + 1
        if (biddingExhausted(state)) {
          const firstStackRound = mode.stacks.rounds[0]
          const { board, drawnWords } = initialStackBoard(mode, firstStackRound.number, state.usedWords, action.nextStackDeal)
          return {
            ...state,
            phase: 'round23_intro',
            currentRound: firstStackRound.number,
            round1Contests: newContests,
            stackBoard: board,
            usedWords: appendUsedWords(state.usedWords, drawnWords),
            bid: null,
            cluing: null,
            lastResult: null,
            lastReveal: null,
            lastChallenge: null,
          }
        }
        const nextFirst: 0 | 1 = state.bid?.biddingTeam === 0 ? 1 : 0
        return gameReducer(
          { ...state, round1Contests: newContests, bid: null, cluing: null, lastReveal: null, lastChallenge: null },
          { type: 'START_BIDDING', firstTeam: nextFirst, words: action.nextBidWords, wordDefinitions: action.nextBidDefinitions }
        )
      }

      if (state.phase === 'round23_result') {
        if (!state.stackBoard) return state
        const board = state.stackBoard
        const newTurns = board.turnsLeft - 1
        if (stackRoundDone(state)) {
          const nextStackRound = getNextStackRound(mode, state.currentRound)
          if (nextStackRound) {
            const { board: newBoard, drawnWords } = initialStackBoard(mode, nextStackRound.number, state.usedWords, action.nextStackDeal)
            return {
              ...state,
              phase: 'round23_intro',
              currentRound: nextStackRound.number,
              stackBoard: newBoard,
              usedWords: appendUsedWords(state.usedWords, drawnWords),
              cluing: null,
              lastResult: null,
              lastReveal: null,
              lastChallenge: null,
            }
          }
          return { ...state, phase: 'money_intro', cluing: null, lastResult: null, lastReveal: null, lastChallenge: null }
        }
        const nextTeam: 0 | 1 = board.currentTeam === 0 ? 1 : 0
        return {
          ...state,
          phase: 'round23_selection',
          cluing: null,
          lastResult: null,
          lastReveal: null,
          stackBoard: { ...board, turnsLeft: newTurns, currentTeam: nextTeam },
        }
      }

      if (state.phase === 'money_result') {
        return { ...state, phase: 'final', lastReveal: null }
      }

      return state
    }

    case 'SELECT_STACK': {
      if (!state.stackBoard) return state
      if (state.phase !== 'round23_selection') return state
      if (state.stackBoard.usedStackIds.includes(action.stackId)) return state
      const stack = findStackOption(mode, action.stackId)
      if (!stack) return state
      const words = state.stackBoard.wordsByStack[stack.id]
      if (!words) return state
      const team = state.stackBoard.currentTeam
      return {
        ...state,
        phase: 'round23_cluing',
        lastReveal: null,
        stackBoard: {
          ...state.stackBoard,
          usedStackIds: [...state.stackBoard.usedStackIds, stack.id],
        },
        cluing: {
          stream: 'stack',
          deckId: stack.wordDeck,
          stackId: stack.id,
          label: stack.label,
          words,
          definitions: pickDefinitions(words, state.stackBoard.definitions),
          wordsLeft: mode.stacks.wordLimit,
          wordLimit: mode.stacks.wordLimit,
          timeLeft: state.roundTime,
          guessed: Array(words.length).fill(false),
          skipCount: 0,
          cluingTeam: team,
          currentWordIndex: 0,
        },
      }
    }

    case 'START_MONEY_ROUND': {
      if (state.phase !== 'money_intro') return state
      const moneyTime = action.moneyTime !== undefined ? clampMoneySeconds(action.moneyTime, mode) : state.moneyTime
      const hand = dealHand(state, mode.money.wordDeck, mode.money.wordCount, action)
      return {
        ...state,
        phase: 'money_cluing',
        moneyTime,
        usedWords: hand.usedWords,
        lastReveal: null,
        cluing: {
          stream: 'money',
          deckId: mode.money.wordDeck,
          label: mode.money.title,
          words: hand.words,
          definitions: hand.definitions,
          wordsLeft: mode.money.wordLimit,
          wordLimit: mode.money.wordLimit,
          timeLeft: moneyTime,
          guessed: Array(hand.words.length).fill(false),
          skipCount: 0,
          cluingTeam: leadingTeam(state.teams),
          currentWordIndex: 0,
        },
      }
    }

    case 'ADVANCE_PHASE': {
      const nextState: GameState = {
        ...state,
        ...(action.roundTime !== undefined && { roundTime: clampTurnSeconds(action.roundTime, mode) }),
        ...(action.moneyTime !== undefined && { moneyTime: clampMoneySeconds(action.moneyTime, mode) }),
      }

      if (nextState.phase === 'round1_intro') {
        const firstTeam = action.firstTeam ?? 0
        return gameReducer(nextState, { type: 'START_BIDDING', firstTeam })
      }
      if (nextState.phase === 'round23_intro') {
        const round = getStackRound(mode, nextState.currentRound)
        if (nextState.stackBoard) {
          return {
            ...nextState,
            phase: 'round23_selection',
            stackBoard: {
              ...nextState.stackBoard,
              currentTeam: round?.startTeam ?? nextState.stackBoard.currentTeam,
            },
            lastResult: null,
            lastReveal: null,
          }
        }
        const firstStackRound = round ?? mode.stacks.rounds[0]
        const { board, drawnWords } = initialStackBoard(mode, firstStackRound.number, nextState.usedWords, action.nextStackDeal)
        return {
          ...nextState,
          phase: 'round23_selection',
          currentRound: firstStackRound.number,
          stackBoard: board,
          usedWords: appendUsedWords(nextState.usedWords, drawnWords),
          lastResult: null,
          lastReveal: null,
        }
      }
      if (nextState.phase === 'money_intro') {
        return gameReducer(nextState, { type: 'START_MONEY_ROUND' })
      }
      return nextState
    }

    case 'BIDDING_TICK': {
      if (!state.bid || state.bid.biddingTimeLeft <= 0) return state
      if (state.phase !== 'round1_bidding') return state
      const newTime = state.bid.biddingTimeLeft - 1
      return { ...state, bid: { ...state.bid, biddingTimeLeft: Math.max(0, newTime) } }
    }

    case 'PREMEDITATION_TICK': {
      if (state.phase !== 'round1_premeditation') return state
      const newTime = state.premeditationTimeLeft - 1
      if (newTime <= 0) {
        return { ...state, phase: 'round1_cluing', premeditationTimeLeft: 0 }
      }
      return { ...state, premeditationTimeLeft: newTime }
    }

    case 'START_CLUING_NOW': {
      if (state.phase !== 'round1_premeditation') return state
      return { ...state, phase: 'round1_cluing', premeditationTimeLeft: 0 }
    }

    case 'REFRESH_BID': {
      if (!state.bid || state.phase !== 'round1_bidding') return state
      const hand = dealHand(state, mode.bidding.wordDeck, mode.bidding.wordCount, action)
      return {
        ...state,
        usedWords: hand.usedWords,
        bid: {
          ...state.bid,
          words: hand.words,
          definitions: hand.definitions,
          currentBid: mode.bidding.maxBid,
          biddingTimeLeft: mode.timing.biddingSeconds,
        },
      }
    }

    default:
      return state
  }
}
