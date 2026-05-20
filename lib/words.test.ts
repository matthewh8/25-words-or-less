import { describe, expect, it } from 'vitest'
import {
  getWordBankSummary,
  getWordDecks,
  pickWords,
  validateWordBank,
  WORD_BANK_SOURCES,
  type WordDeck,
  type WordSource,
} from './words'

describe('pickWords', () => {
  it('uses every available unused word before recycling the pool', () => {
    const picked = pickWords(['A', 'B', 'C', 'D', 'E'], 4, ['A', 'B', 'C'])

    expect(picked).toHaveLength(4)
    expect(new Set(picked).size).toBe(4)
    expect(picked).toContain('D')
    expect(picked).toContain('E')
  })

  it('cycles deliberately when the pool is exhausted', () => {
    const picked = pickWords(['A', 'B', 'C'], 2, ['A', 'B', 'C'])

    expect(picked).toHaveLength(2)
    expect(picked.every(word => ['A', 'B', 'C'].includes(word))).toBe(true)
  })

  it('dedupes source pools before selecting a single deal', () => {
    const picked = pickWords(['A', 'A', ' a ', 'B', 'C'], 3)

    expect(picked).toHaveLength(3)
    expect(new Set(picked.map(word => word.toUpperCase())).size).toBe(3)
    expect(picked).toEqual(expect.arrayContaining(['A', 'B', 'C']))
  })

  it('keeps invalid counts empty and trims used-word history before filtering', () => {
    expect(pickWords(['A', 'B'], -1)).toEqual([])
    expect(pickWords(['A', 'B'], Number.NaN)).toEqual([])
    expect(pickWords(['A', 'B'], 1, [' a '])).toEqual(['B'])
  })

  it('accepts deterministic randomness for reproducible deals', () => {
    const picked = pickWords(['A', 'B', 'C'], 3, [], () => 0)

    expect(picked).toEqual(['B', 'C', 'A'])
  })
})

describe('word bank validation', () => {
  it('validates the bundled decks and attribution metadata', () => {
    expect(validateWordBank()).toEqual([])
    expect(WORD_BANK_SOURCES.length).toBeGreaterThanOrEqual(2)
    expect(getWordDecks().find(deck => deck.id === 'red')?.difficulty).toBe('red')
  })

  it('summarizes bundled deck counts without double-counting the bidding deck', () => {
    const summary = getWordBankSummary()

    expect(summary.sourceCount).toBeGreaterThanOrEqual(2)
    expect(summary.deckCounts.green).toBe(2054)
    expect(summary.deckCounts.yellow).toBe(1925)
    expect(summary.deckCounts.red).toBe(2092)
    expect(summary.deckCounts.money).toBe(160)
    expect(summary.totalPlayableWords).toBe(6231)
    expect(summary.deckCounts.bidding).toBeGreaterThan(summary.deckCounts.green)
    expect(summary.decks.find(deck => deck.id === 'green')?.sourceIds).toContain('cefr-j-olp')
  })

  it('reports schema, attribution, safety, and generated-word errors', () => {
    const errors = validateWordBank([
      {
        id: 'expert',
        difficulty: 'black',
        tags: ['campus', 'bad-tag'],
        sourceIds: ['missing-source'],
        words: ['APPLE', 'APPLE', '', 'GOOK', 'lowercase', 'TOO-LONG-WITH-HYPHEN-AND-INVALID-CHARACTER'],
      } as unknown as WordDeck,
    ], [])

    expect(errors.some(error => error.includes('invalid id'))).toBe(true)
    expect(errors.some(error => error.includes('invalid difficulty'))).toBe(true)
    expect(errors.some(error => error.includes('invalid tag'))).toBe(true)
    expect(errors.some(error => error.includes('unknown source'))).toBe(true)
    expect(errors.some(error => error.includes('duplicate'))).toBe(true)
    expect(errors.some(error => error.includes('empty'))).toBe(true)
    expect(errors.some(error => error.includes('blocked'))).toBe(true)
    expect(errors.some(error => error.includes('must be uppercase'))).toBe(true)
    expect(errors.some(error => error.includes('invalid characters'))).toBe(true)
    expect(errors.some(error => error.includes('too long'))).toBe(true)
  })

  it('requires deck and source metadata needed for future generated imports', () => {
    const errors = validateWordBank([
      {
        id: 'green',
        difficulty: 'green',
        tags: [],
        sourceIds: [],
        words: ['APPLE'],
      },
    ], [{
      id: 'generated',
      name: 'Generated import',
      url: 'local:data/word-bank.generated.json',
      licenseNote: 'reviewed import',
      importedAt: 'May 19, 2026',
      transform: 'test transform',
    }])

    expect(errors.some(error => error.includes('source generated has invalid import date'))).toBe(true)
    expect(errors.some(error => error.includes('must include source attribution'))).toBe(true)
    expect(errors.some(error => error.includes('must include at least one tag'))).toBe(true)
  })

  it('reports duplicate deck ids, duplicate source ids, and malformed source URLs', () => {
    const sources: WordSource[] = [
      {
        id: 'generated',
        name: 'Generated import',
        url: 'data/word-bank.generated.json',
        licenseNote: 'reviewed import',
        importedAt: '2026-05-19',
        transform: 'test transform',
      },
      {
        id: 'generated',
        name: 'Generated import copy',
        url: 'local:data/word-bank.generated.json',
        licenseNote: 'reviewed import',
        importedAt: '2026-05-19',
        transform: 'test transform',
      },
    ]
    const errors = validateWordBank([
      {
        id: 'green',
        difficulty: 'green',
        tags: ['campus'],
        sourceIds: ['generated'],
        words: ['APPLE'],
      },
      {
        id: 'green',
        difficulty: 'green',
        tags: ['food'],
        sourceIds: ['generated'],
        words: ['BANANA'],
      },
    ], sources)

    expect(errors.some(error => error.includes('source generated is duplicated'))).toBe(true)
    expect(errors.some(error => error.includes('source generated has invalid url data/word-bank.generated.json'))).toBe(true)
    expect(errors.some(error => error.includes('green deck id is duplicated'))).toBe(true)
  })

  it('reports malformed source ids, impossible source dates, and repeated deck source ids', () => {
    const errors = validateWordBank([
      {
        id: 'green',
        difficulty: 'green',
        tags: ['campus'],
        sourceIds: ['bad source', 'bad source'],
        words: ['APPLE'],
      },
    ], [{
      id: 'bad source',
      name: 'Bad source',
      url: 'local:data/bad.json',
      licenseNote: 'test fixture',
      importedAt: '2026-13-99',
      transform: 'test transform',
    }])

    expect(errors.some(error => error.includes('source bad source has invalid id'))).toBe(true)
    expect(errors.some(error => error.includes('source bad source has invalid import date 2026-13-99'))).toBe(true)
    expect(errors.some(error => error.includes('green deck repeats source bad source'))).toBe(true)
  })

  it('reports duplicate entries across independently played decks', () => {
    const errors = validateWordBank([
      {
        id: 'green',
        difficulty: 'green',
        tags: ['campus'],
        sourceIds: ['curated-party'],
        words: ['AIR GUITAR'],
      },
      {
        id: 'money',
        difficulty: 'money',
        tags: ['party'],
        sourceIds: ['curated-party'],
        words: ['AIR GUITAR'],
      },
      {
        id: 'bidding',
        difficulty: 'yellow',
        tags: ['party'],
        sourceIds: ['curated-party'],
        words: ['AIR GUITAR'],
      },
    ], WORD_BANK_SOURCES)

    expect(errors.some(error => error.includes('money duplicates AIR GUITAR from green'))).toBe(true)
    expect(errors.some(error => error.includes('bidding duplicates AIR GUITAR'))).toBe(false)
  })

  it('reports non-normalized spacing and spacing-insensitive near duplicates', () => {
    const errors = validateWordBank([
      {
        id: 'green',
        difficulty: 'green',
        tags: ['campus'],
        sourceIds: ['curated-party'],
        words: ['AIR GUITAR', 'AIRGUITAR', 'DOUBLE  SPACE'],
      },
      {
        id: 'money',
        difficulty: 'money',
        tags: ['party'],
        sourceIds: ['curated-party'],
        words: ['STUDYBREAK'],
      },
      {
        id: 'yellow',
        difficulty: 'yellow',
        tags: ['campus'],
        sourceIds: ['curated-party'],
        words: ['STUDY BREAK'],
      },
    ], WORD_BANK_SOURCES)

    expect(errors.some(error => error.includes('green contains near-duplicate word: AIRGUITAR matches AIR GUITAR'))).toBe(true)
    expect(errors.some(error => error.includes('green[2] must use normalized spacing'))).toBe(true)
    expect(errors.some(error => error.includes('yellow near-duplicates STUDY BREAK from money (STUDYBREAK)'))).toBe(true)
  })
})
