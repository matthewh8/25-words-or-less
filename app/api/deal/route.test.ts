import { describe, expect, it } from 'vitest'
import { POST } from './route'

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/deal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function jsonResponse(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>
}

describe('/api/deal route', () => {
  it('rejects invalid JSON and invalid deal kinds', async () => {
    const invalidJson = await POST(new Request('http://localhost/api/deal', {
      method: 'POST',
      body: '{not-json',
    }))
    expect(invalidJson.status).toBe(400)
    await expect(jsonResponse(invalidJson)).resolves.toMatchObject({ error: 'Invalid JSON body' })

    const invalidKind = await POST(jsonRequest({ kind: 'everything' }))
    expect(invalidKind.status).toBe(400)
    await expect(jsonResponse(invalidKind)).resolves.toMatchObject({ error: 'Invalid deal kind' })
  })

  it('deals bidding words from the selected game mode without reusing submitted words', async () => {
    const response = await POST(jsonRequest({
      kind: 'bidding',
      modeId: 'classic',
      usedWords: ['ability', 'ABILITY', '  accept  ', null],
    }))
    const body = await jsonResponse(response) as {
      kind: string
      deckId: string
      words: string[]
      definitions: Record<string, string>
    }

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ kind: 'words', deckId: 'bidding' })
    expect(body.words).toHaveLength(5)
    expect(body.words).not.toContain('ABILITY')
    expect(body.words).not.toContain('ACCEPT')
    expect(Object.keys(body.definitions)).toEqual(expect.arrayContaining(body.words))
  })

  it('deals complete stack boards from YAML mode rules', async () => {
    const response = await POST(jsonRequest({
      kind: 'stack',
      modeId: 'quick-party',
      roundNumber: 2,
      usedWords: [],
    }))
    const body = await jsonResponse(response) as {
      kind: string
      roundNumber: number
      drawnWords: string[]
      wordsByStack: Record<string, string[]>
      definitions: Record<string, string>
    }

    expect(response.status).toBe(200)
    expect(body.kind).toBe('stack')
    expect(body.roundNumber).toBe(2)
    expect(Object.keys(body.wordsByStack)).toEqual(['green', 'yellow', 'red'])
    expect(body.drawnWords).toHaveLength(15)
    expect(new Set(body.drawnWords).size).toBe(body.drawnWords.length)
    expect(Object.keys(body.definitions)).toEqual(expect.arrayContaining(body.drawnWords))
  })
})
