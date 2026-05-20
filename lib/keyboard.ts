export type ClueKeyboardAction = 'add-word' | 'spend-word' | 'skip' | 'correct'

export const CLUE_KEY_BINDINGS: Record<string, ClueKeyboardAction> = {
  ArrowUp: 'add-word',
  ArrowDown: 'spend-word',
  ArrowLeft: 'skip',
  ArrowRight: 'correct',
}

type EditableTarget = {
  tagName?: string
  isContentEditable?: boolean
  getAttribute?: (name: string) => string | null
  closest?: (selectors: string) => Element | null
}

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false
  const candidate = target as EditableTarget
  const tagName = typeof candidate.tagName === 'string' ? candidate.tagName.toLowerCase() : ''

  return candidate.isContentEditable === true
    || tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || candidate.getAttribute?.('role') === 'textbox'
    || (candidate.getAttribute?.('contenteditable') != null && candidate.getAttribute?.('contenteditable') !== 'false')
    || candidate.closest?.(EDITABLE_SELECTOR) != null
}

export function clueKeyboardAction(event: { key: string; target: EventTarget | null }): ClueKeyboardAction | null {
  if (isEditableTarget(event.target)) return null
  return CLUE_KEY_BINDINGS[event.key] ?? null
}
