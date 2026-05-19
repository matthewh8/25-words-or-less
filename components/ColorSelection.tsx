'use client'

import { GameState, GameAction } from '@/lib/gameState'
import { Difficulty } from '@/lib/words'
import Scoreboard from './Scoreboard'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

const STACKS: {
  difficulty: Difficulty
  label: string
  pts: string
  ptsNum: string
  activeBg: string
  usedBg: string
  dot: string
}[] = [
  {
    difficulty: 'green',
    label: 'Green',
    pts: '250 pts/word',
    ptsNum: '250',
    activeBg: 'bg-emerald-500/10 border-emerald-500/25 hover:border-emerald-400/50 active:scale-95',
    usedBg: 'bg-white/[0.02] border-white/[0.05] opacity-30 cursor-not-allowed',
    dot: 'bg-emerald-400',
  },
  {
    difficulty: 'yellow',
    label: 'Yellow',
    pts: '500 pts/word',
    ptsNum: '500',
    activeBg: 'bg-amber-500/10 border-amber-500/25 hover:border-amber-400/50 active:scale-95',
    usedBg: 'bg-white/[0.02] border-white/[0.05] opacity-30 cursor-not-allowed',
    dot: 'bg-amber-400',
  },
  {
    difficulty: 'red',
    label: 'Red',
    pts: '1,000 pts/word',
    ptsNum: '1k',
    activeBg: 'bg-rose-500/10 border-rose-500/25 hover:border-rose-400/50 active:scale-95',
    usedBg: 'bg-white/[0.02] border-white/[0.05] opacity-30 cursor-not-allowed',
    dot: 'bg-rose-400',
  },
]

export default function ColorSelection({ state, dispatch }: Props) {
  const { teams, colorBoard, currentRound } = state
  if (!colorBoard) return null
  const team = colorBoard.currentTeam
  const turnsLeft = colorBoard.turnsLeft
  const usedColors = colorBoard.usedColors

  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center p-5 fade-in-up">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[#e8774d] text-xs uppercase tracking-[0.2em] font-bold">Round {currentRound}</p>
            <p className="text-white/40 text-xs">{turnsLeft} turn{turnsLeft !== 1 ? 's' : ''} left</p>
          </div>
          <Scoreboard teams={teams} compact />
        </div>

        <p className="text-white/50 text-sm mb-1">{teams[team].name}</p>
        <h2 className="text-2xl font-black text-white mb-5">Pick a stack</h2>

        <div className="space-y-2.5">
          {STACKS.map(({ difficulty, label, pts, ptsNum, activeBg, usedBg, dot }) => {
            const used = usedColors.includes(difficulty)
            return (
              <button
                key={difficulty}
                onClick={() => !used && dispatch({ type: 'SELECT_COLOR', difficulty })}
                disabled={used}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${used ? usedBg : activeBg}`}
              >
                <div className={`w-3 h-3 rounded-full ${dot} shrink-0 ${used ? 'grayscale' : ''}`} />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-base">{label}</span>
                    {used && <span className="text-white/30 text-xs font-normal">taken</span>}
                  </div>
                  <div className="text-white/40 text-xs">{pts} + 1,000 bonus all 5</div>
                </div>
                <div className={`font-black text-lg ${used ? 'text-white/20' : 'text-white/60'}`}>{ptsNum}</div>
              </button>
            )
          })}
        </div>

        <p className="text-white/20 text-xs text-center mt-5">20-word clue limit · 45 seconds</p>
      </div>
    </div>
  )
}
