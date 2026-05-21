import { getStackRound, type GameMode, type WordDeckId } from './gameMode'
import { canonicalWord, FALLBACK_WORD_POOLS, pickWords, type RandomSource } from './wordSelection'

export interface StackBoardState {
  wordsByStack: Record<string, string[]>
  definitions: Record<string, string>
  usedStackIds: string[]
  currentTeam: 0 | 1
  turnsLeft: number
  roundNumber: number
}

export interface StackDeal {
  wordsByStack: Record<string, string[]>
  definitions?: Record<string, string>
  drawnWords?: string[]
}

export function appendUsedWords(current: string[], words: string[]): string[] {
  return Array.from(new Set([...current, ...words].map(canonicalWord).filter(Boolean)))
}

export function dealtWordsOrFallback(
  deckId: WordDeckId,
  count: number,
  usedWords: string[],
  dealtWords?: string[],
  random?: RandomSource
): string[] {
  const cleaned = Array.isArray(dealtWords)
    ? dealtWords.map(canonicalWord).filter(Boolean).slice(0, count)
    : []

  if (cleaned.length >= count) return cleaned
  return pickWords(FALLBACK_WORD_POOLS[deckId], count, usedWords, random)
}

export function initialStackBoard(
  gameMode: GameMode,
  roundNumber: number,
  usedWords: string[],
  deal?: StackDeal,
  random?: RandomSource
): { board: StackBoardState; drawnWords: string[] } {
  const round = getStackRound(gameMode, roundNumber) ?? gameMode.stacks.rounds[0]
  const wordsByStack: Record<string, string[]> = {}
  let used = [...usedWords]
  const drawnWords: string[] = []

  for (const option of gameMode.stacks.options) {
    const words = dealtWordsOrFallback(
      option.wordDeck,
      gameMode.stacks.wordCount,
      used,
      deal?.wordsByStack[option.id],
      random
    )
    wordsByStack[option.id] = words
    used = appendUsedWords(used, words)
    drawnWords.push(...words)
  }

  return {
    board: {
      wordsByStack,
      definitions: deal?.definitions ?? {},
      usedStackIds: [],
      currentTeam: round.startTeam,
      turnsLeft: round.turns,
      roundNumber: round.number,
    },
    drawnWords,
  }
}
