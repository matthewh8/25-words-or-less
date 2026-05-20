'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import { canSkipCurrentWord } from '@/lib/gameState'
import { getStackOption } from '@/lib/gameMode'
import { clueControlGameAction, type ClueControlAvailability, type ClueControlGameAction } from '@/lib/clueControls'
import { clueKeyboardAction } from '@/lib/keyboard'
import { matchSpeechToTarget, shouldAutoAcceptSpeechMatch } from '@/lib/speech'
import { getSpeechRecognitionConstructor, isSpeechRecognitionSupported, stopSpeechRecognitionSafely } from '@/lib/speechBrowser'
import { useActionInterval } from '@/lib/useActionInterval'
import Timer from './Timer'
import Scoreboard from './Scoreboard'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

interface ActiveProps extends Props {
  cluing: NonNullable<GameState['cluing']>
}

type ControlSound = 'word' | 'skip' | 'correct' | 'end'

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

export default function ClueGiverView({ state, dispatch }: Props) {
  if (!state.cluing) return null
  return <ActiveClueGiverView state={state} dispatch={dispatch} cluing={state.cluing} />
}

function subscribeSpeechSupport() {
  return () => undefined
}

function getSpeechSupportSnapshot() {
  return isSpeechRecognitionSupported()
}

function getSpeechSupportServerSnapshot() {
  return false
}

function ActiveClueGiverView({ state, dispatch, cluing }: ActiveProps) {
  const { teams } = state
  const [speechEnabled, setSpeechEnabled] = useState(state.gameMode.accessibility.speechRecognitionDefault)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const speechSupported = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot
  )
  const [listening, setListening] = useState(false)
  const [speechNotice, setSpeechNotice] = useState('')
  const [lastTranscript, setLastTranscript] = useState('')
  const soundEnabledRef = useRef(soundEnabled)
  const audioContextRef = useRef<AudioContext | null>(null)

  const { words, guessed, wordsLeft, wordLimit, timeLeft, stream, cluingTeam, currentWordIndex } = cluing
  const stack = stream === 'stack' ? getStackOption(state.gameMode, cluing.stackId ?? '') : null
  const accent = stream === 'bidding' || stream === 'money' ? '#ffd23f' : stack?.color ?? '#ffd23f'
  const timeTotal = stream === 'money' ? state.moneyTime : state.roundTime
  const allGuessed = guessed.every(Boolean)
  const noWordsLeft = wordsLeft === 0
  const overBudget = wordsLeft < 0
  const displayedWordsLeft = Math.max(0, wordsLeft)
  const dead = timeLeft === 0 || overBudget || allGuessed
  const currentWord = words[currentWordIndex]
  const canRefund = !dead && state.gameMode.clueActions.allowBudgetRefund && wordsLeft < wordLimit
  const canSkip = !dead && state.gameMode.clueActions.allowSkip && canSkipCurrentWord(cluing)
  const playControlSound = useCallback((kind: ControlSound) => {
    if (!soundEnabledRef.current || typeof window === 'undefined') return
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

  const controlsRef = useRef<ClueControlAvailability & {
    dispatch: (a: GameAction) => void
    playSound: (kind: ControlSound) => void
  }>({
    dead,
    canRefund,
    canSkip,
    dispatch,
    playSound: playControlSound,
  })

  useEffect(() => {
    controlsRef.current = { dead, canRefund, canSkip, dispatch, playSound: playControlSound }
  }, [canRefund, canSkip, dead, dispatch, playControlSound])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  useActionInterval(() => dispatch({ type: 'TIMER_TICK' }), timeLeft > 0 ? 1000 : null)

  // Arrow controls mirror the visible touch controls.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const action = clueKeyboardAction(e)
      if (action) e.preventDefault()
      const controls = controlsRef.current
      const gameAction = clueControlGameAction(action, controls)
      if (!gameAction) return

      controls.playSound(soundForAction(gameAction))
      controls.dispatch({ type: gameAction })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const Recognition = getSpeechRecognitionConstructor()
    if (!speechEnabled || !Recognition || dead || !currentWord) {
      return
    }

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onstart = () => {
      setListening(true)
      setSpeechNotice('Listening')
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => {
      setListening(false)
      setSpeechNotice('Speech recognition stopped')
    }
    recognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (!transcript) continue
        setLastTranscript(transcript.trim())
        const match = matchSpeechToTarget(currentWord, transcript)
        if (match.matched) {
          const confidence = result[0]?.confidence ?? 1
          if (!shouldAutoAcceptSpeechMatch(match, result.isFinal, confidence)) {
            setSpeechNotice(`Maybe ${currentWord}; tap Correct to confirm`)
            continue
          }
          setSpeechNotice(`Matched ${currentWord}`)
          dispatch({ type: 'MARK_CORRECT' })
          stopSpeechRecognitionSafely(recognition)
          return
        }
      }
    }

    try {
      recognition.start()
    } catch {
      queueMicrotask(() => setSpeechNotice('Speech recognition unavailable'))
    }

    return () => {
      stopSpeechRecognitionSafely(recognition)
    }
  }, [currentWord, dead, dispatch, speechEnabled])

  function dispatchClueAction(action: GameAction, sound: ControlSound) {
    playControlSound(sound)
    dispatch(action)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0a0d14] text-white">

      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 pb-2 pt-3 md:gap-4 md:px-8 md:pb-3 md:pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: accent }} />
          <span className="mono-label text-white/45 text-[10px] font-semibold">{cluing.label}</span>
        </div>
        <Scoreboard teams={teams} compact />
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-2 overflow-hidden p-2 md:grid-cols-[300px_1fr] md:grid-rows-none md:gap-3 md:p-4 xl:grid-cols-[340px_1fr] xl:gap-4 xl:p-8">
        {/* Left: timer and controls */}
        <div className="order-2 grid min-h-0 grid-cols-2 gap-2 md:order-1 md:flex md:flex-col md:gap-3 xl:gap-4">
          <div className="flex justify-center rounded-lg border border-white/10 bg-[#101522] p-2 md:p-5">
            <div className="md:hidden">
              <Timer timeLeft={timeLeft} total={timeTotal} />
            </div>
            <div className="hidden md:block 2xl:hidden">
              <Timer timeLeft={timeLeft} total={timeTotal} size="md" />
            </div>
            <div className="hidden 2xl:block">
              <Timer timeLeft={timeLeft} total={timeTotal} size="lg" />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#141826] p-3 text-center md:p-4">
            <p className="mono-label text-white/35 text-[9px] mb-1">Words left</p>
            <div className={`text-4xl font-black tabular-nums tracking-normal md:text-5xl ${
              displayedWordsLeft <= 5 ? 'text-[#ff3a6d]' : displayedWordsLeft <= 10 ? 'text-[#ffd23f]' : 'text-white'
            }`}>
              {displayedWordsLeft}
              <span className="text-base text-white/25 font-normal"> /{wordLimit}</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all ${
                  displayedWordsLeft <= 5 ? 'bg-[#ff3a6d]' : displayedWordsLeft <= 10 ? 'bg-[#ffd23f]' : 'bg-[#ffd23f]'
                }`}
                style={{ width: `${Math.max(0, (displayedWordsLeft / wordLimit) * 100)}%` }}
              />
            </div>
          </div>

          <div className="col-span-2 rounded-lg border border-white/10 bg-[#141826] p-2 md:p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="mono-label text-[9px] text-white/35">Controls</p>
                <p className="mt-0.5 truncate text-[11px] text-white/45 md:text-xs">
                  {speechSupported ? speechNotice || 'Speech ready' : 'Speech unsupported'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSpeechEnabled(value => !value)}
                  disabled={!speechSupported || dead}
                  aria-pressed={speechEnabled}
                  className={`h-8 rounded-md px-2.5 text-[10px] font-black uppercase leading-none transition-all disabled:opacity-30 ${
                    speechEnabled ? 'bg-[#ffd23f] text-[#0a0d14]' : 'border border-white/10 bg-[#0a0d14] text-white/65'
                  }`}
                >
                  {speechEnabled ? listening ? 'Speech On' : 'Speech Retry' : 'Speech Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(value => !value)}
                  aria-pressed={soundEnabled}
                  className={`h-8 rounded-md px-2.5 text-[10px] font-black uppercase leading-none transition-all ${
                    soundEnabled ? 'bg-[#2de584] text-[#07130d]' : 'border border-white/10 bg-[#0a0d14] text-white/65'
                  }`}
                >
                  Sound {soundEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => dispatchClueAction({ type: 'WORD_REFUND' }, 'word')}
                disabled={!canRefund}
                aria-label="Add one word back to the clue budget"
                aria-keyshortcuts="ArrowUp"
                className="min-h-14 rounded-md border border-[#ffd23f]/30 bg-[#0a0d14] px-2 py-2 text-sm font-black text-[#ffd23f] transition-all hover:bg-[#ffd23f]/10 active:scale-95 disabled:opacity-25 md:min-h-16 md:text-base"
              >
                +1 Word
                <span className="block text-[9px] font-normal text-white/25">Arrow up</span>
              </button>

              <button
                onClick={() => dispatchClueAction({ type: 'WORD_USED' }, 'word')}
                disabled={dead}
                aria-label={noWordsLeft ? 'End turn with no clue words left' : 'Spend one clue word'}
                aria-keyshortcuts="ArrowDown"
                className="min-h-14 rounded-md border border-white/10 bg-[#0a0d14] px-2 py-2 text-sm font-black text-white transition-all hover:border-white/20 active:scale-95 disabled:opacity-25 md:min-h-16 md:text-base"
              >
                -1 Word
                <span className="block text-[9px] font-normal text-white/25">Arrow down</span>
              </button>

              <button
                onClick={() => !dead && dispatchClueAction({ type: 'MARK_CORRECT' }, 'correct')}
                disabled={dead}
                aria-label="Mark current word correct"
                aria-keyshortcuts="ArrowRight"
                className="min-h-14 rounded-md bg-[#2de584] px-2 py-2 text-sm font-black text-[#0a0d14] transition-all hover:bg-[#6df0aa] active:scale-95 disabled:opacity-25 md:min-h-16 md:text-base"
              >
                Correct
                <span className="block text-[9px] font-normal text-[#0a0d14]/50">Arrow right</span>
              </button>

              <button
                onClick={() => !dead && dispatchClueAction({ type: 'MARK_SKIP' }, 'skip')}
                disabled={!canSkip}
                aria-label="Skip current word"
                aria-keyshortcuts="ArrowLeft"
                className="min-h-14 rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-sm font-black text-white/70 transition-all hover:border-white/20 active:scale-95 disabled:opacity-25 md:min-h-16 md:text-base"
              >
                Skip
                <span className="block text-[9px] font-normal text-white/25">Arrow left</span>
              </button>
            </div>

            <button
              onClick={() => dispatchClueAction({ type: 'END_CLUING' }, 'end')}
              className="mt-1.5 h-9 w-full rounded-md border border-white/10 px-2 text-[11px] font-bold text-white/35 transition-colors hover:text-white/55"
            >
              End
            </button>

            {lastTranscript && (
              <p className="mt-2 truncate text-[11px] text-white/30">Heard: {lastTranscript}</p>
            )}
          </div>
        </div>

        {/* Right: current word */}
        <div className="order-1 flex min-h-0 flex-col rounded-lg border border-white/10 bg-[#141826] p-3 md:order-2 md:min-h-[320px] md:p-6 xl:min-h-[360px] xl:p-8">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-3 md:mb-6">
            <p className="mono-label shrink-0 text-white/35 text-[10px]">
              {Math.min(currentWordIndex + 1, words.length)} of {words.length}
            </p>
            <p className="mono-label min-w-0 truncate text-right text-white/35 text-[10px]">{teams[cluingTeam].name}</p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center">
            {dead && !allGuessed ? (
              <p className="text-white/25 text-6xl font-black">-</p>
            ) : (
              <p
                key={currentWordIndex}
                className="fade-in-up max-w-full break-words text-white font-black uppercase leading-[0.9] tracking-normal"
                style={{ fontSize: currentWord.length > 10 ? 'clamp(2.25rem, 8vw, 6rem)' : currentWord.length > 7 ? 'clamp(2.75rem, 10vw, 7rem)' : 'clamp(3.25rem, 12vw, 9rem)' }}
              >
                {currentWord}
              </p>
            )}
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-2 md:mt-6">
            {words.map((_, i) => (
              <div
                key={i}
                className={`h-2.5 rounded-full transition-all ${
                  guessed[i]
                    ? 'w-8 bg-[#2de584]'
                    : i === currentWordIndex && !dead
                    ? 'w-8 bg-[#ffd23f]'
                    : 'w-2.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          {allGuessed && (
            <div className="mt-4 text-[#2de584] text-xs font-bold text-center">All done</div>
          )}
          {noWordsLeft && !allGuessed && (
            <div className="mt-4 text-[#ffd23f] text-xs font-bold text-center">No clue words left</div>
          )}
          {overBudget && !allGuessed && (
            <div className="mt-4 text-[#ff3a6d] text-xs font-bold text-center">Over word budget</div>
          )}
        </div>
      </div>

    </div>
  )
}

function soundForAction(action: ClueControlGameAction): ControlSound {
  if (action === 'MARK_CORRECT') return 'correct'
  if (action === 'MARK_SKIP') return 'skip'
  return 'word'
}
