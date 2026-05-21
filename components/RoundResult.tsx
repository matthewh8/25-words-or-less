'use client'

import type { GameState, GameAction } from '@/lib/gameState'
import ChallengeCard from './ChallengeCard'
import ResultScreen from './ResultScreen'
import TeamStatusBar from './TeamStatusBar'
import WordRevealList from './WordRevealList'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function RoundResult({ state, dispatch }: Props) {
  const { lastResult, lastReveal, lastChallenge, teams } = state
  if (!lastResult || !lastReveal) return null

  const { points, awardTeam, allCorrect } = lastResult
  const correct = lastReveal.guessed.filter(Boolean).length
  const total = lastReveal.words.length
  const isBid = lastReveal.stream === 'bidding'

  const headline = isBid
    ? allCorrect ? 'Done!' : "Didn't make it"
    : allCorrect ? 'Perfect!' : `${correct} of ${total}`

  const subline = isBid
    ? points > 0 ? `${teams[awardTeam].name} gets +${points.toLocaleString()} pts` : 'No points awarded'
    : `+${points.toLocaleString()} pts for ${teams[awardTeam].name}`

  const card = (
    <div className="flex flex-col gap-2 md:gap-3">
      <div className={`rounded-lg p-3 md:p-8 ${
        allCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#141826] border border-white/10'
      }`}>
        <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-4">{isBid ? 'Bid result' : 'Round result'}</p>
        <div className={`mb-2 text-4xl font-black uppercase leading-[0.85] md:mb-4 md:text-8xl ${allCorrect ? 'text-[#2de584]' : 'text-white'}`}>{headline}</div>
        <div className="text-sm text-white/55 md:text-lg">{subline}</div>
      </div>
      {lastChallenge && <ChallengeCard challenge={lastChallenge} />}
    </div>
  )

  return (
    <ResultScreen
      card={card}
      sidebar={
        <WordRevealList
          words={lastReveal.words}
          guessed={lastReveal.guessed}
          definitions={lastReveal.definitions}
          title="Answers"
        />
      }
      footer={
        <TeamStatusBar
          teams={teams}
          activeTeam={points > 0 ? awardTeam : lastResult.team}
          activeLabel={points > 0 ? 'Scored' : 'Last up'}
          compact
        />
      }
      actionLabel="Continue"
      onAction={() => dispatch({ type: 'NEXT_AFTER_RESULT' })}
    />
  )
}
