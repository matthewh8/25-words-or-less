import type { ClueKeyboardAction } from './keyboard'

export interface ClueControlAvailability {
  dead: boolean
  canRefund: boolean
  canSkip: boolean
}

export type ClueControlGameAction = 'WORD_REFUND' | 'WORD_USED' | 'MARK_SKIP' | 'MARK_CORRECT'

export function clueControlGameAction(
  action: ClueKeyboardAction | null,
  availability: ClueControlAvailability
): ClueControlGameAction | null {
  if (!action || availability.dead) return null
  if (action === 'add-word') return availability.canRefund ? 'WORD_REFUND' : null
  if (action === 'spend-word') return 'WORD_USED'
  if (action === 'skip') return availability.canSkip ? 'MARK_SKIP' : null
  if (action === 'correct') return 'MARK_CORRECT'
  return null
}
