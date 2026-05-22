'use client'

import type { GameState, GameAction } from '@/lib/gameState'
import { leadingTeam } from '@/lib/gameState'
import ChallengeCard from './ChallengeCard'
import ResultScreen from './ResultScreen'
import TeamStatusBar from './TeamStatusBar'
import WordRevealList from './WordRevealList'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function MoneyResult({ state, dispatch }: Props) {
  const { teams, moneyWon, lastReveal, lastChallenge } = state
  const mode = state.gameMode
  const winnerTeam = leadingTeam(teams)
  const tied = teams[0].score === teams[1].score
  if (!lastReveal) return null

  const correct = lastReveal.guessed.filter(Boolean).length

  const subline = moneyWon
    ? `${teams[winnerTeam].name} got all ${mode.money.wordCount}!`
    : tied
    ? `${correct}/${mode.money.wordCount} words / tied at ${teams[0].score.toLocaleString()}`
    : `${correct}/${mode.money.wordCount} words / ${teams[winnerTeam].name} still wins`

  const card = (
    <div className="flex flex-col gap-2 md:gap-3 landscape-short:min-h-0 landscape-short:overflow-hidden">
      <div className={`rounded-lg p-3 md:p-8 landscape-short:!p-3 ${moneyWon ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#141826] border border-white/10'}`}>
        <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-4 landscape-short:!mb-1">Money result</p>
        <div className={`mb-2 text-4xl font-black uppercase leading-[0.85] md:mb-4 md:text-8xl landscape-short:!mb-1 landscape-short:!text-2xl ${moneyWon ? 'text-[#2de584]' : 'text-white'}`}>
          {moneyWon ? 'Jackpot!' : 'So close!'}
        </div>
        <div className="text-sm text-white/55 md:text-lg landscape-short:!text-xs">{subline}</div>
      </div>
      {lastChallenge && <ChallengeCard challenge={lastChallenge} />}
    </div>
  )

  return (
    <ResultScreen
      layout="scroll"
      background={moneyWon ? 'jackpot' : 'default'}
      card={card}
      sidebar={
        <WordRevealList
          words={lastReveal.words}
          guessed={lastReveal.guessed}
          definitions={lastReveal.definitions}
          title="Money answers"
          variant="money"
        />
      }
      footer={
        <TeamStatusBar
          teams={teams}
          activeTeam={winnerTeam}
          activeLabel="Money"
          compact
        />
      }
      actionLabel="Final Scores"
      onAction={() => dispatch({ type: 'NEXT_AFTER_RESULT' })}
    />
  )
}
