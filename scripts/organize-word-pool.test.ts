import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const scriptPath = path.join(process.cwd(), 'scripts/organize-word-pool.mjs')

interface OrganizedPool {
  generatedAt: string
  source: {
    id: string
    name: string
    url: string
    licenseNote: string
    importedAt: string
    transform: string
  }
  summary: {
    inputCount: number
    acceptedCount: number
    rejected: {
      invalid: number
      duplicate: number
    }
    deckCounts: Record<'green' | 'yellow' | 'red' | 'money', number>
  }
  decks: Record<'green' | 'yellow' | 'red' | 'money', string[]>
  records: Array<{
    text: string
    deck: 'green' | 'yellow' | 'red' | 'money'
    sourceIds: string[]
    status: string
    metrics: Record<string, number>
    score: number
    reason: string
  }>
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), '25wol-word-organize-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe('word pool organizer script', () => {
  it('pools mixed candidate files into green, yellow, red, and money without tags', async () => {
    await withTempDir(async dir => {
      const csvPath = path.join(dir, 'candidates.csv')
      const jsonlPath = path.join(dir, 'phrases.jsonl')
      const outputPath = path.join(dir, 'organized.json')

      await writeFile(csvPath, [
        'word,cefr,zipf',
        'apple,A1,5.2',
        'campus,B1,4.2',
        'metaphorical,B2,2.9',
        'dance battle,,',
        'study break,,',
        'studybreak,B2,',
        'bad-word!,A1,',
        'GOOK,A1,',
      ].join('\n'))
      await writeFile(jsonlPath, [
        JSON.stringify({ text: 'pizza party' }),
        JSON.stringify({ word: 'chair', zipf: 5.1 }),
        JSON.stringify({ text: 'institutionalization', level: 'C1' }),
      ].join('\n'))

      const { stdout, stderr } = await execFileAsync(process.execPath, [
        scriptPath,
        csvPath,
        jsonlPath,
        '--output',
        outputPath,
        '--source-id',
        'test-pool',
        '--source-name',
        'Test pooled source',
        '--source-url',
        'local:test-pool',
        '--license-note',
        'test fixture',
      ])
      const organized = JSON.parse(await readFile(outputPath, 'utf8')) as OrganizedPool

      expect(stderr).toBe('')
      expect(stdout).toContain(`Wrote ${outputPath}`)
      expect(Number.isNaN(Date.parse(organized.generatedAt))).toBe(false)
      expect(organized.source).toMatchObject({
        id: 'test-pool',
        name: 'Test pooled source',
        url: 'local:test-pool',
        licenseNote: 'test fixture',
      })
      expect(organized.source.transform).toContain('Pool all candidates without tags')
      expect(Object.keys(organized.decks)).toEqual(['green', 'yellow', 'red', 'money'])
      expect(organized.decks.green).toEqual(expect.arrayContaining(['APPLE', 'CHAIR']))
      expect(organized.decks.yellow).toContain('CAMPUS')
      expect(organized.decks.red).toEqual(expect.arrayContaining(['INSTITUTIONALIZATION', 'METAPHORICAL']))
      expect(organized.decks.money).toEqual(expect.arrayContaining(['DANCE BATTLE', 'PIZZA PARTY', 'STUDY BREAK']))
      expect(organized.decks.money).not.toContain('STUDYBREAK')
      expect(organized.records.every(record => !Object.hasOwn(record, 'tags'))).toBe(true)
      expect(organized.summary.rejected.invalid).toBe(2)
      expect(organized.summary.rejected.duplicate).toBe(1)
    })
  })

  it('rejects source metadata that would not validate cleanly', async () => {
    await withTempDir(async dir => {
      const inputPath = path.join(dir, 'candidates.txt')
      const outputPath = path.join(dir, 'organized.json')
      await writeFile(inputPath, 'apple\n')

      await expect(execFileAsync(process.execPath, [
        scriptPath,
        inputPath,
        '--output',
        outputPath,
        '--source-id',
        'Bad Source',
      ])).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('Source id must be lowercase letters, numbers, and hyphens'),
      })

      await expect(execFileAsync(process.execPath, [
        scriptPath,
        inputPath,
        '--output',
        outputPath,
        '--source-url',
        'ftp://example.test/words.txt',
      ])).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('Source URL must start with http://, https://, or local:'),
      })
    })
  })
})
