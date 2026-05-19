'use client'

import { GameState } from '@/lib/gameState'

interface Props {
  state: GameState
  onReady: () => void
}

export default function PassToBidders({ state, onReady }: Props) {
  const { teams } = state

  return (
    <div className="min-h-screen bg-[#0d0a1a] flex flex-col items-center justify-center p-6 fade-in-up">
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-24 h-24 rounded-full bg-[#e8774d]/15 pulse-ring" />
        <div className="absolute w-20 h-20 rounded-full bg-[#e8774d]/15 pulse-ring" style={{ animationDelay: '0.4s' }} />
        <div className="w-16 h-16 rounded-full bg-[#e8774d]/20 border-2 border-[#e8774d]/50 flex items-center justify-center">
          <span className="text-3xl">🙈</span>
        </div>
      </div>

      <p className="text-[#e8774d] text-xs uppercase tracking-[0.25em] font-bold mb-3">Bidding Round</p>
      <h2 className="text-5xl font-black text-white text-center leading-tight mb-2">
        Guessers,<br />
        <span className="text-[#e8774d]">look away!</span>
      </h2>
      <p className="text-white/40 text-sm text-center mt-4 max-w-xs">
        One captain from <strong className="text-white/60">{teams[0].name}</strong> and <strong className="text-white/60">{teams[1].name}</strong> stays at the screen. Everyone else looks away.
      </p>

      <button
        onClick={onReady}
        className="mt-10 w-full max-w-xs py-4 rounded-xl bg-[#e8774d] text-white font-black text-base tracking-wide hover:bg-[#d9663b] active:scale-95 transition-all"
      >
        Show the words
      </button>
    </div>
  )
}
