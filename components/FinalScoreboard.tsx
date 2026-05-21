'use client'

import type { GameState } from '@/lib/gameState'
import TeamNameBlock, { teamPlayerLine } from './TeamNameBlock'
import TeamStatusBar from './TeamStatusBar'

interface Props {
  state: GameState
  onRestart: () => void
}

export default function FinalScoreboard({ state, onRestart }: Props) {
  const { teams, moneyWon } = state
  const winner: 0 | 1 = teams[0].score >= teams[1].score ? 0 : 1
  const tied = teams[0].score === teams[1].score

  const sorted = [...teams]
    .map((t, i) => ({ ...t, index: i as 0 | 1 }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-3 text-white sm:p-4 md:p-8">
      <div className="min-h-0 w-full max-w-4xl fade-in-up">

        <div className="mb-4 text-center md:mb-8">
          <p className="mono-label mb-2 text-xs font-bold text-[#ffd23f] md:mb-3">Game Over</p>
          <h2 className="text-4xl font-black uppercase leading-[0.9] tracking-normal text-white md:text-6xl">
            {tied ? "It's a tie!" : (
              <>
                <span className="block truncate">{teams[winner].name}</span>
                <span className="block">wins!</span>
              </>
            )}
          </h2>
          {!tied && (
            <p className="mt-2 truncate text-xs font-bold text-white/40 md:text-sm">
              {teamPlayerLine(teams[winner].players, 'No players assigned', 5, 36)}
            </p>
          )}
          {moneyWon && (
            <p className="text-[#ffd23f]/80 text-sm mt-3">Money Round jackpot</p>
          )}
        </div>

        <div className="mb-4 md:mb-6">
          <TeamStatusBar
            teams={teams}
            activeTeam={tied ? undefined : winner}
            activeLabel="Winner"
            compact
          />
        </div>

        <div className="mb-4 grid gap-2 md:mb-8 md:grid-cols-2 md:gap-3">
          {sorted.map(({ score, index, ...team }, rank) => (
            <div
              key={index}
              className={`flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-3 transition-all sm:px-4 sm:py-4 md:px-5 md:py-6 ${
                rank === 0 && !tied
                  ? 'bg-[#ffd23f]/10 border border-[#ffd23f]/30'
                  : 'bg-[#141826] border border-white/10'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${index === 0 ? 'bg-[#ff3a6d]' : 'bg-[#3a8bff]'}`} />
                <TeamNameBlock
                  team={team}
                  nameClassName={`text-lg font-black uppercase tracking-normal sm:text-xl md:text-2xl ${rank === 0 && !tied ? 'text-[#ffd23f]' : 'text-white'}`}
                  playersClassName="mt-0.5 text-[10px] font-bold text-white/35 md:text-xs"
                  maxChars={34}
                />
              </div>
              <span className="shrink-0 text-3xl font-black tabular-nums tracking-normal text-white sm:text-4xl md:text-5xl">{score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="w-full rounded-md bg-[#ffd23f] py-4 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95"
        >
          Play Again
        </button>
      </div>
    </div>
  )
}
