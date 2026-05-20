import { describe, expect, it } from 'vitest'
import {
  clearSavedSetup,
  clearUsedWords,
  mergeUsedWords,
  readSavedSetup,
  readUsedWords,
  USED_WORD_HISTORY_LIMIT,
  writeSavedSetup,
  writeUsedWords,
} from './storage'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

class UnavailableStorage implements Storage {
  get length(): number {
    throw new DOMException('blocked', 'SecurityError')
  }

  clear() {
    throw new DOMException('blocked', 'SecurityError')
  }

  getItem(): string | null {
    throw new DOMException('blocked', 'SecurityError')
  }

  key(): string | null {
    throw new DOMException('blocked', 'SecurityError')
  }

  removeItem() {
    throw new DOMException('blocked', 'SecurityError')
  }

  setItem() {
    throw new DOMException('blocked', 'SecurityError')
  }
}

class BadJsonAndBlockedCleanupStorage extends MemoryStorage {
  removeItem() {
    throw new DOMException('blocked cleanup', 'SecurityError')
  }
}

describe('used-word storage', () => {
  it('dedupes, normalizes, and merges word history', () => {
    expect(mergeUsedWords(['apple', 'BANANA'], ['banana', 'Cherry'])).toEqual(['APPLE', 'BANANA', 'CHERRY'])
  })

  it('recovers from corrupt localStorage data', () => {
    const storage = new MemoryStorage()
    storage.setItem('25wol_used_words', '{nope')

    expect(readUsedWords(storage)).toEqual([])
    expect(storage.getItem('25wol_used_words')).toBeNull()
  })

  it('treats unavailable localStorage as empty and keeps gameplay unblocked', () => {
    const storage = new UnavailableStorage()

    expect(readUsedWords(storage)).toEqual([])
    expect(() => writeUsedWords(['apple'], storage)).not.toThrow()
    expect(() => clearUsedWords(storage)).not.toThrow()
  })

  it('does not crash if corrupt used-word cleanup is blocked', () => {
    const storage = new BadJsonAndBlockedCleanupStorage()
    storage.setItem('25wol_used_words', '{nope')

    expect(readUsedWords(storage)).toEqual([])
  })

  it('writes and clears normalized word history', () => {
    const storage = new MemoryStorage()

    writeUsedWords(['apple', 'APPLE', 'pear'], storage)
    expect(readUsedWords(storage)).toEqual(['APPLE', 'PEAR'])

    clearUsedWords(storage)
    expect(readUsedWords(storage)).toEqual([])
  })

  it('keeps the newest used words when stored history gets too large', () => {
    const storage = new MemoryStorage()
    const words = Array.from({ length: USED_WORD_HISTORY_LIMIT + 2 }, (_, index) => `word-${index}`)

    writeUsedWords(words, storage)

    const storedWords = readUsedWords(storage)
    expect(storedWords).toHaveLength(USED_WORD_HISTORY_LIMIT)
    expect(storedWords[0]).toBe('WORD-2')
    expect(storedWords.at(-1)).toBe(`WORD-${USED_WORD_HISTORY_LIMIT + 1}`)
  })
})

describe('setup storage', () => {
  it('writes, normalizes, and clears lightweight setup state', () => {
    const storage = new MemoryStorage()

    writeSavedSetup({
      players: ['Ada', 'Ada', 'Grace'],
      teamNames: ['Red', 'Blue'],
      teamPlayers: [['Ada'], ['Grace']],
      selectedMode: 'chaos',
      challengesEnabled: true,
      alcoholPromptsEnabled: false,
    }, storage)

    expect(readSavedSetup(storage)).toMatchObject({
      players: ['Ada', 'Grace'],
      teamNames: ['Red', 'Blue'],
      teamPlayers: [['Ada'], ['Grace']],
      selectedMode: 'chaos',
    })

    clearSavedSetup(storage)
    expect(readSavedSetup(storage)).toBeNull()
  })

  it('drops stale team assignments that are outside the saved player pool', () => {
    const storage = new MemoryStorage()

    storage.setItem('25wol_setup', JSON.stringify({
      players: ['Ada', 'Grace'],
      teamNames: ['A very long team name that should be capped', 'Blue'],
      teamPlayers: [['Ada', 'Missing'], ['Grace', 'Ada']],
      selectedMode: 'classic',
      challengesEnabled: true,
      alcoholPromptsEnabled: false,
    }))

    expect(readSavedSetup(storage)).toMatchObject({
      players: ['Ada', 'Grace'],
      teamNames: ['A very long team name th', 'Blue'],
      teamPlayers: [['Ada'], ['Grace']],
    })
  })

  it('normalizes player names that contain URL roster separators', () => {
    const storage = new MemoryStorage()

    writeSavedSetup({
      players: ['Ava|Ben', 'Cam'],
      teamNames: ['Red', 'Blue'],
      teamPlayers: [['Ava|Ben'], ['Cam']],
      selectedMode: 'classic',
      challengesEnabled: true,
      alcoholPromptsEnabled: false,
    }, storage)

    expect(readSavedSetup(storage)).toMatchObject({
      players: ['Ava Ben', 'Cam'],
      teamPlayers: [['Ava Ben'], ['Cam']],
    })
  })

  it('recovers from corrupt setup data', () => {
    const storage = new MemoryStorage()
    storage.setItem('25wol_setup', '{broken')

    expect(readSavedSetup(storage)).toBeNull()
    expect(storage.getItem('25wol_setup')).toBeNull()
  })

  it('treats unavailable setup storage as absent and keeps setup editable', () => {
    const storage = new UnavailableStorage()

    expect(readSavedSetup(storage)).toBeNull()
    expect(() => writeSavedSetup({
      players: ['Ada'],
      teamNames: ['Red', 'Blue'],
      teamPlayers: [['Ada'], []],
      selectedMode: 'classic',
      challengesEnabled: true,
      alcoholPromptsEnabled: false,
    }, storage)).not.toThrow()
    expect(() => clearSavedSetup(storage)).not.toThrow()
  })

  it('does not crash if corrupt setup cleanup is blocked', () => {
    const storage = new BadJsonAndBlockedCleanupStorage()
    storage.setItem('25wol_setup', '{broken')

    expect(readSavedSetup(storage)).toBeNull()
  })
})
