'use client'

import { useCallback, useEffect, useRef } from 'react'

export type ClueSound = 'word' | 'skip' | 'correct' | 'end'

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

export function useClueSounds(enabled: boolean): (kind: ClueSound) => void {
  const enabledRef = useRef(enabled)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  return useCallback((kind: ClueSound) => {
    if (!enabledRef.current || typeof window === 'undefined') return
    const AudioContextConstructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
    if (!AudioContextConstructor) return

    const context = audioContextRef.current ?? new AudioContextConstructor()
    audioContextRef.current = context
    if (context.state === 'suspended') void context.resume()

    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const frequency = kind === 'correct' ? 660 : kind === 'skip' ? 220 : kind === 'end' ? 160 : 420
    const duration = kind === 'correct' ? 0.16 : 0.1

    oscillator.type = kind === 'skip' || kind === 'end' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(frequency, now)
    if (kind === 'correct') oscillator.frequency.exponentialRampToValueAtTime(880, now + duration)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }, [])
}
