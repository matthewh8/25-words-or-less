#!/usr/bin/env node

import { readFile } from 'node:fs/promises'

const WORD_BANK_PATH = 'data/words/word-bank.json'
const SEED_PATH = 'data/words/seed-decks.json'

const EXPECTED_COUNTS = {
  green: 16000,
  yellow: 16000,
  red: 16000,
  money: 2000,
}
const EXPECTED_TOTAL = Object.values(EXPECTED_COUNTS).reduce((total, count) => total + count, 0)
const EXPECTED_OPEN_WORDNET_MONEY = 1840
const MAX_MONEY_COMPONENT_REPEAT = 120
const WORD_ENTRY_PATTERN = /^[A-Z0-9][A-Z0-9 ]*$/
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

const BLOCKED_WORDS = new Set([
  'ABORT', 'ABORTED', 'ABORTING', 'ABORTION', 'ABORTIONS',
  'ABUSE', 'ABUSED', 'ABUSES', 'ABUSING', 'ABUSIVE',
  'ASSAULT', 'ASSAULTED', 'ASSAULTING', 'ASSAULTS',
  'ANAL', 'AMPHETAMINE', 'BITCH', 'COCK', 'CONTRACEPTION',
  'CONTRACEPTIVE', 'CONTRACEPTIVES', 'CUNT', 'DICK', 'DICKHEAD',
  'DISMEMBER', 'DISMEMBERED', 'DISMEMBERING', 'DISMEMBERS',
  'DRUG', 'DRUGGED', 'DRUGGING', 'DRUGS', 'FAG',
  'FAGGOT', 'FASCISM', 'FASCIST', 'FASCISTS',
  'FUCK', 'FUCKED', 'FUCKER', 'FUCKING', 'GANGBANGER',
  'GANGBANGERS', 'GENOCIDE', 'GOOK', 'GUN', 'GUNFIGHTER',
  'GUNFIGHTERS', 'GUNMAN', 'GUNMEN', 'GUNS', 'GYP',
  'GYPPED', 'GYPPING', 'GYPSY',
  'HOLOCAUST', 'HOMICIDE', 'INCEST', 'INTERCOURSE', 'MAIM',
  'MAIMED', 'MAIMING', 'MAIMS', 'MASSACRE', 'MASTURBATE',
  'MASTURBATED', 'MASTURBATES', 'MASTURBATING', 'MASTURBATION',
  'MOLEST', 'MOLESTED', 'MOLESTING', 'MOLESTS', 'MURDER',
  'MURDERED', 'MURDERER', 'MURDERERS', 'MURDERING', 'MURDERS',
  'NAZI', 'NAZIS', 'NIGGA', 'NIGGER', 'ORGIES', 'ORGY', 'PISS', 'PISSED',
  'PISSING', 'PORN', 'PORNO', 'PORNOGRAPHY', 'PSYCHOSIS',
  'PSYCHOTIC', 'RAPE', 'RAPED', 'RAPIST', 'RAPISTS', 'RAPING',
  'RACISM', 'RACIST', 'RACISTS', 'RETARD', 'SEX', 'SEXUAL',
  'SEXUALLY', 'SHIT', 'SLAVE', 'SLAVERY', 'SLUT', 'SUICIDE',
  'SUICIDES', 'SUICIDAL', 'SUPREMACIST', 'SUPREMACISTS',
  'TERRORISM', 'TERRORIST', 'TERRORISTS', 'TORTURE', 'TORTURED',
  'TORTURES', 'TORTURING', 'TRAFFICKER', 'TRAFFICKERS',
  'TRAFFICKING', 'VIBRATOR', 'VIBRATORS', 'WHORE',
])

const BLOCKED_PATTERNS = [
  /^PEDOPHIL/,
]

const BAD_MONEY_PATTERNS = [
  /\b(AEROSOL|ATOMIC|BRIEFCASE|CARPET BOMBING|CRIMINAL|GUNNER|MEGATON|NUCLEAR|PHALLIC|PISTOL|RIFLE|SUPREMACIST|WARHEAD)\b/,
  /\b(CALIPER|CASSOCK|CLINCH|DIPOLE|DUDGEON|FRANKING|GYPSUM|LIEN|PARDON|REACTOR|SIMPLEX|SURGERY|TELEX|WARPING)\b/,
  /\bCOMFORT WOMAN\b/,
]

function cleanWord(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
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

function assert(condition, message, errors) {
  if (!condition) errors.push(message)
}

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) * ratio)]
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function wordLengths(words) {
  return words.map(word => word.replace(/\s/g, '').length)
}

function auditEntryShape(deck, word, index, errors) {
  const label = `${deck}[${index}]`
  assert(word === cleanWord(word), `${label} is not normalized: ${word}`, errors)
  assert(word.length <= 32, `${label} is too long: ${word}`, errors)
  assert(WORD_ENTRY_PATTERN.test(word), `${label} has invalid characters: ${word}`, errors)
  assert(!isBlocked(word), `${label} is blocked: ${word}`, errors)
}

const [wordBankRaw, seedRaw] = await Promise.all([
  readFile(WORD_BANK_PATH, 'utf8'),
  readFile(SEED_PATH, 'utf8'),
])
const wordBank = JSON.parse(wordBankRaw)
const seedBank = JSON.parse(seedRaw)
const errors = []

const decks = wordBank.decks ?? {}
const computedCounts = Object.fromEntries(Object.entries(decks).map(([deck, words]) => [deck, words.length]))
const computedTotal = Object.values(computedCounts).reduce((total, count) => total + count, 0)

assert(computedTotal === EXPECTED_TOTAL, `expected ${EXPECTED_TOTAL} total playable words, found ${computedTotal}`, errors)
for (const [deck, expected] of Object.entries(EXPECTED_COUNTS)) {
  assert(computedCounts[deck] === expected, `expected ${deck} count ${expected}, found ${computedCounts[deck]}`, errors)
  assert(wordBank.summary?.deckCounts?.[deck] === expected, `summary has wrong ${deck} count`, errors)
}
assert(wordBank.summary?.totalPlayableWords === EXPECTED_TOTAL, 'summary totalPlayableWords is wrong', errors)

const sourceIds = new Set()
for (const source of wordBank.sources ?? []) {
  assert(source.id && SOURCE_ID_PATTERN.test(source.id), `source has invalid id: ${source.id}`, errors)
  assert(/^https?:\/\/|^local:/.test(source.url ?? ''), `source ${source.id} has invalid url`, errors)
  assert(/^\d{4}-\d{2}-\d{2}$/.test(source.importedAt ?? ''), `source ${source.id} has invalid importedAt`, errors)
  sourceIds.add(source.id)
}
for (const [deck, ids] of Object.entries(wordBank.deckSourceIds ?? {})) {
  assert(Array.isArray(ids) && ids.length > 0, `${deck} deck has no source ids`, errors)
  for (const id of ids ?? []) assert(sourceIds.has(id), `${deck} references unknown source ${id}`, errors)
}

const exactOwners = new Map()
const nearOwners = new Map()
for (const [deck, words] of Object.entries(decks)) {
  assert(Array.isArray(words), `${deck} must be an array`, errors)
  const deckSeen = new Set()
  const deckNearSeen = new Map()
  words.forEach((rawWord, index) => {
    const word = cleanWord(rawWord)
    auditEntryShape(deck, rawWord, index, errors)
    assert(!deckSeen.has(word), `${deck} duplicate entry: ${word}`, errors)
    deckSeen.add(word)

    const nearKey = spacingInsensitiveKey(word)
    const previousNear = deckNearSeen.get(nearKey)
    assert(!previousNear || previousNear === word, `${deck} near duplicate: ${word} / ${previousNear}`, errors)
    deckNearSeen.set(nearKey, word)

    const previousOwner = exactOwners.get(word)
    assert(!previousOwner, `${deck} duplicates ${word} from ${previousOwner}`, errors)
    exactOwners.set(word, deck)

    const previousNearOwner = nearOwners.get(nearKey)
    if (previousNearOwner && previousNearOwner.word !== word) {
      errors.push(`${deck} near-duplicates ${word} from ${previousNearOwner.deck} (${previousNearOwner.word})`)
    }
    nearOwners.set(nearKey, { deck, word })
  })
}

for (const deck of ['green', 'yellow', 'red']) {
  for (const word of decks[deck] ?? []) assert(!word.includes(' '), `${deck} contains phrase: ${word}`, errors)
}

const money = decks.money ?? []
const seedMoney = new Set((seedBank.decks?.money ?? []).map(cleanWord))
const moneyComponents = new Map()
let seedMoneyCount = 0
for (const phrase of money) {
  const words = phrase.split(' ')
  assert(words.length >= 2 && words.length <= 4, `money phrase must have 2-4 words: ${phrase}`, errors)
  assert(!BAD_MONEY_PATTERNS.some(pattern => pattern.test(phrase)), `money phrase failed final review pattern: ${phrase}`, errors)
  if (seedMoney.has(phrase)) seedMoneyCount += 1
  for (const word of words) moneyComponents.set(word, (moneyComponents.get(word) ?? 0) + 1)
}
for (const phrase of seedMoney) assert(money.includes(phrase), `money deck dropped seed phrase: ${phrase}`, errors)
const openWordNetMoneyCount = money.length - seedMoneyCount
assert(openWordNetMoneyCount === EXPECTED_OPEN_WORDNET_MONEY, `expected ${EXPECTED_OPEN_WORDNET_MONEY} Open English WordNet money phrases, found ${openWordNetMoneyCount}`, errors)
for (const [word, count] of moneyComponents) {
  assert(count <= MAX_MONEY_COMPONENT_REPEAT, `money component repeats too often (${count}): ${word}`, errors)
}

const greenLengths = wordLengths(decks.green ?? [])
const yellowLengths = wordLengths(decks.yellow ?? [])
const redLengths = wordLengths(decks.red ?? [])
const avgGreen = average(greenLengths)
const avgYellow = average(yellowLengths)
const avgRed = average(redLengths)
const p90Green = percentile(greenLengths, 0.9)
const p90Yellow = percentile(yellowLengths, 0.9)
const p90Red = percentile(redLengths, 0.9)
assert(avgGreen < avgYellow && avgYellow < avgRed, `average lengths are not monotonic: ${avgGreen}, ${avgYellow}, ${avgRed}`, errors)
assert(p90Green < p90Yellow && p90Yellow < p90Red, `p90 lengths are not monotonic: ${p90Green}, ${p90Yellow}, ${p90Red}`, errors)

const scoreBreaks = wordBank.summary?.audit?.scoreBreaks ?? {}
assert(scoreBreaks.greenMax <= scoreBreaks.yellowMin, 'green/yellow score break is inverted', errors)
assert(scoreBreaks.yellowMax <= scoreBreaks.redMin, 'yellow/red score break is inverted', errors)

if (errors.length) {
  console.error(`Word-bank audit failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Word-bank audit passed')
console.log(JSON.stringify({
  total: computedTotal,
  deckCounts: computedCounts,
  money: {
    seed: seedMoneyCount,
    openEnglishWordNet: openWordNetMoneyCount,
    maxComponentRepeat: Math.max(...moneyComponents.values()),
  },
  difficultyShape: {
    averageLetters: {
      green: Number(avgGreen.toFixed(2)),
      yellow: Number(avgYellow.toFixed(2)),
      red: Number(avgRed.toFixed(2)),
    },
    p90Letters: {
      green: p90Green,
      yellow: p90Yellow,
      red: p90Red,
    },
    scoreBreaks,
  },
}, null, 2))
