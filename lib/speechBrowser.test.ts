import { describe, expect, it } from 'vitest'
import {
  getSpeechRecognitionConstructor,
  isSpeechRecognitionSupported,
  stopSpeechRecognitionSafely,
  type SpeechRecognitionLike,
} from './speechBrowser'

class FakeRecognition implements SpeechRecognitionLike {
  continuous = false
  interimResults = false
  lang = ''
  onstart = null
  onend = null
  onerror = null
  onresult = null
  start() {}
  stop() {}
}

class FakeWebkitRecognition extends FakeRecognition {}

describe('speech browser support detection', () => {
  it('returns null when speech recognition is unavailable', () => {
    expect(getSpeechRecognitionConstructor(undefined)).toBeNull()
    expect(getSpeechRecognitionConstructor({})).toBeNull()
    expect(isSpeechRecognitionSupported({})).toBe(false)
  })

  it('uses the standard SpeechRecognition constructor when present', () => {
    expect(getSpeechRecognitionConstructor({ SpeechRecognition: FakeRecognition })).toBe(FakeRecognition)
    expect(isSpeechRecognitionSupported({ SpeechRecognition: FakeRecognition })).toBe(true)
  })

  it('falls back to the webkit-prefixed constructor', () => {
    expect(getSpeechRecognitionConstructor({ webkitSpeechRecognition: FakeWebkitRecognition })).toBe(FakeWebkitRecognition)
    expect(isSpeechRecognitionSupported({ webkitSpeechRecognition: FakeWebkitRecognition })).toBe(true)
  })

  it('prefers the standard constructor over the webkit-prefixed one', () => {
    expect(getSpeechRecognitionConstructor({
      SpeechRecognition: FakeRecognition,
      webkitSpeechRecognition: FakeWebkitRecognition,
    })).toBe(FakeRecognition)
  })
})

describe('speech recognition lifecycle helpers', () => {
  it('stops recognition and reports success', () => {
    let stopped = false
    const recognition = new FakeRecognition()
    recognition.stop = () => {
      stopped = true
    }

    expect(stopSpeechRecognitionSafely(recognition)).toBe(true)
    expect(stopped).toBe(true)
  })

  it('swallows browser stop errors and reports failure', () => {
    const recognition = new FakeRecognition()
    recognition.stop = () => {
      throw new DOMException('not started', 'InvalidStateError')
    }

    expect(stopSpeechRecognitionSafely(recognition)).toBe(false)
  })
})
