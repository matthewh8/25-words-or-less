import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const scriptPath = path.join(process.cwd(), 'scripts/import-word-bank.mjs')

interface GeneratedWordBank {
  generatedAt: string
  source: {
    id: string
    name: string
    url: string
    licenseNote: string
    importedAt: string
    transform: string
    sourcePath: string
  }
  transform: string
  decks: {
    green: string[]
    yellow: string[]
    red: string[]
  }
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), '25wol-word-import-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe('word-bank import script', () => {
  it('cleans, tiers, blocks, and globally dedupes generated CEFR words', async () => {
    await withTempDir(async dir => {
      const inputPath = path.join(dir, 'cefr.csv')
      const outputPath = path.join(dir, 'generated.json')

      await writeFile(inputPath, [
        'headword,cefr,notes',
        'apple,A1,common object',
        '"study break",B1,"quoted note, with comma"',
        'studybreak,B2,spacing duplicate in a harder tier',
        'metaphor,B2,abstract but fair',
        'GOOK,B1,blocked unsafe term',
        'bad-word!,A2,invalid punctuation',
        'advanced,C1,unsupported level',
        '   banana   split  ,A2,spacing normalized',
        '',
      ].join('\n'))

      const { stdout, stderr } = await execFileAsync(process.execPath, [
        scriptPath,
        inputPath,
        outputPath,
        '--source-id',
        'olp-test',
        '--source-name',
        'Open Language Profiles test fixture',
        '--source-url',
        'https://example.test/olp-fixture.csv',
        '--license-note',
        'permissive test fixture',
      ])
      const generated = JSON.parse(await readFile(outputPath, 'utf8')) as GeneratedWordBank

      expect(stderr).toBe('')
      expect(stdout).toContain(`Wrote ${outputPath}`)
      expect(Number.isNaN(Date.parse(generated.generatedAt))).toBe(false)
      expect(generated.source).toEqual({
        id: 'olp-test',
        name: 'Open Language Profiles test fixture',
        url: 'https://example.test/olp-fixture.csv',
        licenseNote: 'permissive test fixture',
        importedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        transform: expect.stringContaining('across generated decks'),
        sourcePath: inputPath,
      })
      expect(generated.transform).toContain('across generated decks')
      expect(generated.decks.green).toEqual(['APPLE', 'BANANA SPLIT'])
      expect(generated.decks.yellow).toEqual(['STUDY BREAK'])
      expect(generated.decks.red).toEqual(['METAPHOR'])
      expect([...generated.decks.green, ...generated.decks.yellow, ...generated.decks.red]).not.toContain('GOOK')
      expect([...generated.decks.green, ...generated.decks.yellow, ...generated.decks.red]).not.toContain('STUDYBREAK')
    })
  })

  it('fails loudly when a compatible word or CEFR column is missing', async () => {
    await withTempDir(async dir => {
      const inputPath = path.join(dir, 'bad.csv')
      const outputPath = path.join(dir, 'generated.json')

      await writeFile(inputPath, 'term,difficulty\napple,easy\n')

      await expect(execFileAsync(process.execPath, [scriptPath, inputPath, outputPath])).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('CSV must include a word/headword/lemma column and a CEFR level column'),
      })
    })
  })

  it('rejects generated source metadata that would fail app validation', async () => {
    await withTempDir(async dir => {
      const inputPath = path.join(dir, 'cefr.csv')
      const outputPath = path.join(dir, 'generated.json')
      await writeFile(inputPath, 'word,cefr\napple,A1\n')

      await expect(execFileAsync(process.execPath, [
        scriptPath,
        inputPath,
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
        outputPath,
        '--source-url',
        'ftp://example.test/words.csv',
      ])).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('Source URL must start with http://, https://, or local:'),
      })

      await expect(execFileAsync(process.execPath, [
        scriptPath,
        inputPath,
        outputPath,
        '--license-note',
        '   ',
      ])).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('Source name and license note cannot be blank'),
      })
    })
  })

  it('emits review-oriented source metadata defaults for local imports', async () => {
    await withTempDir(async dir => {
      const inputPath = path.join(dir, 'local.csv')
      const outputPath = path.join(dir, 'generated.json')

      await writeFile(inputPath, 'lemma,level\napple,A1\n')

      await execFileAsync(process.execPath, [scriptPath, inputPath, outputPath])
      const generated = JSON.parse(await readFile(outputPath, 'utf8')) as GeneratedWordBank

      expect(generated.source).toMatchObject({
        id: 'generated-cefr-import',
        name: 'local.csv',
        url: `local:${inputPath}`,
        licenseNote: 'Review source license before integrating generated words.',
        sourcePath: inputPath,
      })
      expect(generated.source.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
