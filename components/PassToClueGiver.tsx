'use client'

import { GameState } from '@/lib/gameState'

interface Props {
  state: GameState
  onReady: () => void
}

export default function PassToClueGiver({ state, onReady }: Props) {
  const { teams, cluing } = state
  if (!cluing) return null

  const teamName = teams[cluing.cluingTeam].name
  const isMoney = cluing.difficulty === 'money'
  const limit = cluing.wordLimit
  const wordCount = isMoney ? 10 : 5
  const seconds = cluing.timeLeft

  return (
    <div className="min-h-screen bg-[#1a0505] flex flex-col items-center justify-center p-6 fade-in-up">
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-24 h-24 rounded-full bg-red-500/20 pulse-ring" />
        <div className="absolute w-20 h-20 rounded-full bg-red-500/20 pulse-ring" style={{ animationDelay: '0.4s' }} />
        <div className="w-16 h-16 rounded-full bg-red-500/30 border-2 border-red-400 flex items-center justify-center">
          <span className="text-3xl">🙈</span>
        </div>
      </div>

      <p className="text-red-400 text-xs uppercase tracking-[0.25em] font-bold mb-3">{teamName}</p>
      <h2 className="text-5xl font-black text-white text-center leading-tight mb-2">
        Guessers,<br />
        <span className="text-red-400">eyes closed!</span>
      </h2>
      <p className="text-white/40 text-sm text-center mt-2 max-w-xs">
        Everyone on <strong className="text-white/70">{teamName}</strong> except the clue giver looks away
      </p>

      <div className="mt-6 bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 grid grid-cols-3 gap-3 text-center w-full max-w-xs">
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
        className="mt-8 w-full max-w-xs py-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-sm tracking-wide hover:bg-red-500/30 active:scale-95 transition-all"
      >
        Reveal my words →
      </button>
    </div>
  )
}
