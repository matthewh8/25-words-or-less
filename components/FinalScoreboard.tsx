'use client'

import type { GameState } from '@/lib/gameState'
import { leadingTeam } from '@/lib/gameState'
import ResultScreen from './ResultScreen'
import TeamNameBlock from './TeamNameBlock'
import { TEAM_COLORS } from '@/lib/teamColors'

interface Props {
  state: GameState
  onRestart: () => void
}

export default function FinalScoreboard({ state, onRestart }: Props) {
  const { teams, moneyWon } = state
  const winner = leadingTeam(teams)
  const tied = teams[0].score === teams[1].score

  const sorted = [...teams]
    .map((t, i) => ({ ...t, index: i as 0 | 1 }))
    .sort((a, b) => b.score - a.score)

  const headline = tied ? 'Tie game' : `${teams[winner].name} wins!`
  const subline = tied
    ? `Both teams ended with ${teams[0].score.toLocaleString()} pts`
    : `${teams[winner].score.toLocaleString()} pts to ${teams[1 - winner].score.toLocaleString()} pts`

  const card = (
    <div className={`rounded-lg p-3 md:p-8 ${
      moneyWon ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#ffd23f]/10 border border-[#ffd23f]/30'
    }`}>
      <p className="mono-label mb-2 text-[10px] text-[#ffd23f] md:mb-4">Game over</p>
      <div className={`mb-2 text-4xl font-black uppercase leading-[0.85] md:mb-4 md:text-7xl ${
        moneyWon ? 'text-[#2de584]' : 'text-white'
      }`}>
        {headline}
      </div>
      <div className="text-sm text-white/55 md:text-lg">{subline}</div>
      {moneyWon && (
        <p className="mt-2 text-xs font-bold text-[#ffd23f] md:mt-3 md:text-sm">+ Money Round jackpot</p>
      )}
    </div>
  )

  const sidebar = (
    <section className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5">
      <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-3">Standings</p>
      <div className="panel-scroll grid min-h-0 flex-1 max-h-[44vh] grid-cols-1 gap-2 overflow-y-auto pr-1 md:gap-3">
        {sorted.map(({ score, index, ...team }, rank) => {
          const isWinner = rank === 0 && !tied
          return (
            <article
              key={index}
              className={`flex min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-3 md:px-4 md:py-4 ${
                isWinner
                  ? 'border-[#ffd23f]/30 bg-[#ffd23f]/10'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TEAM_COLORS[index] }} />
                <TeamNameBlock
                  team={team}
                  nameClassName={`text-base font-black uppercase tracking-normal md:text-xl ${isWinner ? 'text-[#ffd23f]' : 'text-white'}`}
                  playersClassName="mt-0.5 text-[10px] font-bold text-white/40 md:text-[11px]"
                  maxChars={30}
                />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isWinner && (
                  <span className="rounded-sm bg-[#ffd23f] px-1.5 py-0.5 text-[8px] font-black uppercase text-[#0a0d14]">
                    Winner
                  </span>
                )}
                <span className={`text-2xl font-black tabular-nums tracking-normal md:text-3xl ${isWinner ? 'text-[#ffd23f]' : 'text-white'}`}>
                  {score.toLocaleString()}
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )

  return (
    <ResultScreen
      layout="scroll"
      card={card}
      sidebar={sidebar}
      actionLabel="Play Again"
      onAction={onRestart}
    />
  )
}
