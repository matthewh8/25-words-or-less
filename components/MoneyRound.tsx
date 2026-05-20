'use client'

import { useState } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import Scoreboard from './Scoreboard'
import TeamNameBlock from './TeamNameBlock'
import TeamStatusBar from './TeamStatusBar'
import TimeConfigurator from './TimeConfigurator'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function MoneyRound({ state, dispatch }: Props) {
  const { teams, cluing, lastChallenge } = state
  const mode = state.gameMode
  const winnerTeam: 0 | 1 = teams[0].score >= teams[1].score ? 0 : 1
  const [time, setTime] = useState(state.moneyTime)

  if (state.phase === 'money_intro') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-3 text-white md:p-8">
        <div className="w-full max-w-4xl fade-in-up">

          <div className="mb-4 text-center md:mb-8">
            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#ffd23f] text-xl font-black text-[#0a0d14] md:mb-4 md:h-16 md:w-16 md:text-2xl">
              $
            </div>
            <p className="mono-label mb-1 text-xs font-bold text-[#ffd23f]">Final</p>
            <h2 className="text-4xl font-black uppercase leading-[0.9] text-white md:text-6xl">{mode.money.title}</h2>
            <p className="mt-1 text-sm text-white/40">Winning team plays for the jackpot</p>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-[#141826] p-3 text-center md:mb-4 md:p-4">
            <div>
              <div className="text-white font-black text-2xl">{mode.money.wordCount}</div>
              <div className="text-white/35 text-xs">words to guess</div>
            </div>
            <div>
              <div className="text-white font-black text-2xl">{mode.money.wordLimit}</div>
              <div className="text-white/35 text-xs">clue word limit</div>
            </div>
          </div>

          <div className="mb-2 md:mb-4">
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

          <div className="mb-2 rounded-lg border border-[#ffd23f]/20 bg-[#ffd23f]/10 p-3 text-center md:mb-4 md:p-4">
            <p className="mono-label mb-1 text-[10px] text-[#ffd23f]/80">Playing for</p>
            <TeamNameBlock
              team={teams[winnerTeam]}
              nameClassName="text-lg font-black text-white"
              playersClassName="mt-1 text-xs font-bold text-white/40"
            />
          </div>

          <div className="mb-2 md:mb-4">
            <TeamStatusBar
              teams={teams}
              activeTeam={winnerTeam}
              activeLabel="Money"
              caption={`${teams[winnerTeam].name} is up for the final`}
              compact
            />
          </div>

          <Scoreboard teams={teams} highlight={winnerTeam} compact />

          <button
            onClick={() => dispatch({ type: 'ADVANCE_PHASE', moneyTime: time })}
            className="mt-3 w-full rounded-md bg-[#ffd23f] py-4 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 md:mt-5"
          >
            Start Money Round
          </button>
        </div>
      </div>
    )
  }

  if (state.phase === 'money_result') {
    const won = state.moneyWon
    const correct = cluing?.guessed.filter(Boolean).length ?? 0
    return (
      <div className={`flex h-dvh flex-col items-center justify-center overflow-hidden p-3 text-white md:p-8 ${won ? 'bg-[#07130d]' : 'bg-[#0a0d14]'}`}>
        <div className="grid h-full w-full max-w-5xl grid-rows-[auto_1fr_auto_auto_auto] gap-2 fade-in-up md:h-auto md:gap-4">

          <div className={`rounded-lg p-3 text-center md:p-6 ${won ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#141826] border border-white/10'}`}>
            <p className="mono-label mb-1 text-[10px] text-white/45 md:mb-3">Money result</p>
            <div className={`mb-1 text-4xl font-black uppercase leading-[0.9] tracking-normal md:mb-2 md:text-6xl ${won ? 'text-[#2de584]' : 'text-white'}`}>
              {won ? 'Jackpot!' : 'So close!'}
            </div>
            <div className="text-sm text-white/50">
              {won
                ? `${teams[winnerTeam].name} got all ${mode.money.wordCount}!`
                : `${correct}/${mode.money.wordCount} words / ${teams[winnerTeam].name} still wins`
              }
            </div>
            <TeamNameBlock
              team={teams[winnerTeam]}
              className="mt-2"
              nameClassName="sr-only"
              playersClassName="text-xs font-bold text-white/35"
            />
          </div>

          <TeamStatusBar
            teams={teams}
            activeTeam={winnerTeam}
            activeLabel="Finalist"
            caption={`${teams[winnerTeam].name} played the money round`}
            compact
          />

          {cluing && (
            <div className="grid min-h-0 grid-cols-2 gap-1.5 sm:grid-cols-5">
              {cluing.words.map((w, i) => (
                <div key={i} className={`min-w-0 rounded-md px-1 py-2 text-center text-[10px] font-black uppercase md:py-3 md:text-[11px] ${cluing.guessed[i] ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-[#ff3a6d]/10 text-[#ff3a6d] border border-[#ff3a6d]/20'}`}>
                  <div className="truncate">{w}</div>
                  <div className="mt-0.5 text-xs md:mt-1 md:text-sm">{cluing.guessed[i] ? '✓' : '✗'}</div>
                </div>
              ))}
            </div>
          )}

          <Scoreboard teams={teams} highlight={winnerTeam} compact />

          {lastChallenge && (
            <div className="rounded-md border border-[#ffd23f]/25 bg-[#161a2b] p-3 md:p-4">
              <p className="mono-label mb-1 text-[9px] font-bold text-[#ffd23f] md:mb-2">{lastChallenge.label}</p>
              <p className="text-xs leading-snug text-white/80 md:text-sm">{lastChallenge.text}</p>
              {lastChallenge.alcoholOptional && (
                <p className="mono-label mt-2 text-[8px] text-white/35">Optional 21+ prompt / non-alcohol fallback included</p>
              )}
            </div>
          )}

          <button
            onClick={() => dispatch({ type: 'NEXT_AFTER_RESULT' })}
            className="w-full rounded-md bg-[#ffd23f] py-4 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95"
          >
            Final Scores
          </button>
        </div>
      </div>
    )
  }

  return null
}
