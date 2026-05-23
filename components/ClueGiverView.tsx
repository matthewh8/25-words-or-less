'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import { canSkipCurrentWord } from '@/lib/gameState'
import { findStackOption } from '@/lib/gameMode'
import { clueControlGameAction, type ClueControlGameAction } from '@/lib/clueControls'
import { clueKeyboardAction } from '@/lib/keyboard'
import { isSpeechRecognitionSupported } from '@/lib/speechBrowser'
import { useActionInterval } from '@/lib/useActionInterval'
import { useClueSounds, type ClueSound } from '@/lib/clueSounds'
import { useSpeechMatch } from '@/lib/useSpeechMatch'
import Timer from './Timer'
import TeamStatusBar from './TeamStatusBar'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

interface ActiveProps extends Props {
  cluing: NonNullable<GameState['cluing']>
}

export default function ClueGiverView({ state, dispatch }: Props) {
  if (!state.cluing) return null
  return <ActiveClueGiverView state={state} dispatch={dispatch} cluing={state.cluing} />
}

const subscribeSpeechSupport = () => () => undefined
const getSpeechSupportSnapshot = () => isSpeechRecognitionSupported()
const getSpeechSupportServerSnapshot = () => false

function ActiveClueGiverView({ state, dispatch, cluing }: ActiveProps) {
  const { teams } = state
  const [speechEnabled, setSpeechEnabled] = useState(state.gameMode.accessibility.speechRecognitionDefault)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const speechSupported = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot
  )
  const playSound = useClueSounds(soundEnabled)

  const { words, guessed, wordsLeft, wordLimit, timeLeft, stream, cluingTeam, currentWordIndex } = cluing
  const stack = stream === 'stack' ? findStackOption(state.gameMode, cluing.stackId ?? '') : null
  const accent = stream === 'bidding' || stream === 'money' ? '#ffd23f' : stack?.color ?? '#ffd23f'
  const moneyStream = stream === 'money'
  const mobileClueGridRows = stream === 'money'
    ? 'grid-rows-[minmax(0,0.58fr)_minmax(0,1.42fr)]'
    : 'grid-rows-[minmax(0,0.92fr)_minmax(0,1.08fr)]'
  const timeTotal = stream === 'money' ? state.moneyTime : state.roundTime
  const allGuessed = guessed.every(Boolean)
  const noWordsLeft = wordsLeft === 0
  const dead = timeLeft === 0 || allGuessed
  const currentWord = words[currentWordIndex]
  const canRefund = !dead && state.gameMode.clueActions.allowBudgetRefund && wordsLeft < wordLimit
  const canSkip = !dead && state.gameMode.clueActions.allowSkip && canSkipCurrentWord(cluing)

  const onSpeechMatch = useCallback(() => dispatch({ type: 'MARK_CORRECT' }), [dispatch])
  const { listening, notice: speechNotice, transcript: lastTranscript } = useSpeechMatch({
    currentWord,
    enabled: speechEnabled,
    dead,
    onMatch: onSpeechMatch,
  })

  useActionInterval(() => dispatch({ type: 'TIMER_TICK' }), timeLeft > 0 ? 1000 : null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const action = clueKeyboardAction(e)
      if (action) e.preventDefault()
      const gameAction = clueControlGameAction(action, { dead, canRefund, canSkip })
      if (!gameAction) return
      playSound(soundForAction(gameAction))
      dispatch({ type: gameAction })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canRefund, canSkip, dead, dispatch, playSound])

  function dispatchClueAction(action: GameAction, sound: ClueSound) {
    playSound(sound)
    dispatch(action)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0d14] pb-[5dvh] text-white">

      <div className="shrink-0 border-b border-white/10 px-3 pb-2 pt-3 md:px-8 md:pb-3 md:pt-4 landscape-short:py-1.5">
        <div className="mb-2 flex items-center gap-2 landscape-short:mb-1">
          <div className="h-2 w-2 rounded-full" style={{ background: accent }} />
          <span className="mono-label text-white/45 text-[10px] font-semibold">{cluing.label}</span>
        </div>
        <TeamStatusBar
          teams={teams}
          activeTeam={cluingTeam}
          activeLabel="Cluing"
          compact
        />
      </div>

      <div className={`grid min-h-0 flex-1 ${mobileClueGridRows} gap-2 overflow-hidden p-2 md:grid-cols-[300px_1fr] md:grid-rows-none md:gap-3 md:p-4 xl:grid-cols-[340px_1fr] xl:gap-4 xl:p-8`}>
        {/* Left: timer and controls */}
        <div className="order-2 grid min-h-0 grid-cols-2 gap-2 md:order-1 md:flex md:flex-col md:gap-3 xl:gap-4 landscape-short:grid landscape-short:grid-cols-2 landscape-short:gap-1.5">
          <div className="rounded-lg border border-white/10 bg-[#141826] p-3 text-center md:p-4 landscape-short:hidden">
            <p className="mono-label text-white/35 text-[9px] mb-1">Words left</p>
            <div className={`text-4xl font-black tabular-nums tracking-normal md:text-5xl ${
              wordsLeft <= 5 ? 'text-[#ff3a6d]' : wordsLeft <= 10 ? 'text-[#ffd23f]' : 'text-white'
            }`}>
              {wordsLeft}
              <span className="text-base text-white/25 font-normal"> /{wordLimit}</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all ${
                  wordsLeft <= 5 ? 'bg-[#ff3a6d]' : 'bg-[#ffd23f]'
                }`}
                style={{ width: `${Math.max(0, (wordsLeft / wordLimit) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-center rounded-lg border border-white/10 bg-[#101522] p-2 md:p-5 landscape-short:hidden">
            <div className="md:hidden">
              <Timer timeLeft={timeLeft} total={timeTotal} size={moneyStream ? 'xs' : 'sm'} />
            </div>
            <div className="hidden md:block 2xl:hidden">
              <Timer timeLeft={timeLeft} total={timeTotal} size="md" />
            </div>
            <div className="hidden 2xl:block">
              <Timer timeLeft={timeLeft} total={timeTotal} size="lg" />
            </div>
          </div>

          <div className={`col-span-2 rounded-lg border border-white/10 bg-[#141826] md:p-3 landscape-short:p-1.5 landscape-short:col-span-2 ${moneyStream ? 'p-1.5' : 'p-2'}`}>
            <div className={`flex items-center justify-between gap-2 ${moneyStream ? 'mb-1' : 'mb-2'} landscape-short:mb-1`}>
              <div className="min-w-0 landscape-short:hidden">
                <p className="mono-label text-[9px] text-white/35">Controls</p>
                <p className="mt-0.5 truncate text-[11px] text-white/45 md:text-xs">
                  {speechSupported ? speechNotice || 'Speech ready' : 'Speech unsupported'}
                </p>
              </div>
              <div className="hidden landscape-short:flex landscape-short:min-w-0 landscape-short:items-baseline landscape-short:gap-2">
                <span className={`font-black tabular-nums text-lg leading-none ${wordsLeft <= 5 ? 'text-[#ff3a6d]' : wordsLeft <= 10 ? 'text-[#ffd23f]' : 'text-white'}`}>
                  {wordsLeft}<span className="text-white/30 text-xs">/{wordLimit}</span>
                </span>
                <span className={`font-black tabular-nums text-xl leading-none ${timeLeft <= 10 ? 'text-[#ff3a6d]' : timeLeft <= 20 ? 'text-[#ffd23f]' : 'text-white'}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSpeechEnabled(value => !value)}
                  disabled={!speechSupported || dead}
                  aria-pressed={speechEnabled}
                  className={`h-9 rounded-md px-2.5 text-[10px] font-black uppercase leading-none transition-all disabled:opacity-30 ${
                    speechEnabled ? 'bg-[#ffd23f] text-[#0a0d14]' : 'border border-white/10 bg-[#0a0d14] text-white/65'
                  }`}
                >
                  {speechEnabled ? listening ? 'Speech On' : 'Speech Retry' : 'Speech Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(value => !value)}
                  aria-pressed={soundEnabled}
                  className={`h-9 rounded-md px-2.5 text-[10px] font-black uppercase leading-none transition-all ${
                    soundEnabled ? 'bg-[#2de584] text-[#07130d]' : 'border border-white/10 bg-[#0a0d14] text-white/65'
                  }`}
                >
                  Sound {soundEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-2 ${moneyStream ? 'gap-1' : 'gap-1.5'}`}>
              <button
                onClick={() => dispatchClueAction({ type: 'WORD_USED' }, noWordsLeft ? 'end' : 'word')}
                disabled={dead}
                aria-label={noWordsLeft ? 'End turn with no clue words left' : 'Spend one clue word'}
                aria-keyshortcuts="ArrowDown"
                className={`rounded-md border border-white/10 bg-[#0a0d14] px-2 font-black text-white transition-all hover:border-white/20 active:scale-95 disabled:opacity-25 md:min-h-16 md:py-2 md:text-base ${moneyStream ? 'min-h-11 py-1 text-xs' : 'min-h-14 py-2 text-sm landscape-short:min-h-11 landscape-short:py-1 landscape-short:text-xs'}`}
              >
                -1 Word
                <span className={`text-[9px] font-normal text-white/25 ${moneyStream ? 'hidden md:block' : 'block landscape-short:hidden'}`}>Arrow down</span>
              </button>

              <button
                onClick={() => !dead && dispatchClueAction({ type: 'MARK_CORRECT' }, 'correct')}
                disabled={dead}
                aria-label="Mark current word correct"
                aria-keyshortcuts="ArrowRight"
                className={`rounded-md bg-[#2de584] px-2 font-black text-[#0a0d14] transition-all hover:bg-[#6df0aa] active:scale-95 disabled:opacity-25 md:min-h-16 md:py-2 md:text-base ${moneyStream ? 'min-h-11 py-1 text-xs' : 'min-h-14 py-2 text-sm landscape-short:min-h-11 landscape-short:py-1 landscape-short:text-xs'}`}
              >
                Correct
                <span className={`text-[9px] font-normal text-[#0a0d14]/50 ${moneyStream ? 'hidden md:block' : 'block landscape-short:hidden'}`}>Arrow right</span>
              </button>

              <button
                onClick={() => dispatchClueAction({ type: 'WORD_REFUND' }, 'word')}
                disabled={!canRefund}
                aria-label="Add one word back to the clue budget"
                aria-keyshortcuts="ArrowUp"
                className={`rounded-md border border-[#ffd23f]/30 bg-[#0a0d14] px-2 font-black text-[#ffd23f] transition-all hover:bg-[#ffd23f]/10 active:scale-95 disabled:opacity-25 md:min-h-16 md:py-2 md:text-base ${moneyStream ? 'min-h-11 py-1 text-xs' : 'min-h-14 py-2 text-sm landscape-short:min-h-11 landscape-short:py-1 landscape-short:text-xs'}`}
              >
                +1 Word
                <span className={`text-[9px] font-normal text-white/25 ${moneyStream ? 'hidden md:block' : 'block landscape-short:hidden'}`}>Arrow up</span>
              </button>

              <button
                onClick={() => !dead && dispatchClueAction({ type: 'MARK_SKIP' }, 'skip')}
                disabled={!canSkip}
                aria-label="Skip current word"
                aria-keyshortcuts="ArrowLeft"
                className={`rounded-md border border-white/10 bg-white/[0.04] px-2 font-black text-white/70 transition-all hover:border-white/20 active:scale-95 disabled:opacity-25 md:min-h-16 md:py-2 md:text-base ${moneyStream ? 'min-h-11 py-1 text-xs' : 'min-h-14 py-2 text-sm landscape-short:min-h-11 landscape-short:py-1 landscape-short:text-xs'}`}
              >
                Skip
                <span className={`text-[9px] font-normal text-white/25 ${moneyStream ? 'hidden md:block' : 'block landscape-short:hidden'}`}>Arrow left</span>
              </button>
            </div>

            <button
              onClick={() => dispatchClueAction({ type: 'END_CLUING' }, 'end')}
              className={`w-full rounded-md border border-white/10 px-2 text-[11px] font-bold text-white/35 transition-colors hover:text-white/55 ${moneyStream ? 'mt-1 h-9 md:mt-1.5 md:h-9' : 'mt-1.5 h-9'} landscape-short:mt-1 landscape-short:h-7`}
            >
              End
            </button>

            {lastTranscript && (
              <p className="mt-2 truncate text-[11px] text-white/30">Heard: {lastTranscript}</p>
            )}
          </div>
        </div>

        {/* Right: current word */}
        <div className="order-1 flex min-h-0 flex-col rounded-lg border border-white/10 bg-[#141826] p-3 md:order-2 md:min-h-[320px] md:p-6 xl:min-h-[360px] xl:p-8 landscape-short:min-h-0 landscape-short:p-2">
          <div className="mb-2 flex min-w-0 items-center gap-3 md:mb-6">
            <p className="mono-label shrink-0 text-white/35 text-[10px]">
              {Math.min(currentWordIndex + 1, words.length)} of {words.length}
            </p>
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
        </div>
      </div>

    </div>
  )
}

function soundForAction(action: ClueControlGameAction): ClueSound {
  if (action === 'MARK_CORRECT') return 'correct'
  if (action === 'MARK_SKIP') return 'skip'
  return 'word'
}
