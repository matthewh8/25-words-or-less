'use client'

import { useState } from 'react'
import { GameState, GameAction } from '@/lib/gameState'
import Scoreboard from './Scoreboard'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

const ROUNDS = {
  1: {
    number: '01',
    title: 'The Bid',
    icon: '🎯',
    bullets: [
      'Both teams see 5 words',
      'Bid down — whoever bids fewest clue words gives the clues',
      'All 5 correct → 1,000 pts · Fail → opponents get 500',
    ],
  },
  2: {
    number: '02',
    title: 'Color Stacks',
    icon: '🎨',
    bullets: [
      'Teams alternate picking a color stack',
      '🟢 250 · 🟡 500 · 🔴 1,000 pts per word',
      'All 5 correct adds a 1,000 pt bonus · 20-word limit',
    ],
  },
  3: {
    number: '03',
    title: 'Color Stacks',
    icon: '🎨',
    bullets: [
      'Same rules as Round 2',
      'Each color can only be picked once per round',
      'Higher risk = higher reward',
    ],
  },
}

const PRESETS = [30, 45, 60, 90]

export default function RoundIntro({ state, dispatch }: Props) {
  const { teams, currentRound } = state
  const info = ROUNDS[currentRound]
  const [time, setTime] = useState(state.roundTime)
  const [inputVal, setInputVal] = useState(String(state.roundTime))

  function handleInput(val: string) {
    setInputVal(val)
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 10 && n <= 300) setTime(n)
  }

  function handleBlur() {
    const n = parseInt(inputVal, 10)
    if (isNaN(n) || n < 10) { setInputVal('10'); setTime(10) }
    else if (n > 300) { setInputVal('300'); setTime(300) }
    else setInputVal(String(n))
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center p-6 fade-in-up">
      <div className="w-full max-w-sm">

        {/* Round badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="text-4xl">{info.icon}</div>
          <div>
            <div className="text-[#e8774d] text-xs uppercase tracking-[0.2em] font-bold">Round {info.number}</div>
            <div className="text-white text-2xl font-black leading-tight">{info.title}</div>
          </div>
        </div>

        {/* Bullets */}
        <div className="bg-[#15151e] border border-white/[0.08] rounded-xl p-4 mb-5 space-y-2.5">
          {info.bullets.map((b, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-[#e8774d] mt-1.5 shrink-0" />
              <p className="text-white/70 text-sm leading-snug">{b}</p>
            </div>
          ))}
        </div>

        {/* Timer config */}
        <div className="bg-[#15151e] border border-white/[0.08] rounded-xl p-4 mb-5">
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">Time per turn</p>
          <div className="flex gap-1.5 mb-3">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => { setTime(p); setInputVal(String(p)) }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                  time === p
                    ? 'bg-[#e8774d] text-white'
                    : 'bg-white/[0.06] text-white/50 hover:text-white/80'
                }`}
              >
                {p}s
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={inputVal}
              onChange={e => handleInput(e.target.value)}
              onBlur={handleBlur}
              min={10}
              max={300}
              className="flex-1 bg-[#0d0d14] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-3 py-2 text-sm font-bold text-center outline-none focus:border-[#e8774d]/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-white/30 text-sm">sec</span>
          </div>
        </div>

        <Scoreboard teams={teams} />

        <button
          onClick={() => dispatch({ type: 'ADVANCE_PHASE', roundTime: time })}
          className="mt-5 w-full py-4 rounded-xl bg-[#e8774d] text-white font-black text-lg tracking-wide hover:bg-[#d9663b] active:scale-95 transition-all"
        >
          Start Round {info.number}
        </button>
      </div>
    </div>
  )
}
