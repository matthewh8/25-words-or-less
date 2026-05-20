import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const WORDFREQ_VERSION = '3.1.1'
export const WORDFREQ_SOURCE_ID = 'wordfreq-3-1-1'
export const MIN_AVERAGE_ZIPF = 2.5
export const MIN_MONEY_ZIPF = 2.8

const RAW_DIR = 'data/words/raw'
const WORDFREQ_PACKAGE_DIR = path.join(RAW_DIR, `wordfreq-python-${WORDFREQ_VERSION}`)
const WORDFREQ_CACHE_PATH = path.join(RAW_DIR, `wordfreq-en-zipf-${WORDFREQ_VERSION}.json`)

function normalizeWord(word) {
  return String(word ?? '').trim().toUpperCase()
}

function uniqueSortedWords(words) {
  return [...new Set(words.map(normalizeWord).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

async function readCachedScores() {
  try {
    const cache = JSON.parse(await readFile(WORDFREQ_CACHE_PATH, 'utf8'))
    if (cache.version === WORDFREQ_VERSION && cache.language === 'en' && cache.scores && typeof cache.scores === 'object') {
      return cache.scores
    }
  } catch {
    // Cache is optional; rebuild below when missing or stale.
  }
  return {}
}

async function writeCachedScores(scores) {
  await mkdir(RAW_DIR, { recursive: true })
  await writeFile(WORDFREQ_CACHE_PATH, `${JSON.stringify({
    version: WORDFREQ_VERSION,
    language: 'en',
    scores,
  }, null, 2)}\n`)
}

async function ensureWordfreqPackage() {
  const packageMarker = path.join(WORDFREQ_PACKAGE_DIR, 'wordfreq', '__init__.py')
  if (existsSync(packageMarker)) return

  await mkdir(WORDFREQ_PACKAGE_DIR, { recursive: true })
  execFileSync('python3', [
    '-m',
    'pip',
    'install',
    '--quiet',
    '--target',
    WORDFREQ_PACKAGE_DIR,
    `wordfreq==${WORDFREQ_VERSION}`,
  ], { stdio: 'inherit' })
}

function pythonPathEnv() {
  const packagePath = path.resolve(WORDFREQ_PACKAGE_DIR)
  const existing = process.env.PYTHONPATH
  return existing ? `${packagePath}${path.delimiter}${existing}` : packagePath
}

function computeMissingScores(words) {
  if (!words.length) return {}

  const script = `
import json
import sys
from wordfreq import zipf_frequency

words = json.load(sys.stdin)
scores = {word: round(float(zipf_frequency(word.lower(), "en")), 3) for word in words}
json.dump(scores, sys.stdout, separators=(",", ":"))
`

  const output = execFileSync('python3', ['-c', script], {
    input: JSON.stringify(words),
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    env: {
      ...process.env,
      PYTHONPATH: pythonPathEnv(),
    },
  })
  return JSON.parse(output)
}

export async function loadWordfreqScores(words) {
  const normalizedWords = uniqueSortedWords(words)
  const scores = await readCachedScores()
  const missing = normalizedWords.filter(word => typeof scores[word] !== 'number')

  if (missing.length) {
    await ensureWordfreqPackage()
    Object.assign(scores, computeMissingScores(missing))
    await writeCachedScores(scores)
  }

  return new Map(normalizedWords.map(word => [word, scores[word] ?? 0]))
}
