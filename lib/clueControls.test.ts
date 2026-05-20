import { describe, expect, it } from 'vitest'
import { clueControlGameAction, type ClueControlAvailability } from './clueControls'

const open: ClueControlAvailability = {
  dead: false,
  canRefund: true,
  canSkip: true,
}

describe('clue control action resolution', () => {
  it('maps available keyboard actions to reducer actions', () => {
    expect(clueControlGameAction('add-word', open)).toBe('WORD_REFUND')
    expect(clueControlGameAction('spend-word', open)).toBe('WORD_USED')
    expect(clueControlGameAction('skip', open)).toBe('MARK_SKIP')
    expect(clueControlGameAction('correct', open)).toBe('MARK_CORRECT')
  })

  it('blocks disabled controls before dispatching', () => {
    expect(clueControlGameAction(null, open)).toBeNull()
    expect(clueControlGameAction('add-word', { ...open, canRefund: false })).toBeNull()
    expect(clueControlGameAction('skip', { ...open, canSkip: false })).toBeNull()

    expect(clueControlGameAction('spend-word', { ...open, dead: true })).toBeNull()
    expect(clueControlGameAction('correct', { ...open, dead: true })).toBeNull()
  })
})
