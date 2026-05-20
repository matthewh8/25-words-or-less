import { describe, expect, it } from 'vitest'
import { matchSpeechToTarget, normalizeSpeechText, shouldAutoAcceptSpeechMatch, speechTargetVariants } from './speech'

describe('speech matching', () => {
  it('normalizes punctuation, case, hyphens, and spacing', () => {
    expect(normalizeSpeechText('  Spider-Man!!  ')).toBe('spider man')
    expect(matchSpeechToTarget('SPIDER MAN', 'I think it is spider-man')).toMatchObject({ matched: true })
  })

  it('matches common no-space variants for spaced or hyphenated targets', () => {
    expect(speechTargetVariants('AIR GUITAR')).toContain('airguitar')
    expect(matchSpeechToTarget('SPIDER MAN', 'the answer is spiderman')).toMatchObject({ matched: true })
    expect(matchSpeechToTarget('T-SHIRT', 'it has to be tshirt')).toMatchObject({ matched: true })
  })

  it('accepts simple singular and plural variants', () => {
    expect(speechTargetVariants('BERRY')).toContain('berries')
    expect(matchSpeechToTarget('BERRIES', 'the answer is berry')).toMatchObject({ matched: true })
    expect(matchSpeechToTarget('CAT', 'two cats on campus')).toMatchObject({ matched: true })
  })

  it('accepts simple final-word plural variants for phrase targets', () => {
    expect(speechTargetVariants('YOGA POSE')).toContain('yoga poses')
    expect(speechTargetVariants('YOGA POSE')).toContain('yogaposes')
    expect(matchSpeechToTarget('YOGA POSE', 'they are doing yoga poses')).toMatchObject({ matched: true })
    expect(matchSpeechToTarget('BOARD GAMES', 'the answer is board game')).toMatchObject({ matched: true })
  })

  it('avoids substring false positives', () => {
    expect(matchSpeechToTarget('CAT', 'category theory')).toMatchObject({ matched: false })
    expect(matchSpeechToTarget('CAR', 'scar tissue')).toMatchObject({ matched: false })
    expect(matchSpeechToTarget('AIR GUITAR', 'chairguitar')).toMatchObject({ matched: false })
  })

  it('only auto-accepts final high-confidence matches', () => {
    const match = matchSpeechToTarget('CAT', 'cat')

    expect(shouldAutoAcceptSpeechMatch(match, true, 0.65)).toBe(true)
    expect(shouldAutoAcceptSpeechMatch(match, true, 0.64)).toBe(false)
    expect(shouldAutoAcceptSpeechMatch(match, false, 1)).toBe(false)
    expect(shouldAutoAcceptSpeechMatch({ matched: false, variant: null }, true, 1)).toBe(false)
  })
})
