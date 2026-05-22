'use client'

import type { GameState } from '@/lib/gameState'
import TeamStatusBar from './TeamStatusBar'

interface Props {
  state: GameState
  onReady: () => void
}

export default function PassToBidders({ state, onReady }: Props) {
  const { teams } = state
  const wordCount = state.gameMode.bidding.wordCount

  return (
    <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-5 text-white landscape-short:p-3">
      <div className="fade-in-up flex w-full max-w-sm flex-col items-center landscape-short:max-w-md">
      <div className="relative mb-6 flex items-center justify-center landscape-short:mb-2">
        <div className="absolute w-24 h-24 rounded-full bg-[#ffd23f]/15 pulse-ring landscape-short:!w-14 landscape-short:!h-14" />
        <div className="absolute w-20 h-20 rounded-full bg-[#ffd23f]/15 pulse-ring landscape-short:!w-12 landscape-short:!h-12" style={{ animationDelay: '0.4s' }} />
        <div className="w-16 h-16 rounded-md bg-[#ffd23f] text-[#0a0d14] flex items-center justify-center landscape-short:!w-10 landscape-short:!h-10">
          <span className="text-2xl font-black landscape-short:!text-base">{String(wordCount).padStart(2, '0')}</span>
        </div>
      </div>

      <p className="mono-label text-[#ffd23f] text-xs font-bold mb-3 landscape-short:mb-1">Bidding Round</p>
      <h2 className="text-5xl font-black text-white text-center leading-[0.9] tracking-normal mb-2 uppercase landscape-short:!text-2xl">
        Guessers,<br />
        <span className="text-[#ffd23f]">look away</span>
      </h2>
      <p className="text-white/40 text-sm text-center mt-4 max-w-xs landscape-short:!mt-2 landscape-short:!text-xs">
        One captain from each team stays at the screen. Everyone else looks away.
      </p>

      <div className="mt-5 w-full landscape-short:!mt-2">
        <TeamStatusBar teams={teams} caption="Captains from both teams stay at the screen" compact />
      </div>

      <button
        onClick={onReady}
        className="mt-8 w-full max-w-xs rounded-md bg-[#ffd23f] py-4 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 landscape-short:!mt-3 landscape-short:!py-2 landscape-short:!text-sm"
      >
        Show words
      </button>
      </div>
    </div>
  )
}
