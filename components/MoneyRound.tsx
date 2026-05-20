'use client'

import { useState } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import Scoreboard from './Scoreboard'
import TeamNameBlock from './TeamNameBlock'
import TeamStatusBar from './TeamStatusBar'
import TimeConfigurator from './TimeConfigurator'
import WordRevealList from './WordRevealList'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function MoneyRound({ state, dispatch }: Props) {
  const { teams, cluing, lastChallenge, lastReveal } = state
  const mode = state.gameMode
  const winnerTeam: 0 | 1 = teams[0].score >= teams[1].score ? 0 : 1
  const [time, setTime] = useState(state.moneyTime)

  if (state.phase === 'money_intro') {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[#0a0d14] p-2 text-white sm:p-3 md:p-6">
        <div className="mx-auto grid h-full min-h-0 w-full min-w-0 max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] gap-2 fade-in-up sm:gap-3">

          <div className="shrink-0 text-center">
            <div className="mb-1 inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#ffd23f] text-lg font-black text-[#0a0d14] sm:h-11 sm:w-11 md:mb-2 md:h-14 md:w-14 md:text-2xl">
              $
            </div>
            <p className="mono-label mb-0.5 text-[10px] font-bold text-[#ffd23f] sm:text-xs">Final</p>
            <h2 className="mx-auto max-w-full break-words text-[clamp(1.75rem,8vw,4.5rem)] font-black uppercase leading-[0.86] text-white">{mode.money.title}</h2>
            <p className="mt-0.5 text-xs text-white/40 sm:text-sm">Winning team plays for the jackpot</p>
          </div>

          <div className="grid min-h-0 min-w-0 gap-2 overflow-hidden md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-3">
            <div className="grid min-w-0 content-start gap-2 overflow-hidden rounded-lg border border-white/10 bg-[#101522] p-2 sm:p-3 md:p-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md border border-white/10 bg-[#141826] p-2 md:p-3">
                  <div className="text-2xl font-black text-white md:text-3xl">{mode.money.wordCount}</div>
                  <div className="text-[10px] text-white/35 sm:text-xs">words to guess</div>
                </div>
                <div className="rounded-md border border-white/10 bg-[#141826] p-2 md:p-3">
                  <div className="text-2xl font-black text-white md:text-3xl">{mode.money.wordLimit}</div>
                  <div className="text-[10px] text-white/35 sm:text-xs">clue word limit</div>
                </div>
              </div>

              <TimeConfigurator
                label="Time limit"
                value={time}
                presets={mode.timing.moneyPresets}
                min={mode.timing.minSeconds}
                max={mode.timing.maxSeconds}
                ariaLabel="Custom money round time in seconds"
                compact
                onChange={setTime}
              />
            </div>

            <div className="grid min-h-0 min-w-0 content-start gap-2 overflow-hidden">
              <div className="rounded-lg border border-[#ffd23f]/20 bg-[#ffd23f]/10 p-2 text-center sm:p-3 md:p-4">
                <p className="mono-label mb-1 text-[9px] text-[#ffd23f]/80 sm:text-[10px]">Playing for</p>
                <TeamNameBlock
                  team={teams[winnerTeam]}
                  nameClassName="text-base font-black text-white sm:text-lg"
                  playersClassName="mt-1 text-[10px] font-bold leading-tight text-white/45 sm:text-xs"
                  maxPlayers={4}
                  maxChars={32}
                />
              </div>

              <TeamStatusBar
                teams={teams}
                activeTeam={winnerTeam}
                activeLabel="Money"
                caption={`${teams[winnerTeam].name} is up for the final`}
                compact
              />

              <Scoreboard teams={teams} highlight={winnerTeam} compact />
            </div>
          </div>

          <button
            onClick={() => dispatch({ type: 'ADVANCE_PHASE', moneyTime: time })}
            className="h-12 w-full shrink-0 rounded-md bg-[#ffd23f] text-sm font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 sm:h-14 sm:text-base"
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
      <div className={`flex h-dvh flex-col overflow-hidden p-2 text-white sm:p-3 md:p-6 ${won ? 'bg-[#07130d]' : 'bg-[#0a0d14]'}`}>
        <div className="mx-auto grid h-full min-h-0 w-full min-w-0 max-w-6xl grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-2 fade-in-up md:gap-3">

          <div className={`rounded-lg p-2 text-center sm:p-3 md:p-4 ${won ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#141826] border border-white/10'}`}>
            <p className="mono-label mb-1 text-[9px] text-white/45 md:text-[10px]">Money result</p>
            <div className={`mb-0.5 text-3xl font-black uppercase leading-[0.86] tracking-normal sm:text-4xl md:text-5xl ${won ? 'text-[#2de584]' : 'text-white'}`}>
              {won ? 'Jackpot!' : 'So close!'}
            </div>
            <div className="text-xs text-white/50 sm:text-sm">
              {won
                ? `${teams[winnerTeam].name} got all ${mode.money.wordCount}!`
                : `${correct}/${mode.money.wordCount} words / ${teams[winnerTeam].name} still wins`
              }
            </div>
            <TeamNameBlock
              team={teams[winnerTeam]}
              className="mt-1"
              nameClassName="sr-only"
              playersClassName="text-[10px] font-bold leading-tight text-white/35 sm:text-xs"
              maxPlayers={4}
              maxChars={32}
            />
          </div>

          <Scoreboard teams={teams} highlight={winnerTeam} compact />

          <WordRevealList
            words={revealWords}
            guessed={revealGuessed}
            definitions={revealDefinitions}
            title="Money answers"
            variant="money"
            className="h-full"
          />

          {lastChallenge && (
            <div className="max-h-16 overflow-hidden rounded-md border border-[#ffd23f]/25 bg-[#161a2b] p-2 md:max-h-20 md:p-3">
              <p className="mono-label mb-1 text-[8px] font-bold text-[#ffd23f] md:text-[9px]">{lastChallenge.label}</p>
              <p className="overflow-hidden text-[11px] leading-snug text-white/80 md:text-xs [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{lastChallenge.text}</p>
              {lastChallenge.alcoholOptional && (
                <p className="mono-label mt-1 text-[8px] text-white/35">Optional 21+ prompt / non-alcohol fallback included</p>
              )}
            </div>
          )}

          <button
            onClick={() => dispatch({ type: 'NEXT_AFTER_RESULT' })}
            className="h-12 w-full shrink-0 rounded-md bg-[#ffd23f] text-sm font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 sm:h-14 sm:text-base"
          >
            Final Scores
          </button>
        </div>
      </div>
    )
  }

  return null
}
