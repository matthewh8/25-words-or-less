export interface SpeechMatch {
  matched: boolean
  variant: string | null
}

export const SPEECH_AUTO_ACCEPT_CONFIDENCE = 0.65

export function normalizeSpeechText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['']/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function simpleSingular(value: string): string {
  if (value.endsWith('ies') && value.length > 3) return `${value.slice(0, -3)}y`
  if (/(ches|shes|xes|zes|sses)$/.test(value) && value.length > 4) return value.slice(0, -2)
  if (value.endsWith('s') && value.length > 3 && !value.endsWith('ss')) return value.slice(0, -1)
  return value
}

function simplePlural(value: string): string {
  if (value.endsWith('y') && value.length > 2) return `${value.slice(0, -1)}ies`
  if (/(s|x|z|ch|sh)$/.test(value)) return `${value}es`
  return `${value}s`
}

function transformLastWord(value: string, transform: (word: string) => string): string {
  const parts = value.split(' ')
  const last = parts.at(-1)
  if (!last) return value
  parts[parts.length - 1] = transform(last)
  return parts.join(' ')
}

export function speechTargetVariants(target: string): string[] {
  const normalized = normalizeSpeechText(target)
  if (!normalized) return []

  const variants = new Set([normalized])
  const singular = normalized.split(' ').map(simpleSingular).join(' ')
  variants.add(singular)
  variants.add(transformLastWord(normalized, simpleSingular))
  variants.add(transformLastWord(normalized, simplePlural))

  if (!normalized.includes(' ')) variants.add(simplePlural(normalized))
  for (const variant of Array.from(variants)) {
    if (variant.includes(' ')) variants.add(variant.replace(/\s+/g, ''))
  }

  return Array.from(variants).filter(Boolean)
}

function hasPhrase(transcript: string, phrase: string): boolean {
  const paddedTranscript = ` ${transcript} `
  const paddedPhrase = ` ${phrase} `
  return paddedTranscript.includes(paddedPhrase)
}

export function matchSpeechToTarget(target: string, transcript: string): SpeechMatch {
  const normalizedTranscript = normalizeSpeechText(transcript)
  if (!normalizedTranscript) return { matched: false, variant: null }

  const variants = speechTargetVariants(target)
  const variant = variants.find(item => hasPhrase(normalizedTranscript, item))

  return variant ? { matched: true, variant } : { matched: false, variant: null }
}

export function shouldAutoAcceptSpeechMatch(
  match: SpeechMatch,
  isFinal: boolean,
  confidence = 1,
  threshold = SPEECH_AUTO_ACCEPT_CONFIDENCE
): boolean {
  return match.matched && isFinal && confidence >= threshold
}
