'use client'

import { useState } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import TeamStatusBar from './TeamStatusBar'
import TimeConfigurator from './TimeConfigurator'
import WordRevealList from './WordRevealList'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function MoneyRound({ state, dispatch }: Props) {
  const { teams, cluing, lastReveal } = state
  const mode = state.gameMode
  const winnerTeam: 0 | 1 = teams[0].score >= teams[1].score ? 0 : 1
  const [time, setTime] = useState(state.moneyTime)

  if (state.phase === 'money_intro') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-3 text-white md:p-8">
        <div className="w-full max-w-5xl fade-in-up">

          <div className="mb-3 flex items-center gap-3 md:mb-8 md:gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[#ffd23f] text-lg font-black text-[#0a0d14] md:h-16 md:w-16 md:text-2xl">
              $
            </div>
            <div>
              <div className="mono-label text-[#ffd23f] text-xs font-bold">Final</div>
              <div className="text-4xl font-black uppercase leading-[0.9] text-white md:text-5xl">{mode.money.title}</div>
            </div>
          </div>

          <div className="grid gap-2 md:gap-5 lg:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5">
              <div className="grid grid-cols-2 gap-2 text-center md:gap-3">
                <div className="rounded-md border border-white/10 bg-[#0f1320] p-2 md:p-3">
                  <div className="text-2xl font-black text-white md:text-3xl">{mode.money.wordCount}</div>
                  <div className="text-[10px] text-white/35 md:text-xs">words to guess</div>
                </div>
                <div className="rounded-md border border-white/10 bg-[#0f1320] p-2 md:p-3">
                  <div className="text-2xl font-black text-white md:text-3xl">{mode.money.wordLimit}</div>
                  <div className="text-[10px] text-white/35 md:text-xs">clue word limit</div>
                </div>
              </div>
            </div>

            <TimeConfigurator
              label="Time limit"
              value={time}
              presets={mode.timing.moneyPresets}
              min={mode.timing.minSeconds}
              max={mode.timing.maxSeconds}
              ariaLabel="Custom money round time in seconds"
              onChange={setTime}
            />
          </div>

          <div className="mt-2 md:mt-5">
            <TeamStatusBar
              teams={teams}
              activeTeam={winnerTeam}
              activeLabel="Money"
              caption="Playing for the jackpot"
              compact
            />
          </div>

          <button
            onClick={() => dispatch({ type: 'ADVANCE_PHASE', moneyTime: time })}
            className="mt-2 w-full rounded-md bg-[#ffd23f] py-3.5 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-[0.98] md:mt-5 md:py-4 md:text-lg"
          >
            Start Money Round
          </button>
        </div>
      </div>
    )
  }

  if (state.phase === 'money_result') {
    const won = state.moneyWon
    const revealWords = lastReveal?.words ?? cluing?.words ?? []
    const revealGuessed = lastReveal?.guessed ?? cluing?.guessed ?? []
    const revealDefinitions = lastReveal?.definitions ?? cluing?.definitions
    const correct = revealGuessed.filter(Boolean).length
    return (
      <div className={`flex h-dvh flex-col items-center justify-center overflow-hidden p-3 text-white md:p-8 ${won ? 'bg-[#07130d]' : 'bg-[#0a0d14]'}`}>
        <div className="w-full max-w-5xl fade-in-up">
          <div className="grid gap-2 md:gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className={`rounded-lg p-3 md:p-8 ${won ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#141826] border border-white/10'}`}>
              <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-4">Money result</p>
              <div className={`mb-2 text-4xl font-black uppercase leading-[0.85] md:mb-4 md:text-8xl ${won ? 'text-[#2de584]' : 'text-white'}`}>
                {won ? 'Jackpot!' : 'So close!'}
              </div>
              <div className="text-sm text-white/55 md:text-lg">
                {won
                  ? `${teams[winnerTeam].name} got all ${mode.money.wordCount}!`
                  : `${correct}/${mode.money.wordCount} words / ${teams[winnerTeam].name} still wins`
                }
              </div>
            </div>

            <WordRevealList
              words={revealWords}
              guessed={revealGuessed}
              definitions={revealDefinitions}
              title="Money answers"
              variant="money"
            />
          </div>

          <div className="mt-2 md:mt-5">
            <TeamStatusBar
              teams={teams}
              activeTeam={winnerTeam}
              activeLabel="Money"
              compact
            />
          </div>

          <button
            onClick={() => dispatch({ type: 'NEXT_AFTER_RESULT' })}
            className="mt-2 w-full rounded-md bg-[#ffd23f] py-3.5 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 md:mt-5 md:py-4"
          >
            Final Scores
          </button>
        </div>
      </div>
    )
  }

  return null
}
