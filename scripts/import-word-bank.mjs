#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [, , ...args] = process.argv
const positionals = []
const options = {}
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const SOURCE_URL_PATTERN = /^(https?:\/\/|local:)/
const TRANSFORM_NOTE = 'Uppercase, normalize spacing, dedupe exact and spacing-insensitive near duplicates across generated decks, CEFR A1/A2 to green, B1 to yellow, B2 to red, blocked unsafe terms, max 32 chars.'

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (!arg.startsWith('--')) {
    positionals.push(arg)
    continue
  }

  const key = arg.slice(2)
  if (!['source-id', 'source-name', 'source-url', 'license-note'].includes(key)) {
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

const [inputPath, outputPath = 'data/word-bank.generated.json'] = positionals

if (!inputPath) {
  console.error('Usage: node scripts/import-word-bank.mjs <cefr_csv> [output_json] [--source-id id] [--source-name name] [--source-url url] [--license-note note]')
  process.exit(1)
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

const BLOCKED = new Set(['GOOK', 'RAPE', 'RETARD', 'SLAVE', 'SLAVERY', 'HOLOCAUST', 'MASSACRE', 'TORTURE'])

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

function cleanWord(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function spacingInsensitiveKey(value) {
  return value.replace(/\s/g, '')
}

function deckForLevel(level) {
  if (/^A[12]/i.test(level)) return 'green'
  if (/^B1/i.test(level)) return 'yellow'
  if (/^B2/i.test(level)) return 'red'
  return null
}

const raw = await readFile(inputPath, 'utf8')
const [headerLine, ...lines] = raw.split(/\r?\n/).filter(Boolean)
const headers = parseCsvLine(headerLine).map(cell => cell.trim().toLowerCase())
const wordIndex = headers.findIndex(header => ['headword', 'word', 'lemma'].includes(header))
const levelIndex = headers.findIndex(header => ['cefr', 'cefr-j', 'cefrj', 'level'].includes(header))

if (wordIndex < 0 || levelIndex < 0) {
  console.error('CSV must include a word/headword/lemma column and a CEFR level column')
  process.exit(1)
}

const decks = { green: new Set(), yellow: new Set(), red: new Set() }
const spacingKeys = new Set()

for (const line of lines) {
  const cells = parseCsvLine(line)
  const word = cleanWord(cells[wordIndex] ?? '')
  const deck = deckForLevel(cells[levelIndex] ?? '')
  if (!deck) continue
  if (!word || word.length > 32 || BLOCKED.has(word)) continue
  if (!/^[A-Z0-9][A-Z0-9 ]*$/.test(word)) continue
  const nearKey = spacingInsensitiveKey(word)
  if (spacingKeys.has(nearKey)) continue
  spacingKeys.add(nearKey)
  decks[deck].add(word)
}

const output = {
  generatedAt: new Date().toISOString(),
  source: {
    id: options['source-id'] ?? 'generated-cefr-import',
    name: options['source-name'] ?? path.basename(inputPath),
    url: options['source-url'] ?? `local:${inputPath}`,
    licenseNote: options['license-note'] ?? 'Review source license before integrating generated words.',
    importedAt: new Date().toISOString().slice(0, 10),
    transform: TRANSFORM_NOTE,
    sourcePath: inputPath,
  },
  transform: TRANSFORM_NOTE,
  decks: Object.fromEntries(Object.entries(decks).map(([deck, words]) => [deck, Array.from(words).sort()])),
}

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${outputPath}`)
