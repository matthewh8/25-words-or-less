import { getStackRound, type WordDeckId } from '@/lib/gameMode'
import { loadGameMode } from '@/lib/gameModeServer'
import { getWordsForDeck } from '@/lib/words'

export const dynamic = 'force-dynamic'

const DECK_IDS = new Set<WordDeckId>(['bidding', 'green', 'yellow', 'red', 'money'])

type DealKind = 'bidding' | 'stack' | 'money' | 'deck'

interface DealRequest {
  kind?: DealKind
  modeId?: string
  usedWords?: unknown
  roundNumber?: unknown
  deckId?: unknown
  count?: unknown
}

function normalizeUsedWords(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((word): word is string => typeof word === 'string')
        .map(word => word.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 10000)
}

function positiveInt(value: unknown, fallback: number, max = 50): number {
  return Number.isInteger(value) && Number(value) > 0
    ? Math.min(Number(value), max)
    : fallback
}

function isDealKind(value: unknown): value is DealKind {
  return value === 'bidding' || value === 'stack' || value === 'money' || value === 'deck'
}

function deckId(value: unknown): WordDeckId | null {
  return typeof value === 'string' && DECK_IDS.has(value as WordDeckId)
    ? value as WordDeckId
    : null
}

export async function POST(request: Request) {
  let body: DealRequest
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isDealKind(body.kind)) {
    return Response.json({ error: 'Invalid deal kind' }, { status: 400 })
  }

  const gameMode = await loadGameMode(body.modeId)
  const usedWords = normalizeUsedWords(body.usedWords)

  if (body.kind === 'bidding') {
    const words = getWordsForDeck(gameMode.bidding.wordDeck, gameMode.bidding.wordCount, usedWords)
    return Response.json({ kind: 'words', deckId: gameMode.bidding.wordDeck, words })
  }

  if (body.kind === 'money') {
    const words = getWordsForDeck(gameMode.money.wordDeck, gameMode.money.wordCount, usedWords)
    return Response.json({ kind: 'words', deckId: gameMode.money.wordDeck, words })
  }

  if (body.kind === 'deck') {
    const selectedDeck = deckId(body.deckId)
    if (!selectedDeck) return Response.json({ error: 'Invalid deck id' }, { status: 400 })
    const words = getWordsForDeck(selectedDeck, positiveInt(body.count, 5), usedWords)
    return Response.json({ kind: 'words', deckId: selectedDeck, words })
  }

  const round = getStackRound(gameMode, positiveInt(body.roundNumber, gameMode.stacks.rounds[0].number, 99))
    ?? gameMode.stacks.rounds[0]
  const wordsByStack: Record<string, string[]> = {}
  const drawnWords: string[] = []
  let used = [...usedWords]

  for (const option of gameMode.stacks.options) {
    const words = getWordsForDeck(option.wordDeck, gameMode.stacks.wordCount, used)
    wordsByStack[option.id] = words
    drawnWords.push(...words)
    used = Array.from(new Set([...used, ...words.map(word => word.toUpperCase())]))
  }

  return Response.json({ kind: 'stack', roundNumber: round.number, wordsByStack, drawnWords })
}
