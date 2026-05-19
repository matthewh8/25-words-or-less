'use client'

import { useEffect } from 'react'
import { GameState, GameAction } from '@/lib/gameState'
import Timer from './Timer'
import Scoreboard from './Scoreboard'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

const DIFF_META: Record<string, { label: string; dot: string }> = {
  green:  { label: 'Green',       dot: 'bg-emerald-400' },
  yellow: { label: 'Yellow',      dot: 'bg-amber-400'   },
  red:    { label: 'Red',         dot: 'bg-rose-400'    },
  bid:    { label: 'Bid Round',   dot: 'bg-[#e8774d]'   },
  money:  { label: 'Money Round', dot: 'bg-yellow-400'  },
}

export default function ClueGiverView({ state, dispatch }: Props) {
  const { cluing, teams } = state
  if (!cluing) return null

  const { words, guessed, wordsLeft, wordLimit, timeLeft, difficulty, cluingTeam, currentWordIndex } = cluing
  const meta = DIFF_META[difficulty] || DIFF_META.bid
  const timeTotal = difficulty === 'money' ? state.moneyTime : state.roundTime
  const allGuessed = guessed.every(Boolean)
  const outOfWords = wordsLeft <= 0
  const dead = timeLeft === 0 || outOfWords || allGuessed
  const correctCount = guessed.filter(Boolean).length

  // Timer tick
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TIMER_TICK' }), 1000)
    return () => clearInterval(id)
  }, [dispatch])

  // Down arrow → word used
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' && !dead) {
        e.preventDefault()
        dispatch({ type: 'WORD_USED' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, dead])

  const currentWord = words[currentWordIndex]

  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <span className="text-white/45 text-xs font-semibold uppercase tracking-widest">{meta.label}</span>
        </div>
        <Scoreboard teams={teams} compact />
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — current word + word list */}
        <div className="flex flex-col flex-1 border-r border-white/[0.06] p-4 gap-3">

          {/* Big current word */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-white/25 text-[10px] uppercase tracking-widest mb-3">
              {correctCount + 1} of {words.length}
            </p>
            {dead && !allGuessed ? (
              <p className="text-white/30 text-lg font-bold">—</p>
            ) : (
              <p
                key={currentWordIndex}
                className="text-white font-black text-4xl text-center leading-tight fade-in-up"
                style={{ fontSize: currentWord.length > 8 ? '1.8rem' : currentWord.length > 6 ? '2.2rem' : '2.8rem' }}
              >
                {currentWord}
              </p>
            )}
          </div>

          {/* Word progress dots */}
          <div className="flex gap-1.5 justify-center flex-wrap pb-1">
            {words.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  guessed[i]
                    ? 'w-2 h-2 bg-emerald-400'
                    : i === currentWordIndex && !dead
                    ? 'w-3 h-3 bg-[#e8774d]'
                    : 'w-2 h-2 bg-white/20'
                }`}
              />
            ))}
          </div>

        </div>

        {/* RIGHT — controls */}
        <div className="flex flex-col gap-3 p-4 w-[52%]">

          {/* Timer */}
          <div className="flex justify-center">
            <Timer timeLeft={timeLeft} total={timeTotal} />
          </div>

          {/* Words counter */}
          <div className="bg-[#15151e] border border-white/[0.08] rounded-xl p-3 text-center">
            <p className="text-white/30 text-[9px] uppercase tracking-widest mb-0.5">Words left</p>
            <div className={`text-3xl font-black tabular-nums ${
              wordsLeft <= 5 ? 'text-red-400' : wordsLeft <= 10 ? 'text-amber-400' : 'text-white'
            }`}>
              {wordsLeft}
              <span className="text-sm text-white/20 font-normal"> /{wordLimit}</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all ${
                  wordsLeft <= 5 ? 'bg-red-400' : wordsLeft <= 10 ? 'bg-amber-400' : 'bg-[#e8774d]'
                }`}
                style={{ width: `${(wordsLeft / wordLimit) * 100}%` }}
              />
            </div>
          </div>

          {/* −1 Word */}
          <button
            onClick={() => dispatch({ type: 'WORD_USED' })}
            disabled={dead}
            className="w-full py-3 rounded-xl bg-[#15151e] border border-white/[0.08] text-white font-black text-sm disabled:opacity-25 hover:border-white/20 active:scale-95 transition-all"
          >
            −1 Word
            <span className="text-white/25 text-[10px] block font-normal">↓ arrow key</span>
          </button>

          {/* Correct */}
          <button
            onClick={() => !dead && dispatch({ type: 'MARK_CORRECT' })}
            disabled={dead}
            className="w-full py-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black text-base disabled:opacity-25 hover:bg-emerald-500/25 active:scale-95 transition-all"
          >
            ✓ Correct
          </button>

          {/* Skip */}
          <button
            onClick={() => !dead && dispatch({ type: 'MARK_SKIP' })}
            disabled={dead}
            className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 font-bold text-sm disabled:opacity-25 hover:border-white/15 active:scale-95 transition-all"
          >
            Skip →
          </button>

          {/* Status */}
          {allGuessed && (
            <div className="text-emerald-400 text-xs font-bold text-center">All done! 🎉</div>
          )}
          {outOfWords && !allGuessed && (
            <div className="text-red-400 text-xs font-bold text-center">Out of words</div>
          )}

          <button
            onClick={() => dispatch({ type: 'END_CLUING' })}
            className="text-white/15 text-[10px] text-center hover:text-white/35 transition-colors mt-auto"
          >
            End early
          </button>

        </div>
      </div>

    </div>
  )
}
