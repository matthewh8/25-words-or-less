import {
  DEFAULT_GAME_MODE,
  findStackOption,
  type ClueStream,
  type GameMode,
} from './gameMode'

export interface ScoringCluingState {
  stream: ClueStream
  stackId?: string
  words: string[]
  guessed: boolean[]
  cluingTeam: 0 | 1
}

export interface CluingScore {
  points: number
  awardTeam: 0 | 1
  allCorrect: boolean
  correctCount: number
  moneyWon: boolean
}

function opponent(team: 0 | 1): 0 | 1 {
  return team === 0 ? 1 : 0
}

export function scoreCluing(
  cluing: ScoringCluingState,
  gameMode: GameMode = DEFAULT_GAME_MODE
): CluingScore {
  const totalWords = cluing.words.length
  const correctCount = cluing.words.reduce((count, _word, index) => count + (cluing.guessed[index] ? 1 : 0), 0)
  const allCorrect = totalWords > 0 && correctCount === totalWords

  if (totalWords === 0) {
    return {
      points: 0,
      awardTeam: cluing.cluingTeam,
      allCorrect,
      correctCount,
      moneyWon: false,
    }
  }

  if (cluing.stream === 'bidding') {
    if (allCorrect) {
      return {
        points: gameMode.bidding.successPoints,
        awardTeam: cluing.cluingTeam,
        allCorrect,
        correctCount,
        moneyWon: false,
      }
    }

    const awardTeam = gameMode.bidding.failureAward === 'opponent'
      ? opponent(cluing.cluingTeam)
      : cluing.cluingTeam

    return {
      points: gameMode.bidding.failureAward === 'none' ? 0 : gameMode.bidding.failurePoints,
      awardTeam,
      allCorrect,
      correctCount,
      moneyWon: false,
    }
  }

  if (cluing.stream === 'money') {
    return {
      points: allCorrect ? gameMode.money.jackpotPoints : 0,
      awardTeam: cluing.cluingTeam,
      allCorrect,
      correctCount,
      moneyWon: allCorrect,
    }
  }

  const stack = findStackOption(gameMode, cluing.stackId ?? '')
  if (!stack) {
    return {
      points: 0,
      awardTeam: cluing.cluingTeam,
      allCorrect,
      correctCount,
      moneyWon: false,
    }
  }

  return {
    points: correctCount * stack.pointsPerWord + (allCorrect ? gameMode.stacks.allCorrectBonus : 0),
    awardTeam: cluing.cluingTeam,
    allCorrect,
    correctCount,
    moneyWon: false,
  }
}
