import { describe, expect, it } from 'vitest'
import { CLUE_KEY_BINDINGS, clueKeyboardAction, isEditableTarget } from './keyboard'

function editableTarget(overrides: {
  tagName?: string
  role?: string | null
  contenteditable?: string | null
  isContentEditable?: boolean
  closestMatch?: boolean
}): EventTarget {
  return {
    tagName: overrides.tagName,
    isContentEditable: overrides.isContentEditable,
    getAttribute(name: string) {
      if (name === 'role') return overrides.role ?? null
      if (name === 'contenteditable') return overrides.contenteditable ?? null
      return null
    },
    closest(selector: string) {
      expect(selector).toContain('input')
      return overrides.closestMatch ? {} : null
    },
  } as unknown as EventTarget
}

describe('clue keyboard bindings', () => {
  it('maps all live clue arrow controls', () => {
    expect(CLUE_KEY_BINDINGS.ArrowUp).toBe('add-word')
    expect(CLUE_KEY_BINDINGS.ArrowDown).toBe('spend-word')
    expect(CLUE_KEY_BINDINGS.ArrowLeft).toBe('skip')
    expect(CLUE_KEY_BINDINGS.ArrowRight).toBe('correct')
  })

  it('returns mapped actions for non-editable targets', () => {
    expect(clueKeyboardAction({ key: 'ArrowUp', target: null })).toBe('add-word')
    expect(clueKeyboardAction({
      key: 'ArrowRight',
      target: editableTarget({ tagName: 'button' }),
    })).toBe('correct')
    expect(clueKeyboardAction({ key: 'Enter', target: null })).toBeNull()
  })

  it('ignores key events from editable controls', () => {
    expect(isEditableTarget(editableTarget({ tagName: 'input' }))).toBe(true)
    expect(isEditableTarget(editableTarget({ tagName: 'textarea' }))).toBe(true)
    expect(isEditableTarget(editableTarget({ tagName: 'select' }))).toBe(true)
    expect(isEditableTarget(editableTarget({ role: 'textbox' }))).toBe(true)
    expect(isEditableTarget(editableTarget({ contenteditable: 'true' }))).toBe(true)
    expect(isEditableTarget(editableTarget({ contenteditable: '' }))).toBe(true)
    expect(isEditableTarget(editableTarget({ contenteditable: 'plaintext-only' }))).toBe(true)
    expect(isEditableTarget(editableTarget({ isContentEditable: true }))).toBe(true)
    expect(isEditableTarget(editableTarget({ closestMatch: true }))).toBe(true)
    expect(isEditableTarget(editableTarget({ contenteditable: 'false' }))).toBe(false)

    expect(clueKeyboardAction({
      key: 'ArrowDown',
      target: editableTarget({ tagName: 'input' }),
    })).toBeNull()
    expect(clueKeyboardAction({
      key: 'ArrowLeft',
      target: editableTarget({ closestMatch: true }),
    })).toBeNull()
  })
})
