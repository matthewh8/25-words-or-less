'use client'

import { useEffect, useState } from 'react'
import { matchSpeechToTarget, shouldAutoAcceptSpeechMatch } from './speech'
import { getSpeechRecognitionConstructor, stopSpeechRecognitionSafely } from './speechBrowser'

interface SpeechMatchOptions {
  currentWord: string | undefined
  enabled: boolean
  dead: boolean
  onMatch: () => void
}

interface SpeechMatchState {
  listening: boolean
  notice: string
  transcript: string
}

export function useSpeechMatch({ currentWord, enabled, dead, onMatch }: SpeechMatchOptions): SpeechMatchState {
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState('')
  const [transcript, setTranscript] = useState('')

  useEffect(() => {
    const Recognition = getSpeechRecognitionConstructor()
    if (!enabled || !Recognition || dead || !currentWord) return

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onstart = () => {
      setListening(true)
      setNotice('Listening')
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => {
      setListening(false)
      setNotice('Speech recognition stopped')
    }
    recognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const heard = result[0]?.transcript ?? ''
        if (!heard) continue
        setTranscript(heard.trim())
        const match = matchSpeechToTarget(currentWord, heard)
        if (match.matched) {
          const confidence = result[0]?.confidence ?? 1
          if (!shouldAutoAcceptSpeechMatch(match, result.isFinal, confidence)) {
            setNotice(`Maybe ${currentWord}; tap Correct to confirm`)
            continue
          }
          setNotice(`Matched ${currentWord}`)
          onMatch()
          stopSpeechRecognitionSafely(recognition)
          return
        }
      }
    }

    try {
      recognition.start()
    } catch {
      queueMicrotask(() => setNotice('Speech recognition unavailable'))
    }

    return () => {
      stopSpeechRecognitionSafely(recognition)
    }
  }, [currentWord, dead, enabled, onMatch])

  return { listening, notice, transcript }
}
