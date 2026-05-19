'use client'

import { useState, useMemo } from 'react'
import { GameState, GameAction } from '@/lib/gameState'
import { getChallenge } from '@/lib/challenges'
import Scoreboard from './Scoreboard'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

const PRESETS = [45, 60, 90, 120]

export default function MoneyRound({ state, dispatch }: Props) {
  const { teams, cluing } = state
  const winnerTeam: 0 | 1 = teams[0].score >= teams[1].score ? 0 : 1
  const [time, setTime] = useState(state.moneyTime)
  const [inputVal, setInputVal] = useState(String(state.moneyTime))

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

  if (state.phase === 'money_intro') {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center p-5 fade-in-up">
        <div className="w-full max-w-sm">

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400/15 border border-yellow-400/25 text-3xl mb-4">
              💰
            </div>
            <p className="text-yellow-400 text-xs uppercase tracking-[0.2em] font-bold mb-1">Final</p>
            <h2 className="text-3xl font-black text-white">Money Round</h2>
            <p className="text-white/40 text-sm mt-1">Winning team plays for the jackpot</p>
          </div>

          <div className="bg-[#15151e] border border-white/[0.08] rounded-xl p-4 mb-4 grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-white font-black text-2xl">10</div>
              <div className="text-white/35 text-xs">words to guess</div>
            </div>
            <div>
              <div className="text-white font-black text-2xl">25</div>
              <div className="text-white/35 text-xs">clue word limit</div>
            </div>
          </div>

          {/* Timer config */}
          <div className="bg-[#15151e] border border-white/[0.08] rounded-xl p-4 mb-4">
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">Time limit</p>
            <div className="flex gap-1.5 mb-3">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => { setTime(p); setInputVal(String(p)) }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                    time === p
                      ? 'bg-yellow-400 text-black'
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
                className="flex-1 bg-[#0d0d14] border border-white/[0.08] text-white placeholder-white/20 rounded-lg px-3 py-2 text-sm font-bold text-center outline-none focus:border-yellow-400/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-white/30 text-sm">sec</span>
            </div>
          </div>

          <div className="bg-yellow-400/8 border border-yellow-400/20 rounded-xl p-4 mb-4 text-center">
            <p className="text-yellow-300/70 text-xs uppercase tracking-widest mb-1">Playing for</p>
            <p className="text-white font-black text-lg">{teams[winnerTeam].name}</p>
          </div>

          <Scoreboard teams={teams} highlight={winnerTeam} />

          <button
            onClick={() => dispatch({ type: 'ADVANCE_PHASE', moneyTime: time })}
            className="mt-5 w-full py-4 rounded-xl bg-yellow-400 text-black font-black text-base tracking-wide hover:bg-yellow-300 active:scale-95 transition-all"
          >
            Start Money Round
          </button>
        </div>
      </div>
    )
  }

  if (state.phase === 'money_result') {
    const won = state.moneyWon
    const correct = cluing?.guessed.filter(Boolean).length ?? 0
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const challenge = useMemo(() => getChallenge(won ? 'money_win' : 'money_fail'), [won])

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-5 fade-in-up ${won ? 'bg-[#081a0e]' : 'bg-[#0d0d14]'}`}>
        <div className="w-full max-w-sm">

          <div className={`rounded-2xl p-5 text-center mb-4 ${won ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.04] border border-white/[0.08]'}`}>
            <div className="text-4xl mb-2">{won ? '🏆' : '😤'}</div>
            <div className={`text-3xl font-black mb-0.5 ${won ? 'text-emerald-400' : 'text-white'}`}>
              {won ? 'Jackpot!' : 'So close!'}
            </div>
            <div className="text-white/50 text-sm">
              {won ? `${teams[winnerTeam].name} got all 10!` : `${correct}/10 words — ${teams[winnerTeam].name} still wins`}
            </div>
          </div>

          {cluing && (
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {cluing.words.map((w, i) => (
                <div key={i} className={`rounded-xl py-3 px-1 text-center text-[11px] font-black ${cluing.guessed[i] ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-red-500/10 text-red-400/80 border border-red-500/20'}`}>
                  {w}
                  <div className="text-sm mt-1">{cluing.guessed[i] ? '✓' : '✗'}</div>
                </div>
              ))}
            </div>
          )}

          <Scoreboard teams={teams} highlight={winnerTeam} />

          <div className="mt-4 bg-[#1e1410] border border-[#e8774d]/25 rounded-xl p-4">
            <p className="text-[#e8774d] text-[9px] uppercase tracking-[0.2em] font-bold mb-2">🥃 Shot Moment</p>
            <p className="text-white/80 text-sm leading-snug">
              <span className="mr-1.5">{challenge.emoji}</span>{challenge.text}
            </p>
          </div>

          <button
            onClick={() => dispatch({ type: 'NEXT_AFTER_RESULT' })}
            className="mt-4 w-full py-4 rounded-xl bg-[#e8774d] text-white font-black text-base tracking-wide hover:bg-[#d9663b] active:scale-95 transition-all"
          >
            Final Scores →
          </button>
        </div>
      </div>
    )
  }

  return null
}
