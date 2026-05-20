#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { MIN_AVERAGE_ZIPF, MIN_MONEY_ZIPF, loadWordfreqScores } from './wordfreq-utils.mjs'

const WORD_BANK_PATH = 'data/words/word-bank.json'

const EXPECTED_COUNTS = {
  green: 6000,
  yellow: 6000,
  red: 6000,
  money: 2000,
}
const EXPECTED_TOTAL = Object.values(EXPECTED_COUNTS).reduce((total, count) => total + count, 0)
const WORD_ENTRY_PATTERN = /^[A-Z0-9]+$/
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

const BLOCKED_WORDS = new Set([
  'ABORT', 'ABORTED', 'ABORTING', 'ABORTION', 'ABORTIONS',
  'ABUSE', 'ABUSED', 'ABUSER', 'ABUSERS', 'ABUSES', 'ABUSING', 'ABUSIVE',
  'ABDUCT', 'ABDUCTED', 'ABDUCTING', 'ABDUCTION', 'ABDUCTIONS',
  'ASSAULT', 'ASSAULTED', 'ASSAULTING', 'ASSAULTS',
  'ANAL', 'ANUS', 'APARTHEID', 'AMPHETAMINE', 'ASEXUAL', 'BISEXUAL', 'BITCH',
  'BOMB', 'BOMBED', 'BOMBING', 'BOMBS', 'COCK', 'COCAINE', 'COITUS', 'CONTRACEPTION',
  'CONTRACEPTIVE', 'CONTRACEPTIVES', 'CUNT', 'DARKIE', 'DICK', 'DICKHEAD',
  'DICKER', 'DICKERED', 'DICKERING', 'DICKERS', 'DILDO', 'DILDOS',
  'DISMEMBER', 'DISMEMBERED', 'DISMEMBERING', 'DISMEMBERS',
  'DRUG', 'DRUGGED', 'DRUGGING', 'DRUGS', 'FAG',
  'FAGGOT', 'FASCISM', 'FASCIST', 'FASCISTS', 'FETUS', 'FLEER', 'FLEERS',
  'FUCK', 'FUCKED', 'FUCKER', 'FUCKING', 'GANGBANGER',
  'GANGBANGERS', 'GENOCIDE', 'GOOK', 'GUN', 'GUNFIGHTER',
  'GUNFIGHTERS', 'GUNMAN', 'GUNMEN', 'GUNS', 'GYP',
  'GYPPED', 'GYPPING', 'GYPSY', 'HELLUVA',
  'HOLOCAUST', 'HOMICIDE', 'HEROIN', 'HETEROSEXUAL', 'HOMOSEXUAL', 'INCEST',
  'INTERCOURSE', 'JIHAD', 'LECHER', 'LECHEROUS', 'LECHERY', 'MAIM',
  'MAIMED', 'MAIMING', 'MAIMS', 'MASSACRE', 'MASTURBATE',
  'MASTURBATED', 'MASTURBATES', 'MASTURBATING', 'MASTURBATION', 'METH', 'METHADONE',
  'MOLEST', 'MOLESTED', 'MOLESTING', 'MOLESTS', 'MURDER',
  'MURDERED', 'MURDERER', 'MURDERERS', 'MURDERING', 'MURDERS',
  'NAZI', 'NAZIS', 'NARCOTIC', 'NARCOTICS', 'NEGROID', 'NIGGA', 'NIGGER',
  'OPIATE', 'OPIATES', 'OPIOID', 'OPIOIDS', 'ORGIES', 'ORGY', 'PANSEXUAL',
  'PISTOL', 'PISTOLS', 'PISS', 'PISSED',
  'PISSING', 'PORN', 'PORNO', 'PORNOGRAPHY', 'PSYCHOSIS',
  'PSYCHOTIC', 'PUBE', 'PUBES', 'PUBIC', 'PUBIS', 'RAPE', 'RAPED', 'RAPIST', 'RAPISTS', 'RAPING',
  'RACISM', 'RACIST', 'RACISTS', 'RETARD', 'RIFLE', 'RIFLES', 'CRACKHEAD',
  'CRACKHEADS', 'CUNNILINGUS', 'EXCRETE', 'SEX', 'SEXUAL',
  'SEXUALLY', 'SHIT', 'SHYSTER', 'SLAVE', 'SLAVERY', 'SLUT', 'SUICIDE',
  'SUICIDES', 'SUICIDAL', 'SUPREMACIST', 'SUPREMACISTS',
  'TERRORISM', 'TERRORIST', 'TERRORISTS', 'TORTURE', 'TORTURED',
  'TORTURES', 'TORTURING', 'TRAFFICKER', 'TRAFFICKERS',
  'TRAFFICKING', 'VIBRATOR', 'VIBRATORS', 'WEAPON', 'WEAPONRY', 'WEAPONS',
  'ARSE', 'ARSENAL', 'ARSENIC', 'BOMBARDED', 'BOMBARDMENT', 'BOMBER', 'BOMBERS', 'BOMBSHELL',
  'BLOODBATH', 'BLOODED', 'BLOODSHED',
  'BREAST', 'BREASTED', 'BREASTFEEDING', 'BREASTS', 'BUGGER', 'BULLSHIT',
  'CERVIX', 'COLORECTAL', 'DICKENS', 'ENSLAVED', 'ESKIMO', 'FELON',
  'FELONIES', 'FELONY', 'GUNFIRE', 'GUNNER', 'GUNPOINT', 'GUNPOWDER',
  'GUNSHOT', 'GUNSHOTS', 'GUILLOTINE', 'HANDGUN', 'HANDGUNS', 'HEMORRHAGE', 'JERKING',
  'KILL', 'KILLED', 'KILLER', 'KILLERS', 'KILLING', 'KILLINGS', 'KILLS',
  'MURDEROUS', 'NUCLEAR', 'ORGASM', 'ORGASMS', 'ORIENTAL', 'PAINKILLERS',
  'RAPES', 'RETARDED', 'SEXIEST', 'SEXISM', 'SEXIST', 'SEXUALITY', 'SEXY',
  'SHITTING', 'SHITTY', 'SHOTGUN', 'SHOTGUNS', 'SLAVES', 'SEXTON', 'SPANK', 'SPANKING', 'UNISEX', 'WHORE',
])

const BLOCKED_PATTERNS = [
  /^PEDOPHIL/,
  /FUCK/,
  /PORN/,
  /SHIT/,
  /^HOMOSEXUAL/,
  /^RETARD/,
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

function hasNicheDefinition(word, definition, wordfreqScores) {
  const zipf = wordfreqScores.get(word) ?? 0
  if (zipf >= 2.8) return false
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
  ].some(pattern => pattern.test(definition))
}

function auditEntryShape(deck, word, index, errors) {
  const label = `${deck}[${index}]`
  assert(word === cleanWord(word), `${label} is not normalized: ${word}`, errors)
  assert(word.length <= 32, `${label} is too long: ${word}`, errors)
  assert(WORD_ENTRY_PATTERN.test(word), `${label} has invalid characters: ${word}`, errors)
  assert(!isBlocked(word), `${label} is blocked: ${word}`, errors)
}

const wordBankRaw = await readFile(WORD_BANK_PATH, 'utf8')
const wordBank = JSON.parse(wordBankRaw)
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

for (const [deck, words] of Object.entries(decks)) {
  for (const word of words ?? []) {
    assert(!word.includes(' '), `${deck} contains phrase: ${word}`, errors)
  }
}

const money = decks.money ?? []
const definitions = wordBank.definitions ?? {}

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

const allPlayableWords = Object.values(decks).flat()
const allPlayableSet = new Set(allPlayableWords)
const missingDefinitions = allPlayableWords.filter(word => typeof definitions[word] !== 'string' || !definitions[word].trim())
assert(
  missingDefinitions.length === 0,
  `found ${missingDefinitions.length} playable words without definitions: ${missingDefinitions.slice(0, 20).join(', ')}`,
  errors
)
for (const [word, definition] of Object.entries(definitions)) {
  assert(allPlayableSet.has(word), `definition exists for non-playable word: ${word}`, errors)
  assert(typeof definition === 'string' && definition.trim().length > 0, `definition for ${word} is empty`, errors)
  assert(String(definition).length <= 183, `definition for ${word} is too long`, errors)
}

const wordfreqScores = await loadWordfreqScores(allPlayableWords)
const nicheDefinitions = allPlayableWords.filter(word => hasNicheDefinition(word, definitions[word] ?? '', wordfreqScores))
assert(
  nicheDefinitions.length === 0,
  `found ${nicheDefinitions.length} niche low-frequency definitions: ${nicheDefinitions.slice(0, 20).join(', ')}`,
  errors
)
const lowFrequencyWords = allPlayableWords
  .map(word => ({ word, zipf: wordfreqScores.get(word) ?? 0 }))
  .filter(({ zipf }) => zipf < MIN_AVERAGE_ZIPF)
  .sort((a, b) => a.zipf - b.zipf || a.word.localeCompare(b.word))
assert(
  lowFrequencyWords.length === 0,
  `found ${lowFrequencyWords.length} low-frequency words below Zipf ${MIN_AVERAGE_ZIPF}: ${lowFrequencyWords.slice(0, 20).map(({ word, zipf }) => `${word}:${zipf}`).join(', ')}`,
  errors
)
const lowFrequencyMoneyWords = money
  .map(word => ({ word, zipf: wordfreqScores.get(word) ?? 0 }))
  .filter(({ zipf }) => zipf < MIN_MONEY_ZIPF)
  .sort((a, b) => a.zipf - b.zipf || a.word.localeCompare(b.word))
assert(
  lowFrequencyMoneyWords.length === 0,
  `found ${lowFrequencyMoneyWords.length} money words below Zipf ${MIN_MONEY_ZIPF}: ${lowFrequencyMoneyWords.slice(0, 20).map(({ word, zipf }) => `${word}:${zipf}`).join(', ')}`,
  errors
)

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
    singles: money.length,
  },
  definitions: {
    covered: Object.keys(definitions).length,
  },
  frequency: {
    minZipf: Math.min(...[...wordfreqScores.values()]),
    threshold: MIN_AVERAGE_ZIPF,
    moneyThreshold: MIN_MONEY_ZIPF,
    moneyMinZipf: Math.min(...money.map(word => wordfreqScores.get(word) ?? 0)),
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
