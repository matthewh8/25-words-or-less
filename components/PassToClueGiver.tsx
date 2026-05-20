'use client'

import type { GameState } from '@/lib/gameState'
import TeamStatusBar from './TeamStatusBar'

interface Props {
  state: GameState
  onReady: () => void
}

export default function PassToClueGiver({ state, onReady }: Props) {
  const { teams, cluing } = state
  if (!cluing) return null

  const teamName = teams[cluing.cluingTeam].name
  const roster = teams[cluing.cluingTeam].players
  const limit = cluing.wordLimit
  const wordCount = cluing.words.length
  const seconds = cluing.timeLeft

  return (
    <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#120915] p-5 text-white">
      <div className="fade-in-up flex w-full max-w-sm flex-col items-center">
      <div className="relative mb-6 flex items-center justify-center">
        <div className="absolute w-24 h-24 rounded-full bg-[#ff3a6d]/20 pulse-ring" />
        <div className="absolute w-20 h-20 rounded-full bg-[#ff3a6d]/20 pulse-ring" style={{ animationDelay: '0.4s' }} />
        <div className="w-16 h-16 rounded-md bg-[#ff3a6d] flex items-center justify-center">
          <span className="text-2xl font-black">!</span>
        </div>
      </div>

      <p className="mono-label text-[#ff3a6d] text-xs font-bold mb-3">{teamName}</p>
      <h2 className="text-5xl font-black text-white text-center leading-[0.9] tracking-normal mb-2 uppercase">
        Guessers,<br />
        <span className="text-[#ff3a6d]">eyes closed</span>
      </h2>
      <p className="text-white/40 text-sm text-center mt-2 max-w-xs">
        Everyone on <strong className="text-white/70">{teamName}</strong> except the clue giver looks away
      </p>
      {roster.length > 0 && (
        <p className="mt-3 max-h-10 max-w-sm overflow-hidden break-words text-center text-xs font-bold leading-snug text-white/35">
          {roster.join(' / ')}
        </p>
      )}

      <div className="mt-4 w-full">
        <TeamStatusBar
          teams={teams}
          activeTeam={cluing.cluingTeam}
          activeLabel="Cluing"
          caption={`${teamName} is up`}
          compact
        />
      </div>

      <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-3 rounded-md border border-white/10 bg-[#141826] p-3 text-center">
        <div>
          <div className="text-white font-black text-xl">{wordCount}</div>
          <div className="text-white/35 text-xs">words</div>
        </div>
        <div>
          <div className="text-white font-black text-xl">{limit}</div>
          <div className="text-white/35 text-xs">clue limit</div>
        </div>
        <div>
          <div className="text-white font-black text-xl">{seconds}s</div>
          <div className="text-white/35 text-xs">timer</div>
        </div>
      </div>

      <button
        onClick={onReady}
        className="mt-6 w-full max-w-xs rounded-md bg-[#ff3a6d] py-4 text-sm font-black uppercase tracking-normal text-white transition-all hover:bg-[#ff5a84] active:scale-95"
      >
        Reveal words
      </button>
      </div>
    </div>
  )
}
