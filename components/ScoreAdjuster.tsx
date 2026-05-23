'use client'

import type { GameAction } from '@/lib/gameState'

interface Props {
  teamId: 0 | 1
  teamName: string
  score: number
  dispatch: (a: GameAction) => void
  scoreClassName?: string
}

const btnClass = 'h-8 w-8 rounded-md border border-white/10 bg-white/[0.04] font-mono text-white/70 transition-colors hover:border-white/20 hover:text-white'
const defaultScoreClass = 'min-w-[2.5rem] text-center text-base font-black tabular-nums text-white md:text-lg'

export default function ScoreAdjuster({ teamId, teamName, score, dispatch, scoreClassName }: Props) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => dispatch({ type: 'ADJUST_SCORE', teamId, delta: -1 })}
        aria-label={`Decrease ${teamName} score by one`}
        className={btnClass}
      >
        −
      </button>
      <span className={scoreClassName ?? defaultScoreClass}>
        {score.toLocaleString()}
      </span>
      <button
        type="button"
        onClick={() => dispatch({ type: 'ADJUST_SCORE', teamId, delta: 1 })}
        aria-label={`Increase ${teamName} score by one`}
        className={btnClass}
      >
        +
      </button>
    </div>
  )
}
