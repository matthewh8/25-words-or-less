'use client'

import type { GameState, GameAction } from '@/lib/gameState'
import { TEAM_COLORS } from '@/lib/teamColors'
import { useActionInterval } from '@/lib/useActionInterval'
import Timer from './Timer'
import { teamPlayerLine } from './TeamNameBlock'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function Premeditation({ state, dispatch }: Props) {
  const { cluing, teams, bid } = state
  const premeditationTimeLeft = bid?.premeditationTimeLeft ?? 0
  const total = state.gameMode.timing.premeditationSeconds

  useActionInterval(
    () => dispatch({ type: 'PREMEDITATION_TICK' }),
    premeditationTimeLeft > 0 ? 1000 : null
  )

  if (!cluing || !bid) return null

  const cluingTeam = teams[cluing.cluingTeam]
  const cluingColor = TEAM_COLORS[cluing.cluingTeam]
  const cluingPlayers = teamPlayerLine(cluingTeam.players, '', 4, 32)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#120915] text-white">

      {/* Mobile layout: header + full-height words card + pinned button */}
      <div className="flex min-h-0 flex-1 flex-col p-3 gap-3 md:hidden landscape-short:hidden">
        {/* Heading */}
        <div className="shrink-0">
          <p className="mono-label text-[10px] font-bold text-[#ff3a6d]">Premeditation</p>
          <h2 className="mt-1 text-3xl font-black uppercase leading-[0.95] tracking-normal text-white">
            <span style={{ color: cluingColor }}>{cluingTeam.name}</span>
            <span className="text-white">, plan your clues</span>
          </h2>
          {cluingPlayers && (
            <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wide text-white/45">{cluingPlayers}</p>
          )}
        </div>

        {/* Words card — fills remaining space */}
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-[#141826] p-3">
          <div className="mb-3 shrink-0 flex items-center justify-between">
            <p className="mono-label text-[10px] text-white/45">
              {cluing.words.length} words · clue limit {cluing.wordLimit}
            </p>
            <span className={`text-2xl font-black tabular-nums leading-none ${premeditationTimeLeft <= 10 ? 'text-[#ff3a6d]' : premeditationTimeLeft <= 20 ? 'text-[#ffd23f]' : 'text-white'}`}>
              {premeditationTimeLeft}<span className="ml-0.5 text-xs font-normal text-white/35">s</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {cluing.words.map((w, i) => (
              <div key={i} className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-2">
                <span className="font-mono text-[10px] text-white/35">{String(i+1).padStart(2,'0')}</span>
                <span className="min-w-0 truncate text-sm font-black uppercase tracking-normal">{w}</span>
              </div>
            ))}
          </div>
          <p className="mt-auto pt-3 text-center text-sm text-white/30">Guessers — look away.</p>
        </div>
      </div>

      {/* Mobile start button */}
      <button
        onClick={() => dispatch({ type: 'START_CLUING_NOW' })}
        className="shrink-0 mx-3 mb-3 rounded-md bg-[#ff3a6d] py-3.5 text-base font-black uppercase tracking-normal text-white transition-all hover:bg-[#ff5a84] active:scale-[0.98] md:hidden landscape-short:hidden"
      >
        Start now
      </button>

      {/* Desktop + landscape: centered layout with ring timer */}
      <div className="hidden flex-1 min-h-0 md:flex md:flex-col md:items-center md:justify-center md:overflow-hidden md:p-8 landscape-short:flex landscape-short:flex-col landscape-short:items-center landscape-short:justify-center landscape-short:overflow-hidden landscape-short:p-3">
        <div className="grid w-full max-w-3xl gap-3 fade-in-up md:gap-5 landscape-short:gap-2">
          <div className="text-center">
            <p className="mono-label text-[10px] font-bold text-[#ff3a6d] md:text-xs">Premeditation</p>
            <h2 className="mt-1 text-3xl font-black uppercase leading-[0.95] tracking-normal text-white md:text-5xl landscape-short:text-2xl">
              <span style={{ color: cluingColor }}>{cluingTeam.name}</span>
              <span className="text-white">, plan your clues</span>
            </h2>
            {cluingPlayers && (
              <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wide text-white/45 md:text-xs">{cluingPlayers}</p>
            )}
            <p className="mt-2 text-sm text-white/55 md:text-base landscape-short:mt-1 landscape-short:text-xs">
              Guessers — look away.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <Timer timeLeft={premeditationTimeLeft} total={total} size="md" landscapeShortSize="xs" />
          </div>
          <div className="rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5 landscape-short:p-2">
            <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-3 landscape-short:mb-1">
              {cluing.words.length} words · clue limit {cluing.wordLimit}
            </p>
            <div className="grid grid-cols-2 gap-1.5 md:gap-2 lg:grid-cols-1 landscape-short:grid-cols-2 landscape-short:gap-1">
              {cluing.words.map((w, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 md:gap-3 md:px-4 md:py-3 landscape-short:py-0.5 landscape-short:px-2">
                  <span className="font-mono text-[10px] text-white/35 md:text-xs">{String(i+1).padStart(2,'0')}</span>
                  <span className="min-w-0 truncate text-xs font-black uppercase tracking-normal md:text-base">{w}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'START_CLUING_NOW' })}
            className="w-full rounded-md bg-[#ff3a6d] py-3.5 text-base font-black uppercase tracking-normal text-white transition-all hover:bg-[#ff5a84] active:scale-[0.98] md:py-4 md:text-lg landscape-short:py-2 landscape-short:text-sm"
          >
            Start now
          </button>
        </div>
      </div>

    </div>
  )
}
