'use client'

import type { GameState, GameAction } from '@/lib/gameState'
import Scoreboard from './Scoreboard'
import TeamNameBlock from './TeamNameBlock'
import TeamStatusBar from './TeamStatusBar'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function StackSelection({ state, dispatch }: Props) {
  const { teams, stackBoard, currentRound, gameMode } = state
  if (!stackBoard) return null
  const team = stackBoard.currentTeam
  const turnsLeft = stackBoard.turnsLeft
  const usedStackIds = stackBoard.usedStackIds

  return (
    <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-3 text-white md:p-8">
      <div className="w-full max-w-4xl fade-in-up">

        <div className="mb-4 flex items-center justify-between gap-4 md:mb-8">
          <div>
            <p className="mono-label text-[#ffd23f] text-xs font-bold">Round {currentRound}</p>
            <p className="text-white/40 text-xs">{turnsLeft} turn{turnsLeft !== 1 ? 's' : ''} left</p>
          </div>
          <Scoreboard teams={teams} compact />
        </div>

        <div className="mb-3 md:mb-5">
          <TeamStatusBar
            teams={teams}
            activeTeam={team}
            activeLabel="Pick now"
            caption={`${teams[team].name} is up for stack selection`}
            compact
          />
        </div>

        <TeamNameBlock
          team={teams[team]}
          className="mb-1 md:mb-2"
          nameClassName="mono-label text-[10px] text-white/45"
          playersClassName="mt-0.5 text-[10px] font-bold text-white/30"
        />
        <h2 className="mb-3 text-4xl font-black uppercase leading-[0.9] text-white md:mb-6 md:text-6xl">Pick a stack</h2>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {gameMode.stacks.options.map(stack => {
            const used = usedStackIds.includes(stack.id)
            return (
              <button
                key={stack.id}
                onClick={() => !used && dispatch({ type: 'SELECT_STACK', stackId: stack.id })}
                disabled={used}
                className={`flex min-h-36 w-full flex-col items-start justify-between gap-2 rounded-lg border px-3 py-3 text-left transition-all md:min-h-48 md:gap-4 md:px-5 md:py-5 ${
                  used ? 'cursor-not-allowed border-white/[0.05] bg-white/[0.02] opacity-30' : 'active:scale-95'
                }`}
                style={!used ? { borderColor: `${stack.color}55`, backgroundColor: `${stack.color}12` } : undefined}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: stack.color }} />
                  {used && <span className="mono-label text-white/30 text-[9px] font-normal">taken</span>}
                </div>
                <div>
                  <div className="text-xl font-black uppercase text-white md:text-3xl">{stack.label}</div>
                  <div className="mt-1 text-[10px] text-white/40 md:text-xs">
                    {stack.pointsPerWord.toLocaleString()} pts/word + {gameMode.stacks.allCorrectBonus.toLocaleString()} bonus all {gameMode.stacks.wordCount}
                  </div>
                </div>
                <div className={`text-4xl font-black md:text-6xl ${used ? 'text-white/20' : 'text-white/70'}`}>
                  {stack.pointsPerWord >= 1000 ? `${stack.pointsPerWord / 1000}k` : stack.pointsPerWord}
                </div>
              </button>
            )
          })}
        </div>

        <p className="mono-label mt-4 text-center text-[10px] text-white/25 md:mt-6">
          {gameMode.stacks.wordLimit}-word clue limit / {state.roundTime} seconds
        </p>
      </div>
    </div>
  )
}
