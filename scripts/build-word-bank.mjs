#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  MIN_AVERAGE_ZIPF,
  MIN_MONEY_ZIPF,
  WORDFREQ_SOURCE_ID,
  WORDFREQ_VERSION,
  loadWordfreqScores,
} from './wordfreq-utils.mjs'

const DEFAULT_OUTPUT_PATH = 'data/words/word-bank.json'
const DEFAULT_TARGET_TOTAL = 20000
const DEFAULT_MONEY_TARGET = 2000
const SINGLE_DECK_TARGET_WEIGHTS = {
  green: 1,
  yellow: 1,
  red: 1,
}
const SINGLE_DECK_TARGET_WEIGHT_TOTAL = Object.values(SINGLE_DECK_TARGET_WEIGHTS)
  .reduce((total, weight) => total + weight, 0)
const RAW_DIR = 'data/words/raw'
const SEED_PATH = 'data/words/seed-decks.json'

const ESDB_VERSION = '2026.02.25'
const ESDB_RELEASE_REF = 'rel-2026.02.25'
const ESDB_DEFAULT_URL = `https://raw.githubusercontent.com/en-wl/wordlist-diff/${ESDB_RELEASE_REF}/en_US.txt`
const ESDB_LARGE_URL = `https://raw.githubusercontent.com/en-wl/wordlist-diff/${ESDB_RELEASE_REF}/en_US-large.txt`
const CMUDICT_URL = 'https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict'
const OEWN_URL = 'https://en-word.net/static/english-wordnet-2025.zip'

const WORD_ENTRY_PATTERN = /^[A-Z0-9]+$/
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

const BLOCKED_WORDS = new Set([
  'ABORT',
  'ABORTED',
  'ABORTING',
  'ABORTION',
  'ABORTIONS',
  'ABUSE',
  'ABUSED',
  'ABUSER',
  'ABUSERS',
  'ABUSES',
  'ABUSING',
  'ABUSIVE',
  'ABDUCT',
  'ABDUCTED',
  'ABDUCTING',
  'ABDUCTION',
  'ABDUCTIONS',
  'ASSAULT',
  'ASSAULTED',
  'ASSAULTING',
  'ASSAULTS',
  'ANAL',
  'ANUS',
  'APARTHEID',
  'AMPHETAMINE',
  'ASEXUAL',
  'BISEXUAL',
  'BITCH',
  'BOMB',
  'BOMBED',
  'BOMBING',
  'BOMBS',
  'COCK',
  'COCAINE',
  'COITUS',
  'CUNT',
  'DARKIE',
  'DICK',
  'DICKHEAD',
  'DICKER',
  'DICKERED',
  'DICKERING',
  'DICKERS',
  'DILDO',
  'DILDOS',
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
  'FETUS',
  'FLEER',
  'FLEERS',
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
  'HELLUVA',
  'HOLOCAUST',
  'HOMICIDE',
  'HEROIN',
  'HETEROSEXUAL',
  'HOMOSEXUAL',
  'INCEST',
  'INTERCOURSE',
  'JIHAD',
  'LECHER',
  'LECHEROUS',
  'LECHERY',
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
  'METH',
  'METHADONE',
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
  'NARCOTIC',
  'NARCOTICS',
  'NEGROID',
  'NIGGA',
  'NIGGER',
  'OPIATE',
  'OPIATES',
  'OPIOID',
  'OPIOIDS',
  'ORGY',
  'ORGIES',
  'PANSEXUAL',
  'PISTOL',
  'PISTOLS',
  'PORN',
  'PORNO',
  'PORNOGRAPHY',
  'PISS',
  'PISSED',
  'PISSING',
  'PSYCHOSIS',
  'PSYCHOTIC',
  'PUBE',
  'PUBES',
  'PUBIC',
  'PUBIS',
  'RAPE',
  'RAPED',
  'RAPIST',
  'RAPISTS',
  'RAPING',
  'RACISM',
  'RACIST',
  'RACISTS',
  'RETARD',
  'RIFLE',
  'RIFLES',
  'CRACKHEAD',
  'CRACKHEADS',
  'CUNNILINGUS',
  'EXCRETE',
  'SEX',
  'CONTRACEPTION',
  'CONTRACEPTIVE',
  'CONTRACEPTIVES',
  'SEXUAL',
  'SEXUALLY',
  'SHIT',
  'SHYSTER',
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
  'WEAPON',
  'WEAPONRY',
  'WEAPONS',
  'ARSE',
  'BOMBARDED',
  'BOMBARDMENT',
  'BOMBER',
  'BOMBERS',
  'BOMBSHELL',
  'BLOODBATH',
  'BLOODED',
  'BLOODSHED',
  'BREAST',
  'BREASTED',
  'BREASTFEEDING',
  'BREASTS',
  'BUGGER',
  'BULLSHIT',
  'CERVIX',
  'COLORECTAL',
  'ARSENAL',
  'ARSENIC',
  'DICKENS',
  'ENSLAVED',
  'ESKIMO',
  'FELON',
  'FELONIES',
  'FELONY',
  'GUNFIRE',
  'GUNNER',
  'GUNPOINT',
  'GUNPOWDER',
  'GUNSHOT',
  'GUNSHOTS',
  'HANDGUN',
  'HANDGUNS',
  'HEMORRHAGE',
  'JERKING',
  'GUILLOTINE',
  'KILL',
  'KILLED',
  'KILLER',
  'KILLERS',
  'KILLING',
  'KILLINGS',
  'KILLS',
  'MURDEROUS',
  'NUCLEAR',
  'ORGASM',
  'ORGASMS',
  'ORIENTAL',
  'PAINKILLERS',
  'RAPES',
  'RETARDED',
  'SEXIEST',
  'SEXISM',
  'SEXIST',
  'SEXUALITY',
  'SEXY',
  'SHITTING',
  'SHITTY',
  'SHOTGUN',
  'SHOTGUNS',
  'SLAVES',
  'SEXTON',
  'SPANK',
  'SPANKING',
  'UNISEX',
  'WHORE',
])

const BLOCKED_PATTERNS = [
  /^PEDOPHIL/,
  /FUCK/,
  /PORN/,
  /SHIT/,
  /^HOMOSEXUAL/,
  /^RETARD/,
]

const EASY_WORDS = new Set([
  'APPLE', 'BABY', 'BALL', 'BANK', 'BEACH', 'BED', 'BIKE', 'BIRD', 'BOOK', 'BREAD',
  'BUS', 'CAKE', 'CAR', 'CAT', 'CHAIR', 'CHEESE', 'CITY', 'CLOCK', 'CLOUD', 'COAT',
  'COFFEE', 'COLD', 'COOK', 'DANCE', 'DOG', 'DOOR', 'DRINK', 'EAGLE', 'EAR', 'EGG',
  'FAMILY', 'FARM', 'FIRE', 'FISH', 'FOOD', 'FOOT', 'FORK', 'FRIEND', 'GAME', 'GARDEN',
  'GIRL', 'GLASS', 'GOLD', 'HAND', 'HAPPY', 'HAT', 'HOME', 'HOUSE', 'ICE', 'JOB',
  'KEY', 'KING', 'KITCHEN', 'LAKE', 'LAMP', 'LEG', 'LIGHT', 'LOVE', 'MAN', 'MILK',
  'MONEY', 'MOON', 'MOTHER', 'MOUNTAIN', 'MOUSE', 'MUSIC', 'NIGHT', 'NOSE', 'PAPER', 'PARK',
  'PARTY', 'PHONE', 'PIZZA', 'RAIN', 'RICE', 'ROAD', 'ROOM', 'SCHOOL', 'SHOE', 'SHOP',
  'SONG', 'STAR', 'STREET', 'SUN', 'TABLE', 'TEAM', 'TREE', 'WATER', 'WOMAN', 'WORD',
  'AIRPLANE', 'BACKPACK', 'BASEBALL', 'BIRTHDAY', 'BUTTERFLY', 'CASTLE', 'COWBOY',
  'COWGIRL', 'CUPCAKE', 'DINOSAUR', 'DRAGON', 'ELEPHANT', 'FOOTBALL', 'GIRAFFE',
  'HAMBURGER', 'MERMAID', 'MONSTER', 'NOTEBOOK', 'PANCAKE', 'PINEAPPLE', 'PUMPKIN',
  'RAINBOW', 'ROBOT', 'SANDWICH', 'SNOWMAN', 'SPAGHETTI', 'TEACHER', 'TORNADO',
  'TREASURE', 'UMBRELLA', 'VOLCANO', 'WATERMELON',
])

const ABSTRACT_SUFFIXES = [
  'ABILITY',
  'ANCE',
  'ENCE',
  'HOOD',
  'ISM',
  'ITY',
  'MENT',
  'NESS',
  'OLOGY',
  'SHIP',
  'SION',
  'TION',
]

const HARD_SUFFIXES = [
  'CIAL',
  'CIENT',
  'GRAPHY',
  'ICAL',
  'IZATION',
  'OLOGICAL',
  'SOPHY',
  'TATIVE',
]

const PREFIX_PENALTIES = [
  /^ANTI[A-Z]{5,}/,
  /^COUNTER[A-Z]{5,}/,
  /^HYPER[A-Z]{5,}/,
  /^INTER[A-Z]{6,}/,
  /^MIS[A-Z]{6,}/,
  /^MULTI[A-Z]{5,}/,
  /^NON[A-Z]{6,}/,
  /^OVER[A-Z]{6,}/,
  /^PRE[A-Z]{7,}/,
  /^RE[A-Z]{8,}/,
  /^SUB[A-Z]{6,}/,
  /^SUPER[A-Z]{5,}/,
  /^TRANS[A-Z]{5,}/,
  /^UNDER[A-Z]{5,}/,
  /^UN[A-Z]{7,}/,
]

const INFLECTION_PATTERNS = [
  /[A-Z]{5,}INGS$/,
  /[A-Z]{5,}ING$/,
  /[A-Z]{5,}ED$/,
  /[A-Z]{5,}IES$/,
  /[A-Z]{5,}ES$/,
  /[A-Z]{5,}S$/,
]

const MONEY_SINGLE_BLOCKED_WORDS = new Set([
  'ABDUCTION',
  'ATOMIC',
  'BOMB',
  'BOMBING',
  'CANNON',
  'CRIMINAL',
  'DAMAGE',
  'DAGGER',
  'NUCLEAR',
  'PHALLIC',
  'PISTOL',
  'REACTOR',
  'RIFLE',
  'ROCKET',
  'SURGERY',
  'WARHEAD',
  'WEAPON',
])

const args = process.argv.slice(2)
const options = { refresh: false }

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--refresh') {
    options.refresh = true
    continue
  }

  if (!['--output', '--target'].includes(arg)) {
    console.error(`Unknown option: ${arg}`)
    process.exit(1)
  }

  const value = args[i + 1]
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${arg}`)
    process.exit(1)
  }

  options[arg.slice(2)] = value
  i++
}

const outputPath = options.output ?? DEFAULT_OUTPUT_PATH
const targetTotal = Number(options.target ?? DEFAULT_TARGET_TOTAL)
if (!Number.isInteger(targetTotal) || targetTotal <= 0) {
  console.error('--target must be a positive integer')
  process.exit(1)
}

function cleanWord(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function spacingInsensitiveKey(value) {
  return cleanWord(value).replace(/\s/g, '')
}

function isRomanNumeralArtifact(word) {
  return word.length > 1
    && /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(word)
}

function isBlocked(word) {
  if (isRomanNumeralArtifact(word)) return true
  if (BLOCKED_WORDS.has(word)) return true
  return word.split(' ').some(part => (
    BLOCKED_WORDS.has(part)
    || BLOCKED_PATTERNS.some(pattern => pattern.test(part))
  ))
}

function isValidEntry(word) {
  return Boolean(word)
    && word.length <= 32
    && WORD_ENTRY_PATTERN.test(word)
    && !isBlocked(word)
}

function estimateSyllables(word) {
  const cleaned = word.replace(/[^A-Z]/g, '').toLowerCase()
  if (!cleaned) return 0
  const groups = cleaned.match(/[aeiouy]+/g) ?? []
  let count = groups.length
  if (cleaned.length > 3 && cleaned.endsWith('e')) count -= 1
  if (cleaned.endsWith('le') && cleaned.length > 2 && !/[aeiouy]/.test(cleaned.at(-3) ?? '')) count += 1
  return Math.max(1, count)
}

function cmuSyllables(phones) {
  if (!phones) return null
  const count = phones.filter(phone => /\d$/.test(phone)).length
  return count > 0 ? count : null
}

function suffixHit(word, suffixes) {
  return suffixes.some(suffix => word.endsWith(suffix))
}

function hasPrefixPenalty(word) {
  return PREFIX_PENALTIES.some(pattern => pattern.test(word))
}

function hasInflectionPenalty(word) {
  return INFLECTION_PATTERNS.some(pattern => pattern.test(word))
}

function rareLetterCount(word) {
  return (word.match(/[JQXZ]/g) ?? []).length
}

function auditDifficultyScore(candidate) {
  const word = candidate.word
  const syllables = cmuSyllables(candidate.cmuPhones) ?? estimateSyllables(word)
  const wordNetPos = candidate.wordNetPos
  let score = 0

  if (candidate.seedDecks.has('green')) score -= 2
  if (candidate.seedDecks.has('yellow')) score -= 0.5
  if (candidate.seedDecks.has('red')) score += 2

  if (EASY_WORDS.has(word)) score -= 4
  if (candidate.wordfreqZipf >= 4.5) score -= 3
  else if (candidate.wordfreqZipf >= 3.7) score -= 2
  else if (candidate.wordfreqZipf >= 3) score -= 1
  else if (candidate.wordfreqZipf < MIN_AVERAGE_ZIPF) score += 4
  else if (candidate.wordfreqZipf < MIN_AVERAGE_ZIPF + 0.3) score += 2
  if (candidate.inDefault) score -= 1
  if (candidate.inLarge && !candidate.inDefault) score += 1.5
  if (!candidate.cmuPhones) score += 2
  if (!wordNetPos.size && !candidate.seedDecks.size) score += 1
  if (!candidate.seedDecks.size && !EASY_WORDS.has(word)) {
    if (word.length <= 4) score += 3
    else if (word.length <= 5) score += 3
    else if (word.length <= 6 && syllables <= 1) score += 0.75
  }

  if (wordNetPos.has('noun')) score -= 0.75
  if (wordNetPos.has('verb')) score -= 0.25
  if (wordNetPos.has('adv')) score += 1
  if (wordNetPos.size === 1 && wordNetPos.has('adj')) score += 0.5

  if (word.length <= 4) score -= 2
  else if (word.length === 5) score -= 1
  else if (word.length >= 13) score += 4
  else if (word.length >= 11) score += 3
  else if (word.length >= 9) score += 2
  else if (word.length >= 8) score += 1

  if (syllables <= 1) score -= 1.5
  else if (syllables === 2) score -= 0.5
  else if (syllables === 3) score += 1
  else if (syllables === 4) score += 2.5
  else if (syllables >= 5) score += 4

  if (suffixHit(word, ABSTRACT_SUFFIXES)) score += 3
  if (suffixHit(word, HARD_SUFFIXES)) score += 4
  if (!candidate.seedDecks.size && word.length <= 5 && word.endsWith('S')) score += 0.25
  if (word.endsWith('LY') && word.length > 5) score += 1.5
  if (word.endsWith('OUS') && word.length > 6) score += 1
  if (word.endsWith('IVE') && word.length > 6) score += 1
  if (word.endsWith('LESS') && word.length > 7) score += 1
  if (hasPrefixPenalty(word)) score += 1
  if (hasInflectionPenalty(word)) score += 0.75

  score += Math.min(2, rareLetterCount(word) * 0.5)
  if (/[BCDFGHJKLMNPQRSTVWXZ]{4,}/.test(word)) score += 1.5
  if (!/[AEIOUY]/.test(word)) score += 3

  return score
}

function qualityScore(candidate) {
  let score = 0
  if (!candidate.seedDecks.size) score += 1
  if (candidate.wordfreqZipf < MIN_AVERAGE_ZIPF) score += 8
  else if (candidate.wordfreqZipf < MIN_AVERAGE_ZIPF + 0.3) score += 1
  else if (candidate.wordfreqZipf >= 3.5) score -= 1
  if (!candidate.cmuPhones) score += 4
  if (!candidate.wordNetPos.size) score += 2
  if (!candidate.inDefault) score += 2
  if (candidate.inLarge && !candidate.inDefault) score += 1
  if (candidate.word.length < 4 && !EASY_WORDS.has(candidate.word)) score += 5
  if (candidate.word.length > 14) score += 1
  return score
}

function hasNicheDefinition(candidate) {
  if (candidate.wordfreqZipf >= 2.8) return false
  return [
    /^a member of (?:a|an|the) .* people/i,
    /^a group of (?:people|languages)/i,
    /^a language spoken/i,
    /genus [A-Z]/,
    /family [A-Z]/,
    /\bbreed of\b/i,
    /Vishnu/i,
    /Hindu deity/i,
    /Buddhist/i,
  ].some(pattern => pattern.test(candidate.definition))
}

function hasCommonSource(candidate) {
  return candidate.inDefault || EASY_WORDS.has(candidate.word)
}

async function downloadIfNeeded(targetPath, url) {
  if (!options.refresh && existsSync(targetPath)) return

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(targetPath, buffer)
}

function parseSeedBank(raw) {
  const value = JSON.parse(raw)
  const decks = value.decks
  if (!decks || typeof decks !== 'object') throw new Error(`${SEED_PATH} must include decks`)
  for (const deck of ['green', 'yellow', 'red', 'money']) {
    if (!Array.isArray(decks[deck])) throw new Error(`${SEED_PATH} decks.${deck} must be an array`)
  }
  return value
}

function parseScowl(raw, tier) {
  const candidates = []
  for (const line of raw.replace(/\r/g, '').split('\n')) {
    const original = line.trim()
    if (!/^[a-z]+$/.test(original)) continue
    if (original.length < 3 || original.length > 16) continue

    const word = original.toUpperCase()
    if (word.length < 4 && !EASY_WORDS.has(word)) continue
    if (!isValidEntry(word)) continue

    candidates.push({ word, tier })
  }
  return candidates
}

function parseCmu(raw) {
  const pronunciations = new Map()
  for (const line of raw.split(/\r?\n/)) {
    const [headword, ...phones] = line.trim().split(/\s+/)
    if (!headword || !/^[a-z]+(?:\(\d+\))?$/.test(headword)) continue
    const word = headword.replace(/\(\d+\)$/, '').toUpperCase()
    if (!pronunciations.has(word)) pronunciations.set(word, phones)
  }
  return pronunciations
}

function unzipText(zipPath, entryPath) {
  return execFileSync('unzip', ['-p', zipPath, entryPath], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  })
}

function addPos(map, word, pos) {
  const entry = map.get(word) ?? new Set()
  entry.add(pos)
  map.set(word, entry)
}

function cleanDefinition(gloss) {
  const definition = String(gloss ?? '')
    .split(';')[0]
    .replace(/\s+/g, ' ')
    .replace(/^"|"$/g, '')
    .trim()

  if (!definition) return ''
  if (definition.length <= 180) return definition

  const cut = definition.slice(0, 180)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 120 ? lastSpace : 180).trim()}...`
}

function technicalDefinitionPenalty(definition) {
  return [
    /^a member of (?:a|an|the) .* people/i,
    /^a group of (?:people|languages)/i,
    /^a language spoken/i,
    /genus [A-Z]/,
    /family [A-Z]/,
    /\bbreed of\b/i,
    /\bspecies\b/i,
    /Vishnu/i,
    /Hindu deity/i,
    /Buddhist/i,
  ].filter(pattern => pattern.test(definition)).length
}

function sensePosAliases(posNumber) {
  if (posNumber === '1') return ['n']
  if (posNumber === '2') return ['v']
  if (posNumber === '3') return ['a', 's']
  if (posNumber === '4') return ['r']
  if (posNumber === '5') return ['s', 'a']
  return []
}

function parseSenseRanks(zipPath) {
  const ranks = new Map()
  const text = unzipText(zipPath, 'oewn2025/index.sense')

  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 3) continue

    const senseKey = parts[0]
    const match = senseKey.match(/^(.+)%([1-5]):/)
    if (!match) continue

    const lemma = match[1]
    if (!/^[a-z_]+$/.test(lemma)) continue
    const word = lemma.replace(/_/g, ' ').toUpperCase()
    if (word.includes(' ') || !isValidEntry(word)) continue

    const offset = parts[1]
    const senseNumber = Number.parseInt(parts[2], 10)
    if (!/^\d{8}$/.test(offset) || !Number.isInteger(senseNumber)) continue

    for (const pos of sensePosAliases(match[2])) {
      const key = `${word}:${offset}:${pos}`
      const previous = ranks.get(key)
      if (previous === undefined || senseNumber < previous) ranks.set(key, senseNumber)
    }
  }

  return ranks
}

function addDefinitionCandidate(map, word, offset, posCode, gloss, sequence) {
  if (word.includes(' ') || !isValidEntry(word)) return

  const definition = cleanDefinition(gloss)
  if (!definition) return

  const candidates = map.get(word) ?? []
  candidates.push({ offset, posCode, definition, sequence })
  map.set(word, candidates)
}

function derivedLemmaCandidates(word) {
  const candidates = []

  if (word.endsWith('IES') && word.length > 4) candidates.push(`${word.slice(0, -3)}Y`)
  if (word.endsWith('ING') && word.length > 5) {
    const stem = word.slice(0, -3)
    candidates.push(stem, `${stem}E`)
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) candidates.push(stem.slice(0, -1))
  }
  if (word.endsWith('ED') && word.length > 4) {
    const stem = word.slice(0, -2)
    candidates.push(stem, `${stem}E`)
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) candidates.push(stem.slice(0, -1))
  }
  if (word.endsWith('ES') && word.length > 4) candidates.push(word.slice(0, -2))
  if (word.endsWith('S') && word.length > 4) candidates.push(word.slice(0, -1))

  return [...new Set(candidates)].filter(candidate => candidate !== word && isValidEntry(candidate))
}

function definitionForWord(word, definitions) {
  const direct = definitions.get(word)
  if (direct) return direct

  for (const lemma of derivedLemmaCandidates(word)) {
    const definition = definitions.get(lemma)
    if (definition) return definition
  }
  return ''
}

function parseOpenEnglishWordNet(zipPath) {
  const words = new Map()
  const definitionCandidates = new Map()
  const senseRanks = parseSenseRanks(zipPath)
  const indexFiles = [
    ['index.noun', 'noun'],
    ['index.verb', 'verb'],
    ['index.adj', 'adj'],
    ['index.adv', 'adv'],
  ]

  for (const [file, pos] of indexFiles) {
    const text = unzipText(zipPath, `oewn2025/${file}`)
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith(' ')) continue
      const lemma = line.split(/\s+/)[0]
      if (!/^[a-z_]+$/.test(lemma)) continue
      const word = lemma.replace(/_/g, ' ').toUpperCase()
      if (!word.includes(' ') && word.length >= 3 && word.length <= 16 && isValidEntry(word)) {
        addPos(words, word, pos)
      }
    }
  }

  const dataFiles = [
    ['data.noun', 'noun'],
    ['data.verb', 'verb'],
    ['data.adj', 'adj'],
    ['data.adv', 'adv'],
  ]
  let sequence = 0

  for (const [file, pos] of dataFiles) {
    const text = unzipText(zipPath, `oewn2025/${file}`)
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith(' ')) continue

      const pipeIndex = line.indexOf('|')
      if (pipeIndex === -1) continue

      const data = line.slice(0, pipeIndex).trim()
      const gloss = line.slice(pipeIndex + 1).trim()
      const parts = data.split(/\s+/)
      if (parts.length < 5) continue

      const [offset,, posCode, wordCountHex] = parts
      const wordCount = Number.parseInt(wordCountHex, 16)
      if (!/^\d{8}$/.test(offset) || !Number.isInteger(wordCount) || wordCount <= 0) continue

      for (let i = 0; i < wordCount; i++) {
        const lemma = parts[4 + i * 2]
        if (!lemma || !/^[A-Za-z_]+$/.test(lemma)) continue

        const word = lemma.replace(/_/g, ' ').toUpperCase()
        if (word.includes(' ') || word.length < 3 || word.length > 16 || !isValidEntry(word)) continue

        addPos(words, word, pos)
        addDefinitionCandidate(definitionCandidates, word, offset, posCode, gloss, sequence)
      }
      sequence += 1
    }
  }

  const definitions = new Map()
  for (const [word, candidates] of definitionCandidates.entries()) {
    candidates.sort((a, b) => {
      const aRank = senseRanks.get(`${word}:${a.offset}:${a.posCode}`) ?? 999
      const bRank = senseRanks.get(`${word}:${b.offset}:${b.posCode}`) ?? 999
      return technicalDefinitionPenalty(a.definition) - technicalDefinitionPenalty(b.definition)
        || aRank - bRank
        || a.definition.length - b.definition.length
        || a.sequence - b.sequence
    })
    definitions.set(word, candidates[0].definition)
  }

  const exceptionFiles = [
    ['noun.exc', 'noun'],
    ['verb.exc', 'verb'],
    ['adj.exc', 'adj'],
    ['adv.exc', 'adv'],
  ]
  for (const [file, pos] of exceptionFiles) {
    const text = unzipText(zipPath, `oewn2025/${file}`)
    for (const line of text.split(/\r?\n/)) {
      const [headword, ...lemmas] = line.trim().split(/\s+/)
      if (!headword || !lemmas.length || !/^[a-z_]+$/.test(headword)) continue

      const word = headword.replace(/_/g, ' ').toUpperCase()
      if (word.includes(' ') || !isValidEntry(word)) continue

      addPos(words, word, pos)
      if (definitions.has(word)) continue

      for (const lemma of lemmas) {
        if (!/^[a-z_]+$/.test(lemma)) continue
        const baseWord = lemma.replace(/_/g, ' ').toUpperCase()
        const definition = definitions.get(baseWord)
        if (definition) {
          definitions.set(word, definition)
          break
        }
      }
    }
  }

  return { words, definitions }
}

function upsertCandidate(candidates, rawWord) {
  const word = cleanWord(rawWord)
  if (!isValidEntry(word)) return null
  const nearKey = spacingInsensitiveKey(word)
  if (candidates.blockedNearKeys.has(nearKey)) return null
  const existing = candidates.byNearKey.get(nearKey)
  if (existing && existing !== word) return null

  let candidate = candidates.byWord.get(word)
  if (!candidate) {
    candidate = {
      word,
      seedDecks: new Set(),
      inDefault: false,
      inLarge: false,
      cmuPhones: null,
      wordNetPos: new Set(),
      definition: '',
      wordfreqZipf: 0,
      difficultyScore: 0,
      qualityScore: 0,
    }
    candidates.byWord.set(word, candidate)
    candidates.byNearKey.set(nearKey, word)
  }
  return candidate
}

function assertSource(source) {
  if (!SOURCE_ID_PATTERN.test(source.id)) throw new Error(`Invalid source id: ${source.id}`)
  if (!/^(https?:\/\/|local:)/.test(source.url)) throw new Error(`Invalid source url: ${source.url}`)
}

function deckSourceIds(words) {
  const ids = new Set()
  for (const candidate of words) {
    if (candidate.seedDecks.size) {
      ids.add('cefr-j-olp')
      ids.add('curated-party')
    }
    if (candidate.inDefault || candidate.inLarge) ids.add('esdb-en-us-2026-02-25')
    if (candidate.cmuPhones) ids.add('cmudict')
    if (candidate.wordNetPos.size) ids.add('open-english-wordnet-2025')
    if (candidate.wordfreqZipf > 0) ids.add(WORDFREQ_SOURCE_ID)
  }
  return [...ids]
}

function asSortedWords(candidates) {
  return candidates.map(candidate => candidate.word).sort((a, b) => a.localeCompare(b))
}

function isMoneySingleCandidate(candidate) {
  return !candidate.seedDecks.size
    && !candidate.word.includes(' ')
    && (candidate.word.length >= 5 || EASY_WORDS.has(candidate.word))
    && candidate.word.length <= 12
    && candidate.wordfreqZipf >= MIN_MONEY_ZIPF
    && candidate.inDefault
    && Boolean(candidate.cmuPhones)
    && candidate.wordNetPos.size > 0
    && (candidate.wordNetPos.has('noun') || candidate.wordNetPos.has('verb'))
    && !candidate.wordNetPos.has('adv')
    && candidate.qualityScore <= 2
    && candidate.difficultyScore >= -3
    && candidate.difficultyScore <= 4
    && !MONEY_SINGLE_BLOCKED_WORDS.has(candidate.word)
    && !suffixHit(candidate.word, ABSTRACT_SUFFIXES)
    && !suffixHit(candidate.word, HARD_SUFFIXES)
    && !(hasInflectionPenalty(candidate.word) && candidate.word.length > 7)
}

function buildMoneyCandidates(singleCandidates) {
  return singleCandidates
    .filter(isMoneySingleCandidate)
    .sort((a, b) => (
      a.qualityScore - b.qualityScore
      || Math.abs(a.difficultyScore - 0.25) - Math.abs(b.difficultyScore - 0.25)
      || a.word.length - b.word.length
      || a.word.localeCompare(b.word)
    ))
}

await mkdir(RAW_DIR, { recursive: true })

const rawPaths = {
  esdbDefault: path.join(RAW_DIR, `wordlist-en_US-${ESDB_VERSION}.txt`),
  esdbLarge: path.join(RAW_DIR, `wordlist-en_US-large-${ESDB_VERSION}.txt`),
  cmu: path.join(RAW_DIR, 'cmudict-master.dict'),
  oewn: path.join(RAW_DIR, 'english-wordnet-2025.zip'),
}

try {
  await Promise.all([
    downloadIfNeeded(rawPaths.esdbDefault, ESDB_DEFAULT_URL),
    downloadIfNeeded(rawPaths.esdbLarge, ESDB_LARGE_URL),
    downloadIfNeeded(rawPaths.cmu, CMUDICT_URL),
    downloadIfNeeded(rawPaths.oewn, OEWN_URL),
  ])
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not download word sources')
  process.exit(1)
}

const seed = parseSeedBank(await readFile(SEED_PATH, 'utf8'))
const cmu = parseCmu(await readFile(rawPaths.cmu, 'utf8'))
const oewn = parseOpenEnglishWordNet(rawPaths.oewn)
const scowlCandidates = [
  ...parseScowl(await readFile(rawPaths.esdbDefault, 'utf8'), 'default'),
  ...parseScowl(await readFile(rawPaths.esdbLarge, 'utf8'), 'large'),
]
const scowlWords = scowlCandidates.map(candidate => candidate.word)

const candidates = {
  byWord: new Map(),
  byNearKey: new Map(),
  blockedNearKeys: new Set(),
}
const rejected = {
  invalidSeed: 0,
  duplicateSeed: 0,
  insufficientMoney: 0,
  nearDuplicateSource: 0,
  nicheDefinition: 0,
  noDefinition: 0,
  noPronunciationOrWordNet: 0,
}

for (const deck of ['green', 'yellow', 'red']) {
  for (const rawWord of seed.decks[deck]) {
    const candidate = upsertCandidate(candidates, rawWord)
    if (!candidate) {
      rejected.invalidSeed += 1
      continue
    }
    candidate.seedDecks.add(deck)
  }
}

for (const sourceCandidate of scowlCandidates) {
  const candidate = upsertCandidate(candidates, sourceCandidate.word)
  if (!candidate) {
    rejected.nearDuplicateSource += 1
    continue
  }
  if (sourceCandidate.tier === 'default') candidate.inDefault = true
  if (sourceCandidate.tier === 'large') candidate.inLarge = true
}

for (const word of oewn.words.keys()) {
  const candidate = upsertCandidate(candidates, word)
  if (!candidate) rejected.nearDuplicateSource += 1
}

const wordfreqScores = await loadWordfreqScores([
  ...candidates.byWord.keys(),
  ...scowlWords,
])
for (const candidate of candidates.byWord.values()) {
  candidate.cmuPhones = cmu.get(candidate.word) ?? null
  candidate.wordNetPos = oewn.words.get(candidate.word) ?? new Set()
  candidate.definition = definitionForWord(candidate.word, oewn.definitions)
  candidate.wordfreqZipf = wordfreqScores.get(candidate.word) ?? 0
  candidate.difficultyScore = auditDifficultyScore(candidate)
  candidate.qualityScore = qualityScore(candidate)
}

const moneyTarget = Math.min(DEFAULT_MONEY_TARGET, targetTotal - 1)

const allEligibleSingles = []
for (const candidate of candidates.byWord.values()) {
  if (
    (candidate.wordfreqZipf >= MIN_AVERAGE_ZIPF || EASY_WORDS.has(candidate.word))
    && hasCommonSource(candidate)
    && candidate.definition
    && !hasNicheDefinition(candidate)
    && (candidate.seedDecks.size || candidate.cmuPhones || candidate.wordNetPos.size)
  ) {
    allEligibleSingles.push(candidate)
  } else if (candidate.definition && hasNicheDefinition(candidate)) {
    rejected.nicheDefinition += 1
  } else if (!candidate.definition) {
    rejected.noDefinition += 1
  } else {
    rejected.noPronunciationOrWordNet += 1
  }
}

const moneyCandidates = buildMoneyCandidates(allEligibleSingles)
if (moneyCandidates.length < moneyTarget) {
  rejected.insufficientMoney = moneyTarget - moneyCandidates.length
  console.error(`Only ${moneyCandidates.length} money single-word candidates available; need ${moneyTarget}`)
  process.exit(1)
}
const selectedMoneyCandidates = moneyCandidates.slice(0, moneyTarget)
const moneyWords = selectedMoneyCandidates.map(candidate => candidate.word)
const moneyNearSeen = new Set(moneyWords.map(spacingInsensitiveKey))

const eligibleSingles = allEligibleSingles.filter(candidate => !moneyNearSeen.has(spacingInsensitiveKey(candidate.word)))

const targetSingles = targetTotal - moneyWords.length
if (targetSingles <= 0) {
  console.error(`Money deck has ${moneyWords.length} entries, leaving no room for single-word decks`)
  process.exit(1)
}

const seedSingles = eligibleSingles.filter(candidate => candidate.seedDecks.size)
const nonSeedSingles = eligibleSingles.filter(candidate => !candidate.seedDecks.size)
nonSeedSingles.sort((a, b) => (
  a.qualityScore - b.qualityScore
  || Math.abs(a.difficultyScore - 3) - Math.abs(b.difficultyScore - 3)
  || a.word.length - b.word.length
  || a.word.localeCompare(b.word)
))

const remainingSlots = targetSingles - seedSingles.length
if (remainingSlots < 0) {
  console.error(`Seed bank has ${seedSingles.length} single words, exceeding target ${targetSingles}`)
  process.exit(1)
}
if (nonSeedSingles.length < remainingSlots) {
  console.error(`Only ${nonSeedSingles.length} non-seed candidates available; need ${remainingSlots}`)
  process.exit(1)
}

const selectedSingles = [...seedSingles, ...nonSeedSingles.slice(0, remainingSlots)]
selectedSingles.sort((a, b) => (
  a.difficultyScore - b.difficultyScore
  || a.qualityScore - b.qualityScore
  || a.word.length - b.word.length
  || a.word.localeCompare(b.word)
))

const greenTarget = Math.round(targetSingles * SINGLE_DECK_TARGET_WEIGHTS.green / SINGLE_DECK_TARGET_WEIGHT_TOTAL)
const redTarget = Math.round(targetSingles * SINGLE_DECK_TARGET_WEIGHTS.red / SINGLE_DECK_TARGET_WEIGHT_TOTAL)
const yellowTarget = targetSingles - greenTarget - redTarget

const greenCandidates = selectedSingles.slice(0, greenTarget)
const yellowCandidates = selectedSingles.slice(greenTarget, greenTarget + yellowTarget)
const redCandidates = selectedSingles.slice(greenTarget + yellowTarget)

const sources = [
  ...seed.sources,
  {
    id: 'esdb-en-us-2026-02-25',
    name: 'ESDB / SCOWL American English wordlists',
    url: 'https://wordlist.aspell.net/dicts/',
    licenseNote: 'SCOWLv2 permits use, copy, modification, distribution, and sale of word lists created from it when the copyright and permission notice are retained in supporting documentation.',
    importedAt: '2026-05-20',
    transform: 'Downloaded en_US and en_US-large 2026.02.25 from en-wl/wordlist-diff; kept lowercase alphabetic entries only; removed unsafe, duplicate, near-duplicate, too-short, and too-long entries; prioritized quality before audit-bucketing.',
  },
  {
    id: 'cmudict',
    name: 'CMU Pronouncing Dictionary',
    url: 'https://github.com/cmusphinx/cmudict',
    licenseNote: 'Use for research or commercial purposes is unrestricted; redistribution requests acknowledgement of Carnegie Mellon University origin.',
    importedAt: '2026-05-20',
    transform: 'Used as the primary pronounceability filter and syllable signal so generated entries are practical to say aloud during play.',
  },
  {
    id: 'open-english-wordnet-2025',
    name: 'Open English WordNet 2025',
    url: 'https://en-word.net/',
    licenseNote: 'Released under Creative Commons Attribution 4.0 International (CC-BY 4.0).',
    importedAt: '2026-05-20',
    transform: 'Used as a part-of-speech, semantic-attestation, and short-definition source; playable entries must have an Open English WordNet gloss for reveal screens.',
  },
  {
    id: WORDFREQ_SOURCE_ID,
    name: `wordfreq ${WORDFREQ_VERSION}`,
    url: 'https://github.com/rspeer/wordfreq',
    licenseNote: 'Apache-2.0 code; included frequency data is redistributable with Creative Commons Attribution-ShareAlike 4.0 and related attribution requirements.',
    importedAt: '2026-05-20',
    transform: `Used only as a Zipf-frequency signal. Playable words must score at least ${MIN_AVERAGE_ZIPF}; money-round words must score at least ${MIN_MONEY_ZIPF}.`,
  },
]

sources.forEach(assertSource)

const decks = {
  green: asSortedWords(greenCandidates),
  yellow: asSortedWords(yellowCandidates),
  red: asSortedWords(redCandidates),
  money: moneyWords.sort((a, b) => a.localeCompare(b)),
}

const selectedCandidates = [
  ...greenCandidates,
  ...yellowCandidates,
  ...redCandidates,
  ...selectedMoneyCandidates,
]
const definitions = Object.fromEntries(
  selectedCandidates
    .map(candidate => [candidate.word, candidate.definition])
    .sort(([a], [b]) => a.localeCompare(b))
)

const deckCounts = Object.fromEntries(Object.entries(decks).map(([deck, words]) => [deck, words.length]))
const totalPlayableWords = deckCounts.green + deckCounts.yellow + deckCounts.red + deckCounts.money
const deckSourceIdsValue = {
  green: deckSourceIds(greenCandidates),
  yellow: deckSourceIds(yellowCandidates),
  red: deckSourceIds(redCandidates),
  money: deckSourceIds(selectedMoneyCandidates),
}

const generatedSingles = selectedSingles.filter(candidate => !candidate.seedDecks.size)
const auditSummary = {
  ruleBasis: 'Sorted selected single-word candidates by a 25 Words or Less difficulty score: clueability under 5-word boards, tight clue-word budgets, stack point risk, pronunciation evidence, source commonness, length, syllables, abstract morphology, inflection noise, and part of speech. Money entries are also single words, selected from clean, common, pronounceable candidates and excluded from the color decks.',
  targetDeckSplit: {
    green: greenTarget,
    yellow: yellowTarget,
    red: redTarget,
    money: moneyWords.length,
  },
  scoreBreaks: {
    greenMax: greenCandidates.at(-1)?.difficultyScore ?? null,
    yellowMin: yellowCandidates[0]?.difficultyScore ?? null,
    yellowMax: yellowCandidates.at(-1)?.difficultyScore ?? null,
    redMin: redCandidates[0]?.difficultyScore ?? null,
  },
  sample: {
    green: greenCandidates.slice(0, 20).map(candidate => candidate.word),
    yellow: yellowCandidates.slice(0, 20).map(candidate => candidate.word),
    red: redCandidates.slice(0, 20).map(candidate => candidate.word),
  },
}

const output = {
  generatedAt: new Date().toISOString(),
  targetPlayableWords: targetTotal,
  sources,
  deckSourceIds: deckSourceIdsValue,
  summary: {
    totalPlayableWords,
    deckCounts,
    seedCounts: Object.fromEntries(Object.entries(seed.decks).map(([deck, words]) => [deck, words.length])),
    sourceCounts: {
      esdbCandidates: scowlCandidates.length,
      mergedCandidates: candidates.byWord.size,
      cmudictEntries: cmu.size,
      openEnglishWordNetLemmas: oewn.words.size,
      openEnglishWordNetDefinitions: oewn.definitions.size,
      wordfreqScoredWords: wordfreqScores.size,
      eligibleMoneySingles: moneyCandidates.length,
      eligibleSingles: eligibleSingles.length,
    },
    definitions: {
      playableWords: totalPlayableWords,
      coveredWords: Object.keys(definitions).length,
    },
    additions: {
      total: generatedSingles.length,
      cmudict: generatedSingles.filter(candidate => candidate.cmuPhones).length,
      openEnglishWordNetFallback: generatedSingles.filter(candidate => !candidate.cmuPhones && candidate.wordNetPos.size).length,
      defaultEsdb: generatedSingles.filter(candidate => candidate.inDefault).length,
      largeEsdb: generatedSingles.filter(candidate => candidate.inLarge && !candidate.inDefault).length,
    },
    rejected,
    audit: auditSummary,
    moneyAudit: {
      target: moneyTarget,
      sourceSingles: selectedMoneyCandidates.length,
      minZipf: Math.min(...selectedMoneyCandidates.map(candidate => candidate.wordfreqZipf)),
      scoreRange: {
        min: Math.min(...selectedMoneyCandidates.map(candidate => candidate.difficultyScore)),
        max: Math.max(...selectedMoneyCandidates.map(candidate => candidate.difficultyScore)),
      },
      sample: selectedMoneyCandidates.slice(0, 20).map(candidate => candidate.word),
    },
  },
  decks,
  definitions,
}

if (totalPlayableWords !== targetTotal) {
  console.error(`Expected ${targetTotal} playable words, generated ${totalPlayableWords}`)
  process.exit(1)
}

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${outputPath}`)
console.log(JSON.stringify(output.summary, null, 2))
