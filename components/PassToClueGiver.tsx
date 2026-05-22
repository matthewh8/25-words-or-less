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

  const limit = cluing.wordLimit
  const wordCount = cluing.words.length
  const seconds = cluing.timeLeft

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-hidden bg-[#120915] p-5 text-white landscape-short:p-3">
      <div className="fade-in-up flex w-full max-w-sm flex-col items-center landscape-short:max-w-md">
      <div className="relative mb-6 flex items-center justify-center landscape-short:mb-2">
        <div className="absolute w-24 h-24 rounded-full bg-[#ff3a6d]/20 pulse-ring landscape-short:!w-14 landscape-short:!h-14" />
        <div className="absolute w-20 h-20 rounded-full bg-[#ff3a6d]/20 pulse-ring landscape-short:!w-12 landscape-short:!h-12" style={{ animationDelay: '0.4s' }} />
        <div className="w-16 h-16 rounded-md bg-[#ff3a6d] flex items-center justify-center landscape-short:!w-10 landscape-short:!h-10">
          <span className="text-2xl font-black landscape-short:!text-base">!</span>
        </div>
      </div>

      <h2 className="text-5xl font-black text-white text-center leading-[0.9] tracking-normal mb-2 uppercase landscape-short:!text-2xl">
        Guessers,<br />
        <span className="text-[#ff3a6d]">eyes closed</span>
      </h2>
      <p className="text-white/40 text-sm text-center mt-2 max-w-xs landscape-short:!mt-1 landscape-short:!text-xs">
        Everyone on the cluing team except the clue giver looks away
      </p>

      <div className="mt-4 w-full landscape-short:!mt-2">
        <TeamStatusBar
          teams={teams}
          activeTeam={cluing.cluingTeam}
          activeLabel="Cluing"
          compact
        />
      </div>

      <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-3 rounded-md border border-white/10 bg-[#141826] p-3 text-center landscape-short:!mt-2 landscape-short:!p-2 landscape-short:!gap-2">
        <div>
          <div className="text-white font-black text-xl landscape-short:!text-base">{wordCount}</div>
          <div className="text-white/35 text-xs landscape-short:!text-[10px]">words</div>
        </div>
        <div>
          <div className="text-white font-black text-xl landscape-short:!text-base">{limit}</div>
          <div className="text-white/35 text-xs landscape-short:!text-[10px]">clue limit</div>
        </div>
        <div>
          <div className="text-white font-black text-xl landscape-short:!text-base">{seconds}s</div>
          <div className="text-white/35 text-xs landscape-short:!text-[10px]">timer</div>
        </div>
      </div>

      <button
        onClick={onReady}
        className="mt-6 w-full max-w-xs rounded-md bg-[#ff3a6d] py-4 text-sm font-black uppercase tracking-normal text-white transition-all hover:bg-[#ff5a84] active:scale-95 landscape-short:!mt-2 landscape-short:!py-2"
      >
        Reveal words
      </button>
      </div>
    </div>
  )
}
