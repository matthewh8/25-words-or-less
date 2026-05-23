'use client'

import type { GameState, GameAction } from '@/lib/gameState'
import ChallengeCard from './ChallengeCard'
import ResultScreen from './ResultScreen'
import ScoreAdjuster from './ScoreAdjuster'
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
    <div className="flex flex-col gap-2 md:gap-3 landscape-short:min-h-0 landscape-short:overflow-hidden">
      <div className={`rounded-lg p-3 md:p-8 landscape-short:p-3 ${
        allCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#141826] border border-white/10'
      }`}>
        <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-4 landscape-short:mb-1">{isBid ? 'Bid result' : 'Round result'}</p>
        <div className={`mb-2 text-4xl font-black uppercase leading-[0.85] md:mb-4 md:text-8xl landscape-short:mb-1 landscape-short:text-2xl ${allCorrect ? 'text-[#2de584]' : 'text-white'}`}>{headline}</div>
        <div className="text-sm text-white/55 md:text-lg landscape-short:text-xs">{subline}</div>
      </div>
      <div className="rounded-lg border border-white/10 bg-[#141826] p-3 md:p-4 landscape-short:p-2">
        <p className="mono-label mb-2 text-[10px] text-white/45 landscape-short:mb-1">Adjust scores</p>
        <div className="flex flex-col gap-1.5">
          {teams.map((team, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-bold text-white/70 md:text-base">{team.name}</span>
              <ScoreAdjuster teamId={i as 0 | 1} teamName={team.name} score={team.score} dispatch={dispatch} />
            </div>
          ))}
        </div>
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
