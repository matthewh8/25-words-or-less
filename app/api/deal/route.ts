import { DEFAULT_GAME_MODE, getStackRound } from '@/lib/gameMode'
import { getDefinitionsForWords, getWordsForDeck } from '@/lib/words'
import { appendUsedWords } from '@/lib/dealing'
import { canonicalWord } from '@/lib/wordSelection'

export const dynamic = 'force-dynamic'

type DealKind = 'bidding' | 'stack' | 'money'

interface RawDealRequest {
  kind?: DealKind
  usedWords?: unknown
  roundNumber?: unknown
}

function normalizeUsedWords(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((word): word is string => typeof word === 'string')
        .map(canonicalWord)
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
  return value === 'bidding' || value === 'stack' || value === 'money'
}

export async function POST(request: Request) {
  let body: RawDealRequest
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isDealKind(body.kind)) {
    return Response.json({ error: 'Invalid deal kind' }, { status: 400 })
  }

  const gameMode = DEFAULT_GAME_MODE
  const usedWords = normalizeUsedWords(body.usedWords)

  if (body.kind === 'bidding') {
    const words = getWordsForDeck(gameMode.bidding.wordDeck, gameMode.bidding.wordCount, usedWords)
    return Response.json({ kind: 'words', deckId: gameMode.bidding.wordDeck, words, definitions: getDefinitionsForWords(words) })
  }

  if (body.kind === 'money') {
    const words = getWordsForDeck(gameMode.money.wordDeck, gameMode.money.wordCount, usedWords)
    return Response.json({ kind: 'words', deckId: gameMode.money.wordDeck, words, definitions: getDefinitionsForWords(words) })
  }

  const round = getStackRound(gameMode, positiveInt(body.roundNumber, gameMode.stacks.rounds[0].number, 99))
    ?? gameMode.stacks.rounds[0]
  const wordsByStack: Record<string, string[]> = {}
  const drawnWords: string[] = []
  let used = usedWords

  for (const option of gameMode.stacks.options) {
    const words = getWordsForDeck(option.wordDeck, gameMode.stacks.wordCount, used)
    wordsByStack[option.id] = words
    drawnWords.push(...words)
    used = appendUsedWords(used, words)
  }

  return Response.json({
    kind: 'stack',
    roundNumber: round.number,
    wordsByStack,
    drawnWords,
    definitions: getDefinitionsForWords(drawnWords),
  })
}
