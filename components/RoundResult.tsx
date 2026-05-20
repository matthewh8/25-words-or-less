'use client'

import type { GameState, GameAction } from '@/lib/gameState'
import Scoreboard from './Scoreboard'
import TeamStatusBar from './TeamStatusBar'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function RoundResult({ state, dispatch }: Props) {
  const { lastResult, teams, cluing, lastChallenge } = state
  if (!lastResult || !cluing) return null

  const { points, awardTeam, allCorrect } = lastResult
  const correct = cluing.guessed.filter(Boolean).length
  const total = cluing.words.length
  const isBid = cluing.stream === 'bidding'

  const headline = isBid
    ? allCorrect ? 'Done!' : "Didn't make it"
    : allCorrect ? 'Perfect!' : `${correct} of ${total}`

  const subline = isBid
    ? allCorrect
      ? `${teams[awardTeam].name} gets +${points.toLocaleString()} pts`
      : points > 0 ? `${teams[awardTeam].name} gets +${points.toLocaleString()} pts` : 'No points awarded'
    : `+${points.toLocaleString()} pts for ${teams[awardTeam].name}`

  return (
    <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-3 text-white md:p-8">
      <div className="grid h-full w-full max-w-5xl grid-rows-[1fr_auto] gap-2 fade-in-up md:h-auto md:gap-5">
        <TeamStatusBar
          teams={teams}
          activeTeam={points > 0 ? awardTeam : lastResult.team}
          activeLabel={points > 0 ? 'Scored' : 'Last up'}
          caption={points > 0 ? `${teams[awardTeam].name} receives this result` : `${teams[lastResult.team].name} just played`}
          compact
        />

        <div className="grid min-h-0 gap-2 lg:grid-cols-[0.95fr_1.05fr] lg:gap-5">
        {/* Result hero */}
        <div className={`rounded-lg p-3 md:p-8 ${
          allCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#141826] border border-white/10'
        }`}>
          <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-4">{isBid ? 'Bid result' : 'Round result'}</p>
          <div className={`mb-2 text-4xl font-black uppercase leading-[0.85] md:mb-4 md:text-8xl ${allCorrect ? 'text-[#2de584]' : 'text-white'}`}>{headline}</div>
          <div className="text-sm text-white/55 md:text-lg">{subline}</div>
          <div className="mt-3 md:mt-6">
            <Scoreboard teams={teams} highlight={points > 0 ? awardTeam : undefined} compact />
          </div>
        </div>

        {/* Word reveal */}
        <div className="min-h-0 rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5">
        <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-3">Answers</p>
        <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5 lg:grid-cols-1 md:mb-4 md:gap-2">
          {cluing.words.map((w, i) => (
            <div
              key={i}
              className={`flex min-w-0 items-center justify-between gap-2 rounded-md px-2 py-2 text-xs font-black uppercase md:px-3 md:py-3 md:text-sm ${
                cluing.guessed[i]
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                  : 'bg-[#ff3a6d]/10 text-[#ff3a6d] border border-[#ff3a6d]/20'
              }`}
            >
              <span className="shrink-0 font-mono text-[10px] opacity-50 md:text-xs">0{i + 1}</span>
              <span className="min-w-0 truncate">{w}</span>
              <span>{cluing.guessed[i] ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>

        {lastChallenge && (
          <div className="mt-2 rounded-md border border-[#ffd23f]/25 bg-[#161a2b] p-3 md:mt-4 md:p-4">
            <p className="mono-label mb-1 text-[9px] font-bold text-[#ffd23f] md:mb-2">{lastChallenge.label}</p>
            <p className="text-xs leading-snug text-white/80 md:text-sm">{lastChallenge.text}</p>
            {lastChallenge.alcoholOptional && (
              <p className="mono-label mt-2 text-[8px] text-white/35">Optional 21+ prompt / non-alcohol fallback included</p>
            )}
          </div>
        )}
        </div>
        </div>

        <button
          onClick={() => dispatch({ type: 'NEXT_AFTER_RESULT' })}
          className="w-full rounded-md bg-[#ffd23f] py-3.5 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 md:py-4"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
