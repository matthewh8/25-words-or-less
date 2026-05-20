#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_OUTPUT_PATH = 'data/words/word-bank.json'
const DEFAULT_TARGET_TOTAL = 50000
const DEFAULT_MONEY_TARGET = 2000
const SINGLE_DECK_TARGET_WEIGHTS = {
  green: 16000,
  yellow: 16000,
  red: 16000,
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
  'ABUSES',
  'ABUSING',
  'ABUSIVE',
  'ASSAULT',
  'ASSAULTED',
  'ASSAULTING',
  'ASSAULTS',
  'ANAL',
  'ANUS',
  'AMPHETAMINE',
  'BITCH',
  'COCK',
  'CUNT',
  'DICK',
  'DICKHEAD',
  'DICKER',
  'DICKERED',
  'DICKERING',
  'DICKERS',
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
  'JIHAD',
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
  if (!candidate.seedDecks.size && word.length <= 5 && word.endsWith('S')) score += 1.5
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
  if (!candidate.cmuPhones) score += 4
  if (!candidate.wordNetPos.size) score += 2
  if (!candidate.inDefault) score += 2
  if (candidate.inLarge && !candidate.inDefault) score += 1
  if (candidate.word.length < 4 && !EASY_WORDS.has(candidate.word)) score += 5
  if (candidate.word.length > 14) score += 1
  return score
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

function parseOpenEnglishWordNet(zipPath) {
  const words = new Map()
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

  return { words }
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

for (const candidate of candidates.byWord.values()) {
  candidate.cmuPhones = cmu.get(candidate.word) ?? null
  candidate.wordNetPos = oewn.words.get(candidate.word) ?? new Set()
  candidate.difficultyScore = auditDifficultyScore(candidate)
  candidate.qualityScore = qualityScore(candidate)
}

const moneyTarget = Math.min(DEFAULT_MONEY_TARGET, targetTotal - 1)

const allEligibleSingles = []
for (const candidate of candidates.byWord.values()) {
  if (candidate.seedDecks.size || candidate.cmuPhones || candidate.wordNetPos.size) {
    allEligibleSingles.push(candidate)
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
    transform: 'Used as a part-of-speech and semantic-attestation signal; also fills the remaining single-word target count after CMUdict-filtered ESDB entries.',
  },
]

sources.forEach(assertSource)

const decks = {
  green: asSortedWords(greenCandidates),
  yellow: asSortedWords(yellowCandidates),
  red: asSortedWords(redCandidates),
  money: moneyWords.sort((a, b) => a.localeCompare(b)),
}

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
      eligibleMoneySingles: moneyCandidates.length,
      eligibleSingles: eligibleSingles.length,
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
      scoreRange: {
        min: Math.min(...selectedMoneyCandidates.map(candidate => candidate.difficultyScore)),
        max: Math.max(...selectedMoneyCandidates.map(candidate => candidate.difficultyScore)),
      },
      sample: selectedMoneyCandidates.slice(0, 20).map(candidate => candidate.word),
    },
  },
  decks,
}

if (totalPlayableWords !== targetTotal) {
  console.error(`Expected ${targetTotal} playable words, generated ${totalPlayableWords}`)
  process.exit(1)
}

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${outputPath}`)
console.log(JSON.stringify(output.summary, null, 2))
