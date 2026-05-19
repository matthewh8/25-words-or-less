'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [t1, setT1] = useState('')
  const [t2, setT2] = useState('')
  const [cleared, setCleared] = useState(false)
  const router = useRouter()

  function clearHistory() {
    localStorage.removeItem('25wol_used_words')
    setCleared(true)
    setTimeout(() => setCleared(false), 2000)
  }

  function startGame() {
    const params = new URLSearchParams({
      t1: t1.trim() || 'Team 1',
      t2: t2.trim() || 'Team 2',
    })
    router.push(`/game?${params}`)
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center p-6">
      <div className="w-full max-w-sm fade-in-up">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#e8774d] text-white text-2xl font-black mb-5 shadow-lg">
            25
          </div>
          <h1 className="text-[2.2rem] font-black text-white tracking-tight leading-none">
            25 Words or Less
          </h1>
          <p className="text-[#e8774d]/80 text-sm mt-1.5 font-medium">Party word game</p>
        </div>

        {/* Team inputs */}
        <div className="space-y-3 mb-5">
          {[
            { val: t1, set: setT1, placeholder: 'Team 1 name' },
            { val: t2, set: setT2, placeholder: 'Team 2 name' },
          ].map(({ val, set, placeholder }) => (
            <input
              key={placeholder}
              value={val}
              onChange={e => set(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startGame()}
              placeholder={placeholder}
              maxLength={20}
              className="w-full bg-[#15151e] border border-white/[0.08] text-white placeholder-white/25 rounded-xl px-4 py-3.5 text-base font-medium outline-none focus:border-[#e8774d]/60 transition-colors"
            />
          ))}
        </div>

        <button
          onClick={startGame}
          className="w-full py-4 rounded-xl bg-[#e8774d] text-white font-black text-lg tracking-wide hover:bg-[#d9663b] active:scale-95 transition-all"
        >
          Start Game
        </button>

        <button
          onClick={clearHistory}
          className="w-full mt-3 py-2 text-white/20 text-xs hover:text-white/40 transition-colors"
        >
          {cleared ? 'Word history cleared' : 'Reset word history'}
        </button>

        {/* Round overview — minimal */}
        <div className="mt-8 grid grid-cols-3 gap-2">
          {[
            { icon: '🎯', label: 'Round 1', sub: 'Bid on clue count' },
            { icon: '🎨', label: 'Rounds 2–3', sub: 'Pick a color stack' },
            { icon: '💰', label: 'Money Round', sub: '10 words, 60 secs' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="bg-[#15151e] border border-white/[0.06] rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-white text-xs font-bold leading-tight">{label}</div>
              <div className="text-white/35 text-[10px] mt-0.5 leading-tight">{sub}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
