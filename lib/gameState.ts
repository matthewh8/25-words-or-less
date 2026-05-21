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

export type Phase =
  | 'setup'
  | 'round1_intro'
  | 'round1_bidding'
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

export function canPlaceBid(
  amount: number,
  currentBid: number,
  gameMode: GameMode = DEFAULT_GAME_MODE
): boolean {
  return Number.isInteger(amount)
    && amount >= winningBidAmount(gameMode)
    && amount < currentBid
    && currentBid <= gameMode.bidding.maxBid
}

export function winningBidAmount(gameMode: GameMode = DEFAULT_GAME_MODE): number {
  return gameMode.bidding.wordCount
}

function nextUnguessed(guessed: boolean[], from: number): number {
  const n = guessed.length
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n
    if (!guessed[idx]) return idx
  }
  return from
}

function isCluingPhase(phase: Phase): boolean {
  return phase === 'round1_cluing' || phase === 'round23_cluing' || phase === 'money_cluing'
}

function definitionsForWords(words: string[], definitions: Record<string, string> | undefined): Record<string, string> {
  const cleanDefinitions: Record<string, string> = {}
  const source = definitions ?? {}
  for (const word of words) {
    const canonical = word.trim().toUpperCase()
    const definition = source[canonical] ?? source[word]
    if (typeof definition === 'string' && definition.trim()) {
      cleanDefinitions[canonical] = definition.trim()
    }
  }
  return cleanDefinitions
}

function revealFromCluing(cluing: CluingState): WordRevealState {
  return {
    stream: cluing.stream,
    deckId: cluing.deckId,
    label: cluing.label,
    words: [...cluing.words],
    definitions: definitionsForWords(cluing.words, cluing.definitions),
    guessed: [...cluing.guessed],
    cluingTeam: cluing.cluingTeam,
  }
}

function startBiddingClue(state: GameState, bid: BidState, mode: GameMode): GameState {
  return {
    ...state,
    bid,
    phase: 'round1_cluing',
    lastReveal: null,
    cluing: {
      stream: 'bidding',
      deckId: mode.bidding.wordDeck,
      label: mode.bidding.title,
      words: bid.words,
      definitions: definitionsForWords(bid.words, bid.definitions),
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
  }
}

export type GameAction =
  | { type: 'START_BIDDING'; firstTeam: 0 | 1; words?: string[]; wordDefinitions?: Record<string, string>; roundTime?: number }
  | { type: 'PLACE_BID'; amount: number }
  | { type: 'CONCEDE' }
  | { type: 'BIDDING_TICK' }
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
  | { type: 'REFRESH_WORDS'; words?: string[]; wordDefinitions?: Record<string, string> }

export function gameReducer(state: GameState, action: GameAction): GameState {
  const mode = state.gameMode

  switch (action.type) {
    case 'START_BIDDING': {
      const words = dealtWordsOrFallback(mode.bidding.wordDeck, mode.bidding.wordCount, state.usedWords, action.words)
      const definitions = definitionsForWords(words, action.wordDefinitions)
      return {
        ...state,
        phase: 'round1_bidding',
        ...(action.roundTime !== undefined && { roundTime: clampTurnSeconds(action.roundTime, mode) }),
        usedWords: appendUsedWords(state.usedWords, words),
        lastResult: null,
        lastReveal: null,
        bid: {
          words,
          definitions,
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
      if (action.amount === winningBidAmount(mode)) {
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
      if (state.cluing.timeLeft <= 0 || state.cluing.wordsLeft < 0) return state
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
      if (state.cluing.timeLeft <= 0 || state.cluing.wordsLeft < 0) return state
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
        moneyWon: result.moneyWon,
      }
    }

    case 'NEXT_AFTER_RESULT': {
      if (state.phase === 'round1_result') {
        const newContests = state.round1Contests + 1
        if (newContests >= mode.bidding.contests) {
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
            lastReveal: null,
          }
        }
        const nextFirst: 0 | 1 = state.bid?.biddingTeam === 0 ? 1 : 0
        return gameReducer(
          { ...state, round1Contests: newContests, bid: null, cluing: null, lastReveal: null },
          { type: 'START_BIDDING', firstTeam: nextFirst, words: action.nextBidWords, wordDefinitions: action.nextBidDefinitions }
        )
      }

      if (state.phase === 'round23_result') {
        if (!state.stackBoard) return state
        const board = state.stackBoard
        const newTurns = board.turnsLeft - 1
        const stacksExhausted = board.usedStackIds.length >= mode.stacks.options.length
        if (newTurns <= 0 || stacksExhausted) {
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
            }
          }
          return { ...state, phase: 'money_intro', cluing: null, lastResult: null, lastReveal: null }
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
          definitions: definitionsForWords(words, state.stackBoard.definitions),
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
      const words = dealtWordsOrFallback(mode.money.wordDeck, mode.money.wordCount, state.usedWords, action.words)
      const definitions = definitionsForWords(words, action.wordDefinitions)
      const winnerTeam: 0 | 1 = state.teams[0].score >= state.teams[1].score ? 0 : 1
      return {
        ...state,
        phase: 'money_cluing',
        moneyTime,
        usedWords: appendUsedWords(state.usedWords, words),
        lastReveal: null,
        cluing: {
          stream: 'money',
          deckId: mode.money.wordDeck,
          label: mode.money.title,
          words,
          definitions,
          wordsLeft: mode.money.wordLimit,
          wordLimit: mode.money.wordLimit,
          timeLeft: moneyTime,
          guessed: Array(words.length).fill(false),
          skipCount: 0,
          cluingTeam: winnerTeam,
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

    case 'REFRESH_BID': {
      if (!state.bid || state.phase !== 'round1_bidding') return state
      const words = dealtWordsOrFallback(mode.bidding.wordDeck, mode.bidding.wordCount, state.usedWords, action.words)
      const definitions = definitionsForWords(words, action.wordDefinitions)
      return {
        ...state,
        usedWords: appendUsedWords(state.usedWords, words),
        bid: {
          ...state.bid,
          words,
          definitions,
          currentBid: mode.bidding.maxBid,
          biddingTimeLeft: mode.timing.biddingSeconds,
        },
      }
    }

    case 'REFRESH_WORDS': {
      if (!state.cluing) return state
      if (!isCluingPhase(state.phase)) return state
      const words = dealtWordsOrFallback(state.cluing.deckId, state.cluing.words.length, state.usedWords, action.words)
      const definitions = definitionsForWords(words, action.wordDefinitions)
      return {
        ...state,
        usedWords: appendUsedWords(state.usedWords, words),
        cluing: {
          ...state.cluing,
          words,
          definitions,
          wordsLeft: state.cluing.wordLimit,
          guessed: Array(words.length).fill(false),
          skipCount: 0,
          currentWordIndex: 0,
        },
      }
    }

    default:
      return state
  }
}
