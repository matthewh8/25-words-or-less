#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_OUTPUT_PATH = 'data/words/organized.generated.json'
const DEFAULT_SOURCE_ID = 'pooled-auto-organizer'
const DEFAULT_SOURCE_NAME = 'Pooled automatic word organizer'
const DEFAULT_LICENSE_NOTE = 'Generated from caller-provided candidate pools; verify source licenses before bundling.'
const DEFAULT_TRANSFORM = [
  'Pool all candidates without tags',
  'normalize uppercase spacing',
  'dedupe exact and spacing-insensitive duplicates',
  'remove unsafe or malformed entries',
  'route two-to-four-word phrases to money',
  'score single words by CEFR, frequency, length, syllables, and abstract suffixes into green/yellow/red',
].join('; ')

const WORD_ENTRY_PATTERN = /^[A-Z0-9][A-Z0-9 ]*$/
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const SOURCE_URL_PATTERN = /^(https?:\/\/|local:)/
const BLOCKED = new Set(['GOOK', 'RAPE', 'RETARD', 'SLAVE', 'SLAVERY', 'HOLOCAUST', 'MASSACRE', 'TORTURE'])
const WORD_COLUMNS = ['word', 'headword', 'lemma', 'text', 'term', 'phrase']
const LEVEL_COLUMNS = ['cefr', 'cefr-j', 'cefrj', 'level', 'difficulty']
const ZIPF_COLUMNS = ['zipf', 'frequencyzipf', 'frequency_zipf', 'frequency', 'freq']

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

const args = process.argv.slice(2)
const options = {}
const inputs = []

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (!arg.startsWith('--')) {
    inputs.push(arg)
    continue
  }

  const key = arg.slice(2)
  if (!['output', 'source-id', 'source-name', 'source-url', 'license-note'].includes(key)) {
    console.error(`Unknown option: ${arg}`)
    process.exit(1)
  }

  const value = args[i + 1]
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${arg}`)
    process.exit(1)
  }
  options[key] = value.trim()
  i++
}

if (options['source-id'] && !SOURCE_ID_PATTERN.test(options['source-id'])) {
  console.error('Source id must be lowercase letters, numbers, and hyphens, starting with a letter or number')
  process.exit(1)
}

if (options['source-url'] && !SOURCE_URL_PATTERN.test(options['source-url'])) {
  console.error('Source URL must start with http://, https://, or local:')
  process.exit(1)
}

if (options['source-name'] === '' || options['license-note'] === '') {
  console.error('Source name and license note cannot be blank')
  process.exit(1)
}

const inputPaths = inputs.length ? inputs : ['lib/words.ts']
const outputPath = options.output ?? DEFAULT_OUTPUT_PATH
const sourceId = options['source-id'] ?? DEFAULT_SOURCE_ID

function cleanWord(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function spacingInsensitiveKey(value) {
  return cleanWord(value).replace(/\s/g, '')
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function firstColumnIndex(headers, candidates) {
  const normalizedCandidates = candidates.map(normalizeHeader)
  return headers.findIndex(header => normalizedCandidates.includes(normalizeHeader(header)))
}

function maybeNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function candidateFromObject(value, sourcePath) {
  const text = value.text ?? value.word ?? value.headword ?? value.lemma ?? value.term ?? value.phrase
  if (text === undefined) return []
  return [{
    text: cleanWord(text),
    sourcePath,
    sourceDeck: typeof value.deck === 'string' ? cleanWord(value.deck).toLowerCase() : null,
    cefr: typeof value.cefr === 'string' ? value.cefr : typeof value.level === 'string' ? value.level : null,
    zipf: maybeNumber(value.zipf ?? value.frequencyZipf ?? value.frequency_zipf ?? value.frequency ?? value.freq),
  }]
}

function parseJsonValue(value, sourcePath) {
  if (Array.isArray(value)) {
    return value.flatMap(item => typeof item === 'string'
      ? [{ text: cleanWord(item), sourcePath, sourceDeck: null, cefr: null, zipf: null }]
      : candidateFromObject(item, sourcePath))
  }

  if (!value || typeof value !== 'object') return []
  const directCandidates = candidateFromObject(value, sourcePath)
  if (directCandidates.length) return directCandidates
  const candidates = []
  if (Array.isArray(value.records)) candidates.push(...parseJsonValue(value.records, sourcePath))
  if (Array.isArray(value.words)) candidates.push(...parseJsonValue(value.words, sourcePath))
  if (value.decks && typeof value.decks === 'object') {
    for (const [deck, words] of Object.entries(value.decks)) {
      if (!Array.isArray(words)) continue
      for (const word of words) {
        const text = typeof word === 'string' ? word : word?.text ?? word?.word
        candidates.push({
          text: cleanWord(text),
          sourcePath,
          sourceDeck: cleanWord(deck).toLowerCase(),
          cefr: null,
          zipf: null,
        })
      }
    }
  }
  return candidates
}

function parseStringArrayBlock(source, name) {
  const match = source.match(new RegExp(`(?:export\\s+)?const\\s+${name}:\\s*string\\[\\]\\s*=\\s*\\[([\\s\\S]*?)\\]\\n`, 'm'))
  if (!match) return []
  const values = []
  const stringPattern = /'((?:\\'|[^'])*)'/g
  let stringMatch = stringPattern.exec(match[1])
  while (stringMatch) {
    values.push(cleanWord(stringMatch[1].replace(/\\'/g, "'")))
    stringMatch = stringPattern.exec(match[1])
  }
  return values
}

async function parseInputFile(inputPath) {
  const raw = await readFile(inputPath, 'utf8')
  const ext = path.extname(inputPath).toLowerCase()

  if (ext === '.json') {
    return parseJsonValue(JSON.parse(raw), inputPath)
  }

  if (ext === '.jsonl') {
    return raw.split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .flatMap(line => {
        if (!line.startsWith('{')) return [{ text: cleanWord(line), sourcePath: inputPath, sourceDeck: null, cefr: null, zipf: null }]
        return parseJsonValue(JSON.parse(line), inputPath)
      })
  }

  if (ext === '.csv') {
    const [headerLine, ...lines] = raw.split(/\r?\n/).filter(Boolean)
    const headers = parseCsvLine(headerLine)
    const wordIndex = firstColumnIndex(headers, WORD_COLUMNS)
    if (wordIndex < 0) throw new Error(`${inputPath} must include a word/headword/lemma/text/term/phrase column`)
    const levelIndex = firstColumnIndex(headers, LEVEL_COLUMNS)
    const zipfIndex = firstColumnIndex(headers, ZIPF_COLUMNS)
    const deckIndex = firstColumnIndex(headers, ['deck', 'tier'])
    return lines.map(line => {
      const cells = parseCsvLine(line)
      return {
        text: cleanWord(cells[wordIndex] ?? ''),
        sourcePath: inputPath,
        sourceDeck: deckIndex >= 0 ? cleanWord(cells[deckIndex] ?? '').toLowerCase() : null,
        cefr: levelIndex >= 0 ? cells[levelIndex] : null,
        zipf: zipfIndex >= 0 ? maybeNumber(cells[zipfIndex]) : null,
      }
    })
  }

  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.mjs') {
    const knownArrays = ['greenWords', 'yellowWords', 'redWords', 'moneyWords']
    return knownArrays.flatMap(name => parseStringArrayBlock(raw, name).map(text => ({
      text,
      sourcePath: inputPath,
      sourceDeck: name.replace('Words', '').toLowerCase(),
      cefr: null,
      zipf: null,
    })))
  }

  return raw.split(/\r?\n/)
    .map(line => line.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map(line => ({ text: cleanWord(line), sourcePath: inputPath, sourceDeck: null, cefr: null, zipf: null }))
}

function isBlocked(word) {
  if (BLOCKED.has(word)) return true
  return word.split(' ').some(part => BLOCKED.has(part))
}

function isValidWord(word) {
  return Boolean(word)
    && word.length <= 32
    && WORD_ENTRY_PATTERN.test(word)
    && !isBlocked(word)
}

function cefrScore(level) {
  const value = String(level ?? '').trim().toUpperCase()
  if (/^A[12]/.test(value)) return -2
  if (/^B1/.test(value)) return 1
  if (/^B2/.test(value)) return 3
  if (/^C[12]/.test(value)) return 4
  return null
}

function estimateSyllables(word) {
  const parts = word.split(' ')
  return parts.reduce((total, part) => {
    const cleaned = part.replace(/[^A-Z]/g, '').toLowerCase()
    if (!cleaned) return total
    const groups = cleaned.match(/[aeiouy]+/g) ?? []
    let count = groups.length
    if (cleaned.length > 3 && cleaned.endsWith('e')) count -= 1
    if (cleaned.endsWith('le') && cleaned.length > 2 && !/[aeiouy]/.test(cleaned.at(-3) ?? '')) count += 1
    return total + Math.max(1, count)
  }, 0)
}

function suffixHit(word, suffixes) {
  return suffixes.some(suffix => word.endsWith(suffix))
}

function classify(candidate) {
  const word = candidate.text
  const wordCount = word.split(' ').length
  const syllables = estimateSyllables(word)

  if (candidate.sourceDeck === 'money' || (wordCount >= 2 && wordCount <= 4)) {
    return {
      deck: 'money',
      score: 0,
      reason: 'phrase',
      metrics: { wordCount, syllables, charCount: word.length },
    }
  }

  let score = 1
  let minimumScore = Number.NEGATIVE_INFINITY
  const reasons = []
  const levelScore = cefrScore(candidate.cefr)
  if (levelScore !== null) {
    score += levelScore
    reasons.push(`cefr:${candidate.cefr}`)
    if (levelScore >= 1) minimumScore = Math.max(minimumScore, levelScore)
  }

  if (candidate.zipf !== null) {
    if (candidate.zipf >= 4.5) score -= 2
    else if (candidate.zipf >= 3.8) score -= 1
    else if (candidate.zipf < 3.0) score += 2
    else if (candidate.zipf < 3.5) score += 1
    reasons.push(`zipf:${candidate.zipf}`)
  }

  if (EASY_WORDS.has(word)) {
    score -= 3
    reasons.push('easy-list')
  }

  if (word.length <= 4) score -= 1
  else if (word.length >= 11) score += 2
  else if (word.length >= 8) score += 1

  if (syllables <= 1) score -= 1
  else if (syllables === 3) score += 1
  else if (syllables >= 4) score += 2

  if (suffixHit(word, ABSTRACT_SUFFIXES)) {
    score += 2
    minimumScore = Math.max(minimumScore, 2)
    reasons.push('abstract-suffix')
  }
  if (suffixHit(word, HARD_SUFFIXES)) {
    score += 3
    minimumScore = Math.max(minimumScore, 3)
    reasons.push('hard-suffix')
  }

  score = Math.max(score, minimumScore)
  const deck = score <= 0 ? 'green' : score <= 3 ? 'yellow' : 'red'
  return {
    deck,
    score,
    reason: reasons.join(',') || 'heuristic',
    metrics: { wordCount, syllables, charCount: word.length, ...(candidate.zipf !== null && { zipf: candidate.zipf }) },
  }
}

const candidates = []
for (const inputPath of inputPaths) {
  try {
    candidates.push(...await parseInputFile(inputPath))
  } catch (error) {
    console.error(error instanceof Error ? error.message : `Could not parse ${inputPath}`)
    process.exit(1)
  }
}

const seen = new Set()
const nearSeen = new Set()
const records = []
const rejected = { invalid: 0, duplicate: 0 }

for (const candidate of candidates) {
  const word = cleanWord(candidate.text)
  const nearKey = spacingInsensitiveKey(word)
  if (!isValidWord(word)) {
    rejected.invalid += 1
    continue
  }
  if (seen.has(word) || nearSeen.has(nearKey)) {
    rejected.duplicate += 1
    continue
  }
  seen.add(word)
  nearSeen.add(nearKey)
  const classification = classify({ ...candidate, text: word })
  records.push({
    text: word,
    deck: classification.deck,
    sourceIds: [sourceId],
    status: 'auto-classified',
    metrics: classification.metrics,
    score: classification.score,
    reason: classification.reason,
  })
}

const deckOrder = ['green', 'yellow', 'red', 'money']
const decks = Object.fromEntries(deckOrder.map(deck => [deck, []]))
for (const record of records.sort((a, b) => a.deck.localeCompare(b.deck) || a.text.localeCompare(b.text))) {
  decks[record.deck].push(record.text)
}

const output = {
  generatedAt: new Date().toISOString(),
  source: {
    id: sourceId,
    name: options['source-name'] ?? DEFAULT_SOURCE_NAME,
    url: options['source-url'] ?? `local:${inputPaths.join(',')}`,
    licenseNote: options['license-note'] ?? DEFAULT_LICENSE_NOTE,
    importedAt: new Date().toISOString().slice(0, 10),
    transform: DEFAULT_TRANSFORM,
  },
  summary: {
    inputCount: candidates.length,
    acceptedCount: records.length,
    rejected,
    deckCounts: Object.fromEntries(deckOrder.map(deck => [deck, decks[deck].length])),
  },
  decks,
  records,
}

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${outputPath} with ${records.length} classified words`)
