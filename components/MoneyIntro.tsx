'use client'

import { useState } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import { leadingTeam } from '@/lib/gameState'
import TeamStatusBar from './TeamStatusBar'
import TimeConfigurator from './TimeConfigurator'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function MoneyIntro({ state, dispatch }: Props) {
  const { teams } = state
  const mode = state.gameMode
  const winnerTeam = leadingTeam(teams)
  const [time, setTime] = useState(state.moneyTime)

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-3 text-white md:p-8 landscape-short:!p-3">
      <div className="w-full max-w-5xl fade-in-up">

        <div className="mb-3 flex items-center gap-3 md:mb-8 md:gap-4 landscape-short:!mb-2">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[#ffd23f] text-lg font-black text-[#0a0d14] md:h-16 md:w-16 md:text-2xl landscape-short:!h-10 landscape-short:!w-10 landscape-short:!text-base">
            $
          </div>
          <div>
            <div className="mono-label text-[#ffd23f] text-xs font-bold">Final</div>
            <div className="text-4xl font-black uppercase leading-[0.9] text-white md:text-5xl landscape-short:!text-2xl">{mode.money.title}</div>
          </div>
        </div>

        <div className="grid gap-2 md:gap-5 lg:grid-cols-[1fr_360px] landscape-short:grid-cols-[1fr_280px] landscape-short:gap-3">
          <div className="rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5 landscape-short:!p-2">
            <div className="grid grid-cols-2 gap-2 text-center md:gap-3 landscape-short:!gap-2">
              <div className="rounded-md border border-white/10 bg-[#0f1320] p-2 md:p-3 landscape-short:!p-2">
                <div className="text-2xl font-black text-white md:text-3xl landscape-short:!text-lg">{mode.money.wordCount}</div>
                <div className="text-[10px] text-white/35 md:text-xs">words to guess</div>
              </div>
              <div className="rounded-md border border-white/10 bg-[#0f1320] p-2 md:p-3 landscape-short:!p-2">
                <div className="text-2xl font-black text-white md:text-3xl landscape-short:!text-lg">{mode.money.wordLimit}</div>
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

        <div className="mt-2 md:mt-5 landscape-short:!mt-2">
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
          className="mt-2 w-full rounded-md bg-[#ffd23f] py-3.5 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-[0.98] md:mt-5 md:py-4 md:text-lg landscape-short:!mt-2 landscape-short:!py-2 landscape-short:!text-sm"
        >
          Start Money Round
        </button>
      </div>
    </div>
  )
}
