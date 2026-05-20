'use client'

import { useState } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import Scoreboard from './Scoreboard'
import TimeConfigurator from './TimeConfigurator'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function RoundIntro({ state, dispatch }: Props) {
  const { teams, currentRound, gameMode } = state
  const [time, setTime] = useState(state.roundTime)
  const isBiddingRound = currentRound === 1
  const info = isBiddingRound
    ? {
        number: '01',
        title: gameMode.bidding.title,
        icon: 'BID',
        bullets: [
          `Both teams see ${gameMode.bidding.wordCount} words`,
          `Bid down from ${gameMode.bidding.maxBid}; minimum bid is ${gameMode.bidding.minBid}`,
          `All correct gives ${gameMode.bidding.successPoints.toLocaleString()} pts; a miss gives ${gameMode.bidding.failurePoints.toLocaleString()} pts to the configured failure side`,
        ],
      }
    : {
        number: String(currentRound).padStart(2, '0'),
        title: gameMode.stacks.title,
        icon: 'STK',
        bullets: [
          `Teams alternate across ${gameMode.stacks.rounds.find(round => round.number === currentRound)?.turns ?? 3} turns`,
          gameMode.stacks.options.map(stack => `${stack.label} ${stack.pointsPerWord.toLocaleString()}`).join(' / '),
          `All ${gameMode.stacks.wordCount} correct adds ${gameMode.stacks.allCorrectBonus.toLocaleString()} pts; clue limit is ${gameMode.stacks.wordLimit}`,
        ],
      }

  return (
    <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-3 text-white md:p-8">
      <div className="w-full max-w-5xl fade-in-up">

        <div className="mb-3 flex items-center gap-3 md:mb-8 md:gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[#ffd23f] text-sm font-black text-[#0a0d14] md:h-16 md:w-16 md:text-base">
            {info.icon}
          </div>
          <div>
            <div className="mono-label text-[#ffd23f] text-xs font-bold">Round {info.number}</div>
            <div className="text-4xl font-black uppercase leading-[0.9] text-white md:text-5xl">{info.title}</div>
          </div>
        </div>

        <div className="grid gap-2 md:gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-2 rounded-lg border border-white/10 bg-[#141826] p-3 md:space-y-3 md:p-5">
            {info.bullets.map((bullet, i) => (
              <div key={bullet} className="flex items-start gap-3 border-b border-white/10 pb-2 last:border-b-0 last:pb-0 md:gap-4 md:pb-3">
                <div className="mono-label text-[10px] text-[#ffd23f] shrink-0">0{i + 1}</div>
                <p className="text-sm leading-snug text-white/72 md:text-base">{bullet}</p>
              </div>
            ))}
          </div>

          <TimeConfigurator
            label="Time per turn"
            value={time}
            presets={gameMode.timing.turnPresets}
            min={gameMode.timing.minSeconds}
            max={gameMode.timing.maxSeconds}
            ariaLabel="Custom turn time in seconds"
            onChange={setTime}
          />
        </div>

        <div className="mt-2 md:mt-5">
          <Scoreboard teams={teams} compact />
        </div>

        <button
          onClick={() => dispatch({ type: 'ADVANCE_PHASE', roundTime: time })}
          className="mt-2 w-full rounded-md bg-[#ffd23f] py-3.5 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-[0.98] md:mt-5 md:py-4 md:text-lg"
        >
          Start Round {info.number}
        </button>
      </div>
    </div>
  )
}
