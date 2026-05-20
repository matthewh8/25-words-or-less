import type { WordDeckId } from './gameMode'

export type WordPools = Record<WordDeckId, string[]>
export type RandomSource = () => number

export const FALLBACK_WORD_POOLS: WordPools = {
  bidding: ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL'],
  green: ['APPLE', 'BREAD', 'CHAIR', 'DOOR', 'EAGLE', 'FORK', 'GARDEN', 'HOUSE'],
  yellow: ['ARCADE', 'BORDER', 'CANYON', 'DANCER', 'EMPIRE', 'FOSSIL', 'GUITAR', 'HARBOR'],
  red: ['ANALOGY', 'BALANCE', 'CIRCUIT', 'DILEMMA', 'ECLIPSE', 'FICTION', 'GRAVITY', 'HYPOTHESIS'],
  money: ['AIR GUITAR', 'BEACH BONFIRE', 'COSTUME PARTY', 'DANCE BATTLE', 'ESCAPE ROOM', 'FOOD TRUCK', 'GAME DAY', 'HIGH FIVE', 'KARAOKE NIGHT', 'PHOTO BOOTH'],
}

function shuffle<T>(arr: T[], random: RandomSource): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const current = a[i]
    a[i] = a[j]
    a[j] = current
  }
  return a
}

function uniqueWords(pool: string[]): string[] {
  const seen = new Set<string>()
  const words: string[] = []

  for (const raw of pool) {
    const word = raw.trim()
    const key = word.toUpperCase()
    if (!word || seen.has(key)) continue
    seen.add(key)
    words.push(word)
  }

  return words
}

function pickCount(count: number): number {
  if (!Number.isFinite(count)) return 0
  return Math.max(0, Math.floor(count))
}

export function pickWords(
  pool: string[],
  count: number,
  usedWords: string[] = [],
  random: RandomSource = Math.random
): string[] {
  const safeCount = pickCount(count)
  if (safeCount === 0) return []

  const uniquePool = uniqueWords(pool)
  const used = new Set(usedWords.map(w => w.trim().toUpperCase()).filter(Boolean))
  const available = shuffle(uniquePool.filter(w => !used.has(w.toUpperCase())), random)

  if (available.length >= safeCount) return available.slice(0, safeCount)

  const picked = [...available]
  const pickedSet = new Set(picked)
  const recycled = shuffle(uniquePool.filter(w => !pickedSet.has(w)), random)

  return [...picked, ...recycled].slice(0, safeCount)
}
