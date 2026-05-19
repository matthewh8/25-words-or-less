'use client'

import { GameState } from '@/lib/gameState'

interface Props {
  state: GameState
  onRestart: () => void
}

export default function FinalScoreboard({ state, onRestart }: Props) {
  const { teams, moneyWon } = state
  const winner: 0 | 1 = teams[0].score >= teams[1].score ? 0 : 1
  const tied = teams[0].score === teams[1].score

  const sorted = [...teams]
    .map((t, i) => ({ ...t, index: i as 0 | 1 }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center p-5 fade-in-up">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{tied ? '🤝' : '🏆'}</div>
          <p className="text-[#e8774d] text-xs uppercase tracking-[0.2em] font-bold mb-1">Game Over</p>
          <h2 className="text-3xl font-black text-white">
            {tied ? "It's a tie!" : `${teams[winner].name} wins!`}
          </h2>
          {moneyWon && (
            <p className="text-yellow-400/80 text-sm mt-1.5">+ Money Round jackpot 💰</p>
          )}
        </div>

        <div className="space-y-2.5 mb-8">
          {sorted.map(({ name, score, index }, rank) => (
            <div
              key={index}
              className={`flex items-center justify-between px-5 py-4 rounded-xl transition-all ${
                rank === 0 && !tied
                  ? 'bg-[#e8774d]/15 border border-[#e8774d]/30'
                  : 'bg-[#15151e] border border-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{rank === 0 && !tied ? '🥇' : '🥈'}</span>
                <span className={`font-black text-lg ${rank === 0 && !tied ? 'text-[#e8774d]' : 'text-white'}`}>
                  {name}
                </span>
              </div>
              <span className="font-black text-2xl tabular-nums text-white">{score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="w-full py-4 rounded-xl bg-[#e8774d] text-white font-black text-base tracking-wide hover:bg-[#d9663b] active:scale-95 transition-all"
        >
          Play Again
        </button>
      </div>
    </div>
  )
}
