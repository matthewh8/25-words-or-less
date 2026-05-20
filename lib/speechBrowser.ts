export interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string; confidence: number }
}

export interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

export interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start: () => void
  stop: () => void
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export interface SpeechRecognitionWindowLike {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export function getSpeechRecognitionConstructor(
  scope: SpeechRecognitionWindowLike | undefined = typeof window !== 'undefined'
    ? window as typeof window & SpeechRecognitionWindowLike
    : undefined
): SpeechRecognitionConstructor | null {
  return scope?.SpeechRecognition ?? scope?.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(scope?: SpeechRecognitionWindowLike): boolean {
  return getSpeechRecognitionConstructor(scope) !== null
}

export function stopSpeechRecognitionSafely(recognition: SpeechRecognitionLike): boolean {
  try {
    recognition.stop()
    return true
  } catch {
    return false
  }
}
