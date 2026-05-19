import { Difficulty, getBiddingWords, getColorWords, getMoneyWords } from './words'

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
}

export interface BidState {
  words: string[]
  currentBid: number
  biddingTeam: 0 | 1
  activeBidder: 0 | 1
  conceded: boolean
  biddingTimeLeft: number
}

export interface CluingState {
  words: string[]
  wordsLeft: number
  wordLimit: number
  timeLeft: number
  guessed: boolean[]
  wordCount: number
  difficulty: Difficulty | 'bid' | 'money'
  cluingTeam: 0 | 1
  currentWordIndex: number
}

export interface ColorBoardState {
  words: { green: string[]; yellow: string[]; red: string[] }
  usedColors: Difficulty[]
  currentTeam: 0 | 1
  turnsLeft: number
}

export interface GameState {
  phase: Phase
  teams: [TeamState, TeamState]
  currentRound: 1 | 2 | 3
  round1Contests: number
  bid: BidState | null
  cluing: CluingState | null
  colorBoard: ColorBoardState | null
  lastResult: { points: number; team: 0 | 1; allCorrect: boolean } | null
  moneyWon: boolean
  usedWords: string[]
  roundTime: number
  moneyTime: number
}

function initialColorBoard(usedWords: string[]): { board: ColorBoardState; drawnWords: string[] } {
  const green = getColorWords('green', usedWords)
  const yellow = getColorWords('yellow', [...usedWords, ...green])
  const red = getColorWords('red', [...usedWords, ...green, ...yellow])
  return {
    board: { words: { green, yellow, red }, usedColors: [], currentTeam: 0, turnsLeft: 3 },
    drawnWords: [...green, ...yellow, ...red],
  }
}

function nextUnguessed(guessed: boolean[], from: number): number {
  const n = guessed.length
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n
    if (!guessed[idx]) return idx
  }
  return from
}

export function initGame(team1Name: string, team2Name: string, initialUsedWords: string[] = []): GameState {
  return {
    phase: 'round1_intro',
    teams: [
      { name: team1Name || 'Team 1', score: 0 },
      { name: team2Name || 'Team 2', score: 0 },
    ],
    currentRound: 1,
    round1Contests: 0,
    bid: null,
    cluing: null,
    colorBoard: null,
    lastResult: null,
    moneyWon: false,
    usedWords: initialUsedWords,
    roundTime: 45,
    moneyTime: 60,
  }
}

export type GameAction =
  | { type: 'START_BIDDING'; firstTeam: 0 | 1 }
  | { type: 'PLACE_BID'; amount: number }
  | { type: 'CONCEDE' }
  | { type: 'BIDDING_TICK' }
  | { type: 'WORD_USED' }
  | { type: 'MARK_CORRECT' }
  | { type: 'MARK_SKIP' }
  | { type: 'TIMER_TICK' }
  | { type: 'END_CLUING' }
  | { type: 'NEXT_AFTER_RESULT' }
  | { type: 'SELECT_COLOR'; difficulty: Difficulty }
  | { type: 'START_MONEY_ROUND' }
  | { type: 'ADVANCE_PHASE'; roundTime?: number; moneyTime?: number }
  | { type: 'REFRESH_BID' }
  | { type: 'REFRESH_WORDS' }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_BIDDING': {
      const words = getBiddingWords(state.usedWords)
      return {
        ...state,
        phase: 'round1_bidding',
        usedWords: [...state.usedWords, ...words],
        bid: {
          words,
          currentBid: 25,
          biddingTeam: action.firstTeam,
          activeBidder: action.firstTeam,
          conceded: false,
          biddingTimeLeft: 90,
        },
      }
    }

    case 'PLACE_BID': {
      if (!state.bid) return state
      const next: 0 | 1 = state.bid.activeBidder === 0 ? 1 : 0
      return {
        ...state,
        bid: {
          ...state.bid,
          currentBid: action.amount,
          activeBidder: next,
          biddingTeam: state.bid.activeBidder,
        },
      }
    }

    case 'CONCEDE': {
      if (!state.bid) return state
      return {
        ...state,
        bid: { ...state.bid, conceded: true },
        phase: 'round1_cluing',
        cluing: {
          words: state.bid.words,
          wordsLeft: state.bid.currentBid,
          wordLimit: state.bid.currentBid,
          timeLeft: state.roundTime,
          guessed: Array(5).fill(false),
          wordCount: 0,
          difficulty: 'bid',
          cluingTeam: state.bid.biddingTeam,
          currentWordIndex: 0,
        },
      }
    }

    case 'WORD_USED': {
      if (!state.cluing || state.cluing.wordsLeft <= 0) return state
      const newWordsLeft = state.cluing.wordsLeft - 1
      if (newWordsLeft === 0) {
        return { ...state, cluing: { ...state.cluing, wordsLeft: 0 } }
      }
      return { ...state, cluing: { ...state.cluing, wordsLeft: newWordsLeft } }
    }

    case 'MARK_CORRECT': {
      if (!state.cluing) return state
      const { guessed, currentWordIndex } = state.cluing
      const newGuessed = [...guessed]
      newGuessed[currentWordIndex] = true
      const allDone = newGuessed.every(Boolean)
      const nextIndex = allDone ? currentWordIndex : nextUnguessed(newGuessed, currentWordIndex)
      const newCluing = { ...state.cluing, guessed: newGuessed, currentWordIndex: nextIndex }
      if (allDone) {
        return gameReducer({ ...state, cluing: newCluing }, { type: 'END_CLUING' })
      }
      return { ...state, cluing: newCluing }
    }

    case 'MARK_SKIP': {
      if (!state.cluing) return state
      const { guessed, currentWordIndex } = state.cluing
      const nextIndex = nextUnguessed(guessed, currentWordIndex)
      return { ...state, cluing: { ...state.cluing, currentWordIndex: nextIndex } }
    }

    case 'TIMER_TICK': {
      if (!state.cluing || state.cluing.timeLeft <= 0) return state
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
      const { guessed, difficulty, cluingTeam, words } = state.cluing
      const correctCount = guessed.filter(Boolean).length
      const allCorrect = correctCount === words.length

      let points = 0
      if (difficulty === 'bid') {
        points = allCorrect ? 1000 : 0
      } else if (difficulty === 'money') {
        points = allCorrect ? 10000 : 0
      } else {
        const perWord = difficulty === 'green' ? 250 : difficulty === 'yellow' ? 500 : 1000
        points = correctCount * perWord + (allCorrect ? 1000 : 0)
      }

      const teams = [...state.teams] as [TeamState, TeamState]
      if (difficulty === 'bid' && !allCorrect) {
        const other: 0 | 1 = cluingTeam === 0 ? 1 : 0
        teams[other] = { ...teams[other], score: teams[other].score + 500 }
      } else {
        teams[cluingTeam] = { ...teams[cluingTeam], score: teams[cluingTeam].score + points }
      }

      const isMoneyRound = difficulty === 'money'
      const nextPhase = isMoneyRound ? 'money_result' :
        state.phase === 'round1_cluing' ? 'round1_result' : 'round23_result'

      return {
        ...state,
        phase: nextPhase,
        teams,
        lastResult: {
          points: difficulty === 'bid' && !allCorrect ? 500 : points,
          team: cluingTeam,
          allCorrect,
        },
        moneyWon: isMoneyRound && allCorrect,
      }
    }

    case 'NEXT_AFTER_RESULT': {
      if (state.phase === 'round1_result') {
        const newContests = state.round1Contests + 1
        if (newContests >= 2) {
          const { board, drawnWords } = initialColorBoard(state.usedWords)
          return {
            ...state,
            phase: 'round23_intro',
            currentRound: 2,
            round1Contests: newContests,
            colorBoard: board,
            usedWords: [...state.usedWords, ...drawnWords],
            bid: null,
            cluing: null,
          }
        }
        const nextFirst: 0 | 1 = state.bid?.biddingTeam === 0 ? 1 : 0
        return gameReducer(
          { ...state, round1Contests: newContests, bid: null, cluing: null },
          { type: 'START_BIDDING', firstTeam: nextFirst }
        )
      }

      if (state.phase === 'round23_result') {
        const board = state.colorBoard!
        const newTurns = board.turnsLeft - 1
        if (newTurns <= 0) {
          if (state.currentRound === 2) {
            const { board: newBoard, drawnWords } = initialColorBoard(state.usedWords)
            return {
              ...state,
              phase: 'round23_intro',
              currentRound: 3,
              colorBoard: newBoard,
              usedWords: [...state.usedWords, ...drawnWords],
              cluing: null,
              lastResult: null,
            }
          } else {
            return { ...state, phase: 'money_intro', cluing: null, lastResult: null }
          }
        }
        const nextTeam: 0 | 1 = board.currentTeam === 0 ? 1 : 0
        return {
          ...state,
          phase: 'round23_selection',
          cluing: null,
          lastResult: null,
          colorBoard: { ...board, turnsLeft: newTurns, currentTeam: nextTeam },
        }
      }

      if (state.phase === 'money_result') {
        return { ...state, phase: 'final' }
      }

      return state
    }

    case 'SELECT_COLOR': {
      if (!state.colorBoard) return state
      const words = state.colorBoard.words[action.difficulty]
      const team = state.colorBoard.currentTeam
      return {
        ...state,
        phase: 'round23_cluing',
        colorBoard: {
          ...state.colorBoard,
          usedColors: [...state.colorBoard.usedColors, action.difficulty],
        },
        cluing: {
          words,
          wordsLeft: 20,
          wordLimit: 20,
          timeLeft: state.roundTime,
          guessed: Array(5).fill(false),
          wordCount: 0,
          difficulty: action.difficulty,
          cluingTeam: team,
          currentWordIndex: 0,
        },
      }
    }

    case 'START_MONEY_ROUND': {
      const words = getMoneyWords(state.usedWords)
      const winnerTeam: 0 | 1 = state.teams[0].score >= state.teams[1].score ? 0 : 1
      return {
        ...state,
        phase: 'money_cluing',
        usedWords: [...state.usedWords, ...words],
        cluing: {
          words,
          wordsLeft: 25,
          wordLimit: 25,
          timeLeft: state.moneyTime,
          guessed: Array(10).fill(false),
          wordCount: 0,
          difficulty: 'money',
          cluingTeam: winnerTeam,
          currentWordIndex: 0,
        },
      }
    }

    case 'ADVANCE_PHASE': {
      const nextState: GameState = {
        ...state,
        ...(action.roundTime !== undefined && { roundTime: action.roundTime }),
        ...(action.moneyTime !== undefined && { moneyTime: action.moneyTime }),
      }

      if (nextState.phase === 'round1_intro') {
        const firstTeam: 0 | 1 = Math.random() < 0.5 ? 0 : 1
        return gameReducer(nextState, { type: 'START_BIDDING', firstTeam })
      }
      if (nextState.phase === 'round23_intro') {
        const startTeam: 0 | 1 = (nextState.currentRound % 2 === 0) ? 0 : 1
        if (nextState.colorBoard) {
          return {
            ...nextState,
            phase: 'round23_selection',
            colorBoard: { ...nextState.colorBoard, currentTeam: startTeam },
          }
        }
        const { board, drawnWords } = initialColorBoard(nextState.usedWords)
        return {
          ...nextState,
          phase: 'round23_selection',
          colorBoard: { ...board, currentTeam: startTeam },
          usedWords: [...nextState.usedWords, ...drawnWords],
        }
      }
      if (nextState.phase === 'money_intro') {
        return gameReducer(nextState, { type: 'START_MONEY_ROUND' })
      }
      return nextState
    }

    case 'BIDDING_TICK': {
      if (!state.bid || state.bid.biddingTimeLeft <= 0) return state
      const newTime = state.bid.biddingTimeLeft - 1
      if (newTime <= 0) {
        return gameReducer({ ...state, bid: { ...state.bid, biddingTimeLeft: 0 } }, { type: 'CONCEDE' })
      }
      return { ...state, bid: { ...state.bid, biddingTimeLeft: newTime } }
    }

    case 'REFRESH_BID': {
      if (!state.bid) return state
      const words = getBiddingWords(state.usedWords)
      return {
        ...state,
        usedWords: [...state.usedWords, ...words],
        bid: { ...state.bid, words, currentBid: 25, biddingTimeLeft: 90 },
      }
    }

    case 'REFRESH_WORDS': {
      if (!state.cluing) return state
      const { difficulty } = state.cluing
      let words: string[]
      if (difficulty === 'bid') {
        words = getBiddingWords(state.usedWords)
      } else if (difficulty === 'money') {
        words = getMoneyWords(state.usedWords)
      } else {
        words = getColorWords(difficulty, state.usedWords)
      }
      return {
        ...state,
        usedWords: [...state.usedWords, ...words],
        cluing: {
          ...state.cluing,
          words,
          guessed: Array(words.length).fill(false),
          currentWordIndex: 0,
        },
      }
    }

    default:
      return state
  }
}
