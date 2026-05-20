import wordBankData from '@/data/words/word-bank.json'
import type { WordDeckId } from './gameMode'
import { pickWords, type WordPools } from './wordSelection'

export { pickWords } from './wordSelection'

export type Difficulty = 'green' | 'yellow' | 'red'

export interface WordSource {
  id: string
  name: string
  url: string
  licenseNote: string
  importedAt: string
  transform: string
}

export interface WordDeck {
  id: WordDeckId
  difficulty: Difficulty | 'money'
  sourceIds: string[]
  words: string[]
}

export interface WordDeckSummary {
  id: WordDeckId
  difficulty: Difficulty | 'money'
  count: number
  sourceIds: string[]
}

export interface WordBankSummary {
  totalPlayableWords: number
  deckCounts: Record<WordDeckId, number>
  sourceCount: number
  decks: WordDeckSummary[]
}

interface WordBankData {
  sources: WordSource[]
  deckSourceIds: Record<Difficulty | 'money', string[]>
  decks: Record<Difficulty | 'money', string[]>
}

const wordBank = wordBankData as WordBankData

// Runtime decks are pooled, no-tag difficulty buckets.
// Green/yellow/red are single-word decks; money is phrase-based.
export const WORD_BANK_SOURCES: WordSource[] = wordBank.sources.map(source => ({ ...source }))

export const greenWords: string[] = [...wordBank.decks.green]
export const yellowWords: string[] = [...wordBank.decks.yellow]
export const redWords: string[] = [...wordBank.decks.red]
export const moneyWords: string[] = [...wordBank.decks.money]

const WORD_POOLS: WordPools = {
  bidding: Array.from(new Set([...greenWords, ...yellowWords])),
  green: greenWords,
  yellow: yellowWords,
  red: redWords,
  money: moneyWords,
}

export function getWordPools(): WordPools {
  return {
    bidding: [...WORD_POOLS.bidding],
    green: [...WORD_POOLS.green],
    yellow: [...WORD_POOLS.yellow],
    red: [...WORD_POOLS.red],
    money: [...WORD_POOLS.money],
  }
}

export function getWordsForDeck(deckId: WordDeckId, count: number, usedWords: string[] = []): string[] {
  return pickWords(WORD_POOLS[deckId], count, usedWords)
}

export function getBiddingWords(usedWords: string[] = []): string[] {
  return getWordsForDeck('bidding', 5, usedWords)
}

export function getColorWords(difficulty: Difficulty, usedWords: string[] = []): string[] {
  return getWordsForDeck(difficulty, 5, usedWords)
}

export function getMoneyWords(usedWords: string[] = []): string[] {
  return getWordsForDeck('money', 10, usedWords)
}

const BLOCKED_WORDS = new Set([
  'ABORT',
  'ABORTED',
  'ABORTING',
  'ABORTION',
  'ABORTIONS',
  'ABUSE',
  'ABUSED',
  'ABUSES',
  'ABUSING',
  'ABUSIVE',
  'ASSAULT',
  'ASSAULTED',
  'ASSAULTING',
  'ASSAULTS',
  'ANAL',
  'AMPHETAMINE',
  'BITCH',
  'COCK',
  'CUNT',
  'DICK',
  'DICKHEAD',
  'DISMEMBER',
  'DISMEMBERED',
  'DISMEMBERING',
  'DISMEMBERS',
  'DRUG',
  'DRUGGED',
  'DRUGGING',
  'DRUGS',
  'FAG',
  'FAGGOT',
  'FASCISM',
  'FASCIST',
  'FASCISTS',
  'FUCK',
  'FUCKED',
  'FUCKER',
  'FUCKING',
  'GANGBANGER',
  'GANGBANGERS',
  'GENOCIDE',
  'GOOK',
  'GUN',
  'GUNFIGHTER',
  'GUNFIGHTERS',
  'GUNMAN',
  'GUNMEN',
  'GUNS',
  'GYP',
  'GYPPED',
  'GYPPING',
  'GYPSY',
  'HOLOCAUST',
  'HOMICIDE',
  'INCEST',
  'INTERCOURSE',
  'MAIM',
  'MAIMED',
  'MAIMING',
  'MAIMS',
  'MASSACRE',
  'MASTURBATE',
  'MASTURBATED',
  'MASTURBATES',
  'MASTURBATING',
  'MASTURBATION',
  'MOLEST',
  'MOLESTED',
  'MOLESTING',
  'MOLESTS',
  'MURDER',
  'MURDERED',
  'MURDERER',
  'MURDERERS',
  'MURDERING',
  'MURDERS',
  'NAZI',
  'NAZIS',
  'NIGGA',
  'NIGGER',
  'ORGY',
  'ORGIES',
  'PORN',
  'PORNO',
  'PORNOGRAPHY',
  'PISS',
  'PISSED',
  'PISSING',
  'PSYCHOSIS',
  'PSYCHOTIC',
  'RAPE',
  'RAPED',
  'RAPIST',
  'RAPISTS',
  'RAPING',
  'RACISM',
  'RACIST',
  'RACISTS',
  'RETARD',
  'SEX',
  'CONTRACEPTION',
  'CONTRACEPTIVE',
  'CONTRACEPTIVES',
  'SEXUAL',
  'SEXUALLY',
  'SHIT',
  'SLAVE',
  'SLAVERY',
  'SLUT',
  'SUICIDE',
  'SUICIDES',
  'SUICIDAL',
  'SUPREMACIST',
  'SUPREMACISTS',
  'TERRORISM',
  'TERRORIST',
  'TERRORISTS',
  'TORTURE',
  'TORTURED',
  'TORTURES',
  'TORTURING',
  'TRAFFICKER',
  'TRAFFICKERS',
  'TRAFFICKING',
  'VIBRATOR',
  'VIBRATORS',
  'WHORE',
])

const BLOCKED_PATTERNS = [
  /^PEDOPHIL/,
]

const VALID_WORD_DECK_IDS = new Set<WordDeckId>(['bidding', 'green', 'yellow', 'red', 'money'])
const VALID_DIFFICULTIES = new Set<WordDeck['difficulty']>(['green', 'yellow', 'red', 'money'])
const WORD_ENTRY_PATTERN = /^[A-Z0-9][A-Z0-9 ]*$/
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const SINGLE_WORD_DECK_IDS = new Set<WordDeckId>(['bidding', 'green', 'yellow', 'red'])

function canonicalWordEntry(word: string): string {
  return word.trim().replace(/\s+/g, ' ')
}

function spacingInsensitiveKey(word: string): string {
  return canonicalWordEntry(word).replace(/\s/g, '')
}

function isRomanNumeralArtifact(word: string): boolean {
  return word.length > 1
    && /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(word)
}

function isBlockedWord(word: string): boolean {
  if (isRomanNumeralArtifact(word)) return true
  if (BLOCKED_WORDS.has(word)) return true
  return word.split(' ').some(part => (
    BLOCKED_WORDS.has(part)
    || BLOCKED_PATTERNS.some(pattern => pattern.test(part))
  ))
}

function isIsoDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return false
  return date.toISOString().slice(0, 10) === value
}

function sourceIdsFor(deck: Difficulty | 'money'): string[] {
  return [...wordBank.deckSourceIds[deck]]
}

function biddingSourceIds(): string[] {
  return Array.from(new Set([...wordBank.deckSourceIds.green, ...wordBank.deckSourceIds.yellow]))
}

export function getWordDecks(): WordDeck[] {
  return [
    {
      id: 'green',
      difficulty: 'green',
      sourceIds: sourceIdsFor('green'),
      words: greenWords,
    },
    {
      id: 'yellow',
      difficulty: 'yellow',
      sourceIds: sourceIdsFor('yellow'),
      words: yellowWords,
    },
    {
      id: 'red',
      difficulty: 'red',
      sourceIds: sourceIdsFor('red'),
      words: redWords,
    },
    {
      id: 'bidding',
      difficulty: 'yellow',
      sourceIds: biddingSourceIds(),
      words: WORD_POOLS.bidding,
    },
    {
      id: 'money',
      difficulty: 'money',
      sourceIds: sourceIdsFor('money'),
      words: moneyWords,
    },
  ]
}

export function getWordBankSummary(
  decks: WordDeck[] = getWordDecks(),
  sources: WordSource[] = WORD_BANK_SOURCES
): WordBankSummary {
  const deckCounts: Record<WordDeckId, number> = {
    bidding: 0,
    green: 0,
    yellow: 0,
    red: 0,
    money: 0,
  }
  const deckSummaries = decks.map(deck => {
    deckCounts[deck.id] = deck.words.length
    return {
      id: deck.id,
      difficulty: deck.difficulty,
      count: deck.words.length,
      sourceIds: [...deck.sourceIds],
    }
  })

  return {
    totalPlayableWords: deckSummaries
      .filter(deck => deck.id !== 'bidding')
      .reduce((total, deck) => total + deck.count, 0),
    deckCounts,
    sourceCount: sources.length,
    decks: deckSummaries,
  }
}

export function validateWordBank(
  decks: WordDeck[] = getWordDecks(),
  sources: WordSource[] = WORD_BANK_SOURCES
): string[] {
  const errors: string[] = []
  const sourceIds = new Set(sources.map(source => source.id))
  const seenSourceIds = new Set<string>()
  const seenDeckIds = new Set<string>()
  const playableWordOwners = new Map<string, string>()
  const playableNearDuplicateOwners = new Map<string, { deckId: string; word: string }>()

  if (!sources.length) errors.push('word bank must include at least one source')
  sources.forEach(source => {
    const sourceId = source.id || '(missing id)'
    if (!source.id || !source.name || !source.url || !source.licenseNote || !source.importedAt || !source.transform) {
      errors.push(`source ${sourceId} is missing attribution metadata`)
    }
    if (source.id) {
      if (seenSourceIds.has(source.id)) errors.push(`source ${source.id} is duplicated`)
      seenSourceIds.add(source.id)
      if (!SOURCE_ID_PATTERN.test(source.id)) errors.push(`source ${source.id} has invalid id`)
    }
    if (source.importedAt && !isIsoDateOnly(source.importedAt)) {
      errors.push(`source ${sourceId} has invalid import date ${source.importedAt}`)
    }
    if (source.url && !/^(https?:\/\/|local:)/.test(source.url)) {
      errors.push(`source ${sourceId} has invalid url ${source.url}`)
    }
  })

  decks.forEach(deck => {
    const deckId = typeof deck.id === 'string' && deck.id ? deck.id : '(missing id)'
    if (seenDeckIds.has(deckId)) errors.push(`${deckId} deck id is duplicated`)
    seenDeckIds.add(deckId)
    if (!VALID_WORD_DECK_IDS.has(deck.id)) errors.push(`${deckId} deck has invalid id`)
    if (!VALID_DIFFICULTIES.has(deck.difficulty)) errors.push(`${deckId} deck has invalid difficulty ${deck.difficulty}`)
    if (!Array.isArray(deck.sourceIds) || deck.sourceIds.length === 0) errors.push(`${deckId} deck must include source attribution`)
    if (!Array.isArray(deck.words) || !deck.words.length) errors.push(`${deckId} deck is empty`)

    const deckSourceIds = new Set<string>()
    ;(Array.isArray(deck.sourceIds) ? deck.sourceIds : []).forEach(sourceId => {
      if (deckSourceIds.has(sourceId)) errors.push(`${deck.id} deck repeats source ${sourceId}`)
      deckSourceIds.add(sourceId)
      if (!sourceIds.has(sourceId)) errors.push(`${deck.id} deck references unknown source ${sourceId}`)
    })

    const seen = new Set<string>()
    const nearSeen = new Map<string, string>()
    ;(Array.isArray(deck.words) ? deck.words : []).forEach((word, index) => {
      const label = `${deckId}[${index}]`
      if (typeof word !== 'string' || !word.trim()) {
        errors.push(`${label} is empty`)
        return
      }
      const canonical = canonicalWordEntry(word)
      if (word !== canonical) errors.push(`${label} must use normalized spacing: ${word}`)
      if (canonical.length > 32) errors.push(`${label} is too long: ${canonical}`)
      if (canonical !== canonical.toUpperCase()) errors.push(`${label} must be uppercase: ${canonical}`)
      if (!WORD_ENTRY_PATTERN.test(canonical)) errors.push(`${label} has invalid characters: ${canonical}`)
      if (isBlockedWord(canonical)) errors.push(`${label} is blocked by safety filter: ${canonical}`)
      const wordCount = canonical.split(' ').length
      if (deck.id === 'money' && (wordCount < 2 || wordCount > 4)) {
        errors.push(`${label} must be a 2-4 word money phrase: ${canonical}`)
      }
      if (SINGLE_WORD_DECK_IDS.has(deck.id) && wordCount !== 1) {
        errors.push(`${label} must be a single word for ${deck.id}: ${canonical}`)
      }
      if (seen.has(canonical)) errors.push(`${deckId} contains duplicate word: ${canonical}`)
      seen.add(canonical)

      const nearKey = spacingInsensitiveKey(canonical)
      const previousNearWord = nearSeen.get(nearKey)
      if (previousNearWord && previousNearWord !== canonical) {
        errors.push(`${deckId} contains near-duplicate word: ${canonical} matches ${previousNearWord}`)
      } else {
        nearSeen.set(nearKey, canonical)
      }

      if (deck.id !== 'bidding') {
        const previousDeck = playableWordOwners.get(canonical)
        if (previousDeck && previousDeck !== deckId) {
          errors.push(`${deckId} duplicates ${canonical} from ${previousDeck}`)
        } else {
          playableWordOwners.set(canonical, deckId)
        }

        const previousNearOwner = playableNearDuplicateOwners.get(nearKey)
        if (previousNearOwner && previousNearOwner.word !== canonical) {
          errors.push(`${deckId} near-duplicates ${canonical} from ${previousNearOwner.deckId} (${previousNearOwner.word})`)
        } else {
          playableNearDuplicateOwners.set(nearKey, { deckId, word: canonical })
        }
      }
    })
  })

  return errors
}
