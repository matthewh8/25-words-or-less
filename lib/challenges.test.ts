import { describe, expect, it } from 'vitest'
import { DEFAULT_GAME_MODE } from './gameMode'
import { selectChallenge, type ChallengeStats } from './challenges'

function stats(overrides: Partial<ChallengeStats> = {}): ChallengeStats {
  return {
    stream: 'stack',
    allCorrect: false,
    correctCount: 2,
    totalWords: 5,
    skipCount: 0,
    moneyWon: false,
    roundMarker: 2,
    challengesShown: 0,
    ...overrides,
  }
}

describe('challenge selection', () => {
  it('respects disabled settings and game caps', () => {
    expect(selectChallenge(DEFAULT_GAME_MODE.challenge, { enabled: false, includeAlcohol: false }, stats())).toBeNull()
    expect(selectChallenge(DEFAULT_GAME_MODE.challenge, { enabled: true, includeAlcohol: false }, stats({
      challengesShown: DEFAULT_GAME_MODE.challenge.maxPerGame,
    }))).toBeNull()
  })

  it('chooses performance-based prompts', () => {
    expect(selectChallenge(DEFAULT_GAME_MODE.challenge, { enabled: true, includeAlcohol: false }, stats({
      correctCount: 0,
    }))?.label).toBe('Zero correct')

    expect(selectChallenge(DEFAULT_GAME_MODE.challenge, { enabled: true, includeAlcohol: false }, stats({
      skipCount: 4,
    }))?.label).toBe('Skip penalty')

    expect(selectChallenge(DEFAULT_GAME_MODE.challenge, { enabled: true, includeAlcohol: false }, stats({
      allCorrect: true,
      correctCount: 5,
    }))?.label).toBe('Perfect round')
  })

  it('only includes alcohol prompts when explicitly enabled', () => {
    const soberPrompts = Array.from({ length: 8 }, (_, roundMarker) => selectChallenge(
      DEFAULT_GAME_MODE.challenge,
      { enabled: true, includeAlcohol: false },
      stats({
        stream: 'money',
        moneyWon: true,
        allCorrect: true,
        correctCount: 10,
        totalWords: 10,
        roundMarker,
      })
    ))
    const alcohol = selectChallenge(DEFAULT_GAME_MODE.challenge, { enabled: true, includeAlcohol: true }, stats({
      stream: 'money',
      moneyWon: true,
      allCorrect: true,
      correctCount: 10,
      totalWords: 10,
      roundMarker: 1,
    }))

    expect(soberPrompts.every(prompt => prompt && !prompt.text.includes('21+ option'))).toBe(true)
    expect(alcohol?.text).toContain('21+ option')
  })

  it('filters configured 21+ prompts when the setting is disabled', () => {
    const rules = {
      ...DEFAULT_GAME_MODE.challenge,
      prompts: {
        ...DEFAULT_GAME_MODE.challenge.prompts,
        moneyWin: [
          '21+ option: winners take a sip, or raise water instead.',
          'Final flex: winners choose a victory pose for the room.',
        ],
      },
    }

    const sober = selectChallenge(rules, { enabled: true, includeAlcohol: false }, stats({
      stream: 'money',
      moneyWon: true,
      allCorrect: true,
      correctCount: 10,
      totalWords: 10,
      roundMarker: 0,
    }))

    expect(sober?.text).toBe('Final flex: winners choose a victory pose for the room.')
    expect(sober?.alcoholOptional).toBe(false)
  })

  it('falls back to non-alcohol defaults when a configured category is all 21+', () => {
    const rules = {
      ...DEFAULT_GAME_MODE.challenge,
      prompts: {
        ...DEFAULT_GAME_MODE.challenge.prompts,
        standard: ['21+ option: losing team takes one sip, or does a five-second slow clap.'],
      },
    }

    const challenge = selectChallenge(rules, { enabled: true, includeAlcohol: false }, stats())

    expect(challenge?.text).not.toContain('21+ option')
    expect(challenge?.alcoholOptional).toBe(false)
  })

  it('uses frequency settings to pace routine prompts without hiding performance prompts', () => {
    const lowRules = { ...DEFAULT_GAME_MODE.challenge, frequency: 'low' as const }
    const normalRules = { ...DEFAULT_GAME_MODE.challenge, frequency: 'normal' as const }
    const highRules = { ...DEFAULT_GAME_MODE.challenge, frequency: 'high' as const }

    expect(selectChallenge(lowRules, { enabled: true, includeAlcohol: false }, stats({
      correctCount: 2,
      roundMarker: 2,
    }))).toBeNull()
    expect(selectChallenge(lowRules, { enabled: true, includeAlcohol: false }, stats({
      correctCount: 0,
      roundMarker: 3,
    }))?.label).toBe('Zero correct')

    expect(selectChallenge(normalRules, { enabled: true, includeAlcohol: false }, stats({
      correctCount: 2,
      roundMarker: 1,
    }))).toBeNull()
    expect(selectChallenge(normalRules, { enabled: true, includeAlcohol: false }, stats({
      correctCount: 2,
      roundMarker: 2,
    }))?.label).toBe('Party prompt')

    expect(selectChallenge(highRules, { enabled: true, includeAlcohol: false }, stats({
      correctCount: 2,
      roundMarker: 1,
    }))?.label).toBe('Party prompt')
  })
})
