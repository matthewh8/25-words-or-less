'use client'

import { useMemo } from 'react'
import { GameState, GameAction } from '@/lib/gameState'
import { getChallenge, ChallengeContext } from '@/lib/challenges'
import Scoreboard from './Scoreboard'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function RoundResult({ state, dispatch }: Props) {
  const { lastResult, teams, cluing } = state
  if (!lastResult || !cluing) return null

  const { points, team, allCorrect } = lastResult
  const correct = cluing.guessed.filter(Boolean).length
  const total = cluing.words.length
  const isBid = cluing.difficulty === 'bid'
  const other: 0 | 1 = team === 0 ? 1 : 0

  const headline = isBid
    ? allCorrect ? 'Done!' : "Didn't make it"
    : allCorrect ? 'Perfect!' : `${correct} of ${total}`

  const subline = isBid
    ? allCorrect
      ? `${teams[team].name} gets +1,000 pts`
      : `${teams[other].name} gets +500 pts`
    : `+${points.toLocaleString()} pts for ${teams[team].name}`

  const ctx: ChallengeContext = isBid && !allCorrect ? 'bid_fail' : allCorrect ? 'perfect' : 'partial'
  // Stable per render — only recalculated when result changes
  const challenge = useMemo(() => getChallenge(ctx), [ctx, points, team]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center p-5 fade-in-up">
      <div className="w-full max-w-sm">

        {/* Result hero */}
        <div className={`rounded-2xl p-5 text-center mb-4 ${
          allCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.04] border border-white/[0.08]'
        }`}>
          <div className="text-4xl mb-2">{allCorrect ? '🎉' : correct === 0 ? '😬' : '👏'}</div>
          <div className={`text-3xl font-black mb-0.5 ${allCorrect ? 'text-emerald-400' : 'text-white'}`}>{headline}</div>
          <div className="text-white/50 text-sm">{subline}</div>
        </div>

        {/* Word reveal */}
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {cluing.words.map((w, i) => (
            <div
              key={i}
              className={`rounded-xl py-3 px-1 text-center text-[11px] font-black ${
                cluing.guessed[i]
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                  : 'bg-red-500/10 text-red-400/80 border border-red-500/20'
              }`}
            >
              {w}
              <div className="text-sm mt-1">{cluing.guessed[i] ? '✓' : '✗'}</div>
            </div>
          ))}
        </div>

        <Scoreboard teams={teams} highlight={allCorrect ? team : isBid && !allCorrect ? other : undefined} />

        {/* Shot moment */}
        <div className="mt-4 bg-[#1e1410] border border-[#e8774d]/25 rounded-xl p-4">
          <p className="text-[#e8774d] text-[9px] uppercase tracking-[0.2em] font-bold mb-2">🥃 Shot Moment</p>
          <p className="text-white/80 text-sm leading-snug">
            <span className="mr-1.5">{challenge.emoji}</span>{challenge.text}
          </p>
        </div>

        <button
          onClick={() => dispatch({ type: 'NEXT_AFTER_RESULT' })}
          className="mt-4 w-full py-4 rounded-xl bg-[#e8774d] text-white font-black text-base tracking-wide hover:bg-[#d9663b] active:scale-95 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
