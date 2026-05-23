'use client'

import { useState } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import TeamStatusBar from './TeamStatusBar'
import TimeConfigurator from './TimeConfigurator'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function RoundIntro({ state, dispatch }: Props) {
  const { teams, currentRound, gameMode } = state
  const [time, setTime] = useState(state.roundTime)
  const isBiddingRound = currentRound === 1
  const stackRound = gameMode.stacks.rounds.find(round => round.number === currentRound)
  const activeTeam = isBiddingRound ? undefined : stackRound?.startTeam
  const info = isBiddingRound
    ? {
        number: '01',
        title: gameMode.bidding.title,
        icon: 'BID',
        bullets: [
          `Both teams see ${gameMode.bidding.wordCount} words`,
          `Bid down from ${gameMode.bidding.maxBid}; bidding ends when someone takes ${gameMode.bidding.wordCount} or the other team concedes`,
          `All correct gives the cluing team ${gameMode.bidding.successPoints.toLocaleString()} pts; a miss gives the other team ${gameMode.bidding.failurePoints.toLocaleString()} pts`,
        ],
      }
    : {
        number: String(currentRound).padStart(2, '0'),
        title: gameMode.stacks.title,
        icon: 'STK',
        bullets: [
          `Teams alternate across ${stackRound?.turns ?? 3} turns`,
          gameMode.stacks.options.map(stack => `${stack.label} ${stack.pointsPerWord.toLocaleString()}`).join(' / '),
          `All ${gameMode.stacks.wordCount} correct adds ${gameMode.stacks.allCorrectBonus.toLocaleString()} pts; clue limit is ${gameMode.stacks.wordLimit}`,
        ],
      }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0d14] text-white">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 md:flex md:flex-col md:items-center md:justify-center md:p-8 landscape-short:p-3">
        <div className="mx-auto w-full max-w-5xl fade-in-up">

          <div className="mb-3 flex items-center gap-3 md:mb-8 md:gap-4 landscape-short:mb-2 landscape-short:gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[#ffd23f] text-sm font-black text-[#0a0d14] md:h-16 md:w-16 md:text-base landscape-short:h-10 landscape-short:w-10 landscape-short:text-xs">
              {info.icon}
            </div>
            <div>
              <div className="mono-label text-[#ffd23f] text-xs font-bold">Round {info.number}</div>
              <div className="text-4xl font-black uppercase leading-[0.9] text-white md:text-5xl landscape-short:text-2xl">{info.title}</div>
            </div>
          </div>

          <div className={`grid gap-2 md:gap-5 landscape-short:gap-3 ${
            isBiddingRound ? '' : 'lg:grid-cols-[1fr_360px] landscape-short:grid-cols-[1fr_280px]'
          }`}>
            <div className="space-y-2 rounded-lg border border-white/10 bg-[#141826] p-3 md:space-y-3 md:p-5 landscape-short:space-y-1 landscape-short:p-2">
              {info.bullets.map((bullet, i) => (
                <div key={bullet} className="flex items-start gap-3 border-b border-white/10 pb-2 last:border-b-0 last:pb-0 md:gap-4 md:pb-3 landscape-short:gap-2 landscape-short:pb-1">
                  <div className="mono-label text-[10px] text-[#ffd23f] shrink-0">0{i + 1}</div>
                  <p className="text-sm leading-snug text-white/72 md:text-base landscape-short:text-xs">{bullet}</p>
                </div>
              ))}
            </div>

            {!isBiddingRound && (
              <TimeConfigurator
                label="Time per turn"
                value={time}
                presets={gameMode.timing.turnPresets}
                min={gameMode.timing.minSeconds}
                max={gameMode.timing.maxSeconds}
                ariaLabel="Custom turn time in seconds"
                onChange={setTime}
              />
            )}
          </div>

          <div className="mt-2 md:mt-5 landscape-short:mt-2">
            <TeamStatusBar
              teams={teams}
              activeTeam={activeTeam}
              activeLabel="Starts"
              caption={isBiddingRound ? 'Both captains bid this round' : 'Picks first this round'}
              compact
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-3 pt-2 md:px-8 md:pb-8 md:pt-3 landscape-short:px-3 landscape-short:pb-3 landscape-short:pt-2">
        <button
          onClick={() => dispatch({ type: 'ADVANCE_PHASE', ...(isBiddingRound ? {} : { roundTime: time }) })}
          className="w-full rounded-md bg-[#ffd23f] py-3.5 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-[0.98] md:py-4 md:text-lg landscape-short:py-2 landscape-short:text-sm"
        >
          Start Round {info.number}
        </button>
      </div>
    </div>
  )
}
