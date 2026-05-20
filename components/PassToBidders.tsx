'use client'

import type { GameState } from '@/lib/gameState'
import TeamNameBlock from './TeamNameBlock'
import TeamStatusBar from './TeamStatusBar'

interface Props {
  state: GameState
  onReady: () => void
}

export default function PassToBidders({ state, onReady }: Props) {
  const { teams } = state
  const wordCount = state.gameMode.bidding.wordCount

  return (
    <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-5 text-white">
      <div className="fade-in-up flex w-full max-w-sm flex-col items-center">
      <div className="relative mb-6 flex items-center justify-center">
        <div className="absolute w-24 h-24 rounded-full bg-[#ffd23f]/15 pulse-ring" />
        <div className="absolute w-20 h-20 rounded-full bg-[#ffd23f]/15 pulse-ring" style={{ animationDelay: '0.4s' }} />
        <div className="w-16 h-16 rounded-md bg-[#ffd23f] text-[#0a0d14] flex items-center justify-center">
          <span className="text-2xl font-black">{String(wordCount).padStart(2, '0')}</span>
        </div>
      </div>

      <p className="mono-label text-[#ffd23f] text-xs font-bold mb-3">Bidding Round</p>
      <h2 className="text-5xl font-black text-white text-center leading-[0.9] tracking-normal mb-2 uppercase">
        Guessers,<br />
        <span className="text-[#ffd23f]">look away</span>
      </h2>
      <p className="text-white/40 text-sm text-center mt-4 max-w-xs">
        One captain from <strong className="text-white/60">{teams[0].name}</strong> and <strong className="text-white/60">{teams[1].name}</strong> stays at the screen. Everyone else looks away.
      </p>
      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        {teams.map((team, index) => (
          <div key={`${team.name}-${index}`} className="min-w-0 rounded-md border border-white/10 bg-white/[0.03] p-2 text-center">
            <TeamNameBlock
              team={team}
              nameClassName="text-xs font-black uppercase text-white/65"
              playersClassName="mt-1 text-[10px] font-bold text-white/35"
              maxPlayers={3}
            />
          </div>
        ))}
      </div>

      <div className="mt-5 w-full">
        <TeamStatusBar teams={teams} caption="Captains from both teams stay at the screen" compact />
      </div>

      <button
        onClick={onReady}
        className="mt-8 w-full max-w-xs rounded-md bg-[#ffd23f] py-4 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95"
      >
        Show words
      </button>
      </div>
    </div>
  )
}
