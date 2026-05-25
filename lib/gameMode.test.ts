import { describe, expect, it, vi } from 'vitest'
import { buildGameMode, validateGameModeDefinition } from './gameMode'

describe('game mode constructor', () => {
  it('builds configurable bidding, stack, and money rules from parsed YAML data', () => {
    const mode = buildGameMode({
      id: 'speed-round',
      name: 'Speed Round',
      shortName: 'SPEED',
      timing: {
        turnSeconds: 30,
        moneySeconds: 45,
        biddingSeconds: 20,
        turnPresets: [20, 30],
      },
      bidding: {
        contests: 1,
        wordCount: 4,
        minBid: 3,
        maxBid: 12,
        successPoints: 700,
        failurePoints: 200,
      },
      stacks: {
        wordLimit: 12,
        allCorrectBonus: 300,
        rounds: [{ number: 2, turns: 2, startTeam: 1 }],
        options: [
          { id: 'green', label: 'Easy', wordDeck: 'green', pointsPerWord: 100, color: '#2de584' },
          { id: 'red', label: 'Hard', wordDeck: 'red', pointsPerWord: 900, color: '#ff3a6d' },
        ],
      },
      money: {
        wordCount: 6,
        wordLimit: 15,
        jackpotPoints: 5000,
      },
    })

    expect(mode).toMatchObject({
      id: 'speed-round',
      timing: { turnSeconds: 30, moneySeconds: 45, biddingSeconds: 20 },
      bidding: { contests: 1, wordCount: 4, minBid: 3, maxBid: 12, successPoints: 700 },
      stacks: {
        wordLimit: 12,
        allCorrectBonus: 300,
        rounds: [{ number: 2, turns: 2, startTeam: 1 }],
      },
      money: { wordCount: 6, wordLimit: 15, jackpotPoints: 5000 },
    })
    expect(mode.stacks.options.map(option => option.label)).toEqual(['Easy', 'Hard'])
  })

  it('reports schema errors for invalid YAML definitions', () => {
    const errors = validateGameModeDefinition({
      id: 'broken',
      name: '',
      timing: { turnSeconds: 'fast' },
    })

    expect(errors.some(error => error.includes('mode.name'))).toBe(true)
    expect(errors.some(error => error.includes('timing.turnSeconds'))).toBe(true)
    expect(errors.some(error => error.includes('bidding.title'))).toBe(true)
  })

  it('requires configured 21+ challenge prompts to include a non-alcohol alternative', () => {
    const mode = buildGameMode({})
    const errors = validateGameModeDefinition({
      ...mode,
      challenge: {
        ...mode.challenge,
        prompts: {
          ...mode.challenge.prompts,
          standard: ['21+ option: losing team takes a sip.'],
        },
      },
    })

    expect(errors).toContain('challenge.prompts.standard[0] 21+ prompt must include a non-alcohol alternative')
  })

  it('requires at least one configured prompt when challenges can show', () => {
    const mode = buildGameMode({})
    const errors = validateGameModeDefinition({
      ...mode,
      challenge: {
        ...mode.challenge,
        enabledByDefault: true,
        maxPerGame: 2,
        frequency: 'normal',
        prompts: {},
      },
    })

    expect(errors).toContain('challenge.prompts must include at least one prompt when challenges can show')
    expect(validateGameModeDefinition({
      ...mode,
      challenge: {
        ...mode.challenge,
        enabledByDefault: false,
        maxPerGame: 0,
        frequency: 'off',
        prompts: {},
      },
    })).not.toContain('challenge.prompts must include at least one prompt when challenges can show')
  })

  it('reports cross-field schema errors for incoherent YAML definitions', () => {
    const validMode = {
      id: 'broken-shape',
      name: 'Broken Shape',
      shortName: 'BAD',
      description: 'Mode with internally inconsistent settings.',
      roundCount: 5,
      timing: {
        turnSeconds: 30,
        moneySeconds: 75,
        biddingSeconds: 20,
        minSeconds: 60,
        maxSeconds: 45,
        turnPresets: [30, 60],
        moneyPresets: [45, 75],
      },
      bidding: {
        title: 'Bad Bid',
        contests: 1,
        wordDeck: 'bidding',
        wordCount: 5,
        minBid: 5,
        maxBid: 20,
        successPoints: 8,
        failurePoints: 4,
        failureAward: 'opponent',
      },
      stacks: {
        title: 'Bad Stacks',
        wordCount: 5,
        wordLimit: 15,
        allCorrectBonus: 3,
        rounds: [
          { number: 2, turns: 1, startTeam: 0 },
          { number: 2, turns: 1, startTeam: 1 },
        ],
        options: [
          { id: 'green', label: 'Green', wordDeck: 'green', pointsPerWord: 1, color: '#2de584' },
        ],
      },
      money: {
        title: 'Bad Final',
        wordDeck: 'money',
        wordCount: 5,
        wordLimit: 15,
        jackpotPoints: 10,
      },
      clueActions: {
        allowSkip: true,
        allowBudgetRefund: true,
        autoAdvanceOnCorrect: true,
      },
      challenge: {
        enabledByDefault: false,
        includeAlcoholByDefault: false,
        maxPerGame: 0,
        frequency: 'off',
        prompts: {},
      },
      accessibility: {
        speechRecognitionDefault: false,
        announceControls: true,
      },
    }
    const errors = validateGameModeDefinition(validMode)

    expect(errors.some(error => error.includes('mode.roundCount must equal'))).toBe(true)
    expect(errors.some(error => error.includes('timing.minSeconds must be lower'))).toBe(true)
    expect(errors.some(error => error.includes('timing.biddingSeconds must be between'))).toBe(true)
    expect(errors.some(error => error.includes('timing.moneySeconds must be between'))).toBe(true)
    expect(errors.some(error => error.includes('timing.turnPresets values must be between'))).toBe(true)
    expect(errors.some(error => error.includes('stacks.rounds[1].number duplicates 2'))).toBe(true)
  })

  it('requires bidding timers to stay inside the configured timing bounds', () => {
    const mode = buildGameMode({})
    const errors = validateGameModeDefinition({
      ...mode,
      timing: {
        ...mode.timing,
        minSeconds: 10,
        maxSeconds: 60,
        biddingSeconds: 90,
      },
    })

    expect(errors).toContain('timing.biddingSeconds must be between timing.minSeconds and timing.maxSeconds')
  })

  it('fails loudly for invalid YAML mode files in development', async () => {
    const filePath = path.join(process.cwd(), 'gamemodes', 'invalid-dev-test.yaml')
    await writeFile(filePath, ['id: invalid-dev-test', 'name: ""'].join('\n'))

    try {
      vi.stubEnv('NODE_ENV', 'development')
      await expect(loadGameMode('invalid-dev-test')).rejects.toThrow('Invalid game mode "invalid-dev-test"')
    } finally {
      vi.unstubAllEnvs()
      await rm(filePath, { force: true })
    }
  })

  it('falls back to classic for invalid YAML mode files in production', async () => {
    const filePath = path.join(process.cwd(), 'gamemodes', 'invalid-prod-test.yaml')
    await writeFile(filePath, ['id: invalid-prod-test', 'name: ""'].join('\n'))

    try {
      vi.stubEnv('NODE_ENV', 'production')
      await expect(loadGameMode('invalid-prod-test')).resolves.toMatchObject({ id: 'classic' })
    } finally {
      vi.unstubAllEnvs()
      await rm(filePath, { force: true })
    }
  })

  it('falls back to safe defaults when YAML data is partial or invalid', () => {
    const mode = buildGameMode({
      timing: { minSeconds: 20, maxSeconds: 5, turnPresets: ['bad'] },
      bidding: { minBid: 9, maxBid: 4, failureAward: 'somewhere' },
      stacks: { options: [{ id: 'green' }, { id: 'green' }] },
    })

    expect(mode.timing.maxSeconds).toBe(20)
    expect(mode.timing.turnPresets).toEqual([30, 45, 60, 90])
    expect(mode.bidding.maxBid).toBe(10)
    expect(mode.bidding.failureAward).toBe('opponent')
    expect(mode.stacks.options).toHaveLength(1)
  })
})
