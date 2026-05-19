'use client'

import { useState } from 'react'

interface TeamSetupProps {
  onStart: (team1: string, team2: string) => void
}

export default function TeamSetup({ onStart }: TeamSetupProps) {
  const [t1, setT1] = useState('')
  const [t2, setT2] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black text-white text-center mb-2">25 Words or Less</h1>
        <p className="text-white/60 text-center mb-10">Enter team names to begin</p>

        <div className="space-y-4 mb-8">
          {[{ val: t1, set: setT1, placeholder: 'Team 1 Name', color: 'from-blue-500 to-cyan-500' },
            { val: t2, set: setT2, placeholder: 'Team 2 Name', color: 'from-pink-500 to-rose-500' }].map(({ val, set, placeholder, color }) => (
            <div key={placeholder} className={`p-0.5 rounded-2xl bg-gradient-to-r ${color}`}>
              <input
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                maxLength={20}
                className="w-full bg-[#1a0a3a] text-white placeholder-white/40 rounded-[14px] px-5 py-4 text-xl font-bold outline-none"
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => onStart(t1 || 'Team 1', t2 || 'Team 2')}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-2xl uppercase tracking-wide hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-yellow-500/30"
        >
          Start Game
        </button>

        <div className="mt-8 bg-white/5 rounded-2xl p-5 text-white/70 text-sm space-y-2">
          <p className="font-bold text-white/90">How to play:</p>
          <p>• <strong>Round 1:</strong> Bid down from 25 — fewer words = harder but worth more points</p>
          <p>• <strong>Rounds 2 & 3:</strong> Pick color stacks — 🟢 easy, 🟡 medium, 🔴 hard</p>
          <p>• <strong>Money Round:</strong> 10 words, 25 clues, 60 seconds — all or nothing!</p>
          <p>• Clue giver speaks one-word clues only — no derivatives, rhymes, or letter hints</p>
        </div>
      </div>
    </div>
  )
}
