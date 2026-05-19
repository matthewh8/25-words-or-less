'use client'

import { useState, useEffect } from 'react'
import { GameState, GameAction } from '@/lib/gameState'
import Scoreboard from './Scoreboard'
import Timer from './Timer'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function BiddingRound({ state, dispatch }: Props) {
  const { bid, teams } = state
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'BIDDING_TICK' }), 1000)
    return () => clearInterval(id)
  }, [dispatch])

  if (!bid) return null

  const { words, currentBid, activeBidder, biddingTeam, biddingTimeLeft } = bid
  const activeName = teams[activeBidder].name
  const concedeName = teams[biddingTeam].name
  const minBid = 6

  function placeBid(raw: string) {
    const n = parseInt(raw, 10)
    if (isNaN(n)) { setError('Enter a number'); return }
    if (n >= currentBid) { setError(`Must be less than ${currentBid}`); return }
    if (n < minBid) { setError(`Minimum is ${minBid}`); return }
    setError('')
    setInput('')
    dispatch({ type: 'PLACE_BID', amount: n })
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { placeBid(input); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const current = parseInt(input, 10)
      const next = isNaN(current) ? currentBid - 1 : Math.max(minBid, current - 1)
      setInput(String(next))
      setError('')
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const current = parseInt(input, 10)
      const next = isNaN(current) ? currentBid - 1 : Math.min(currentBid - 1, current + 1)
      setInput(String(next))
      setError('')
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center p-5 fade-in-up">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[#e8774d] text-xs uppercase tracking-[0.2em] font-bold">
            Bidding · {state.round1Contests + 1}/2
          </span>
          <Scoreboard teams={teams} compact />
        </div>

        {/* Words */}
        <div className="bg-[#15151e] border border-white/[0.08] rounded-xl p-4 mb-5">
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">5 words to clue</p>
          <div className="flex flex-col gap-1.5 mb-3">
            {words.map((w, i) => (
              <div key={i} className="bg-white/[0.06] rounded-lg py-2.5 px-4 text-white font-black text-center text-sm leading-tight">
                {w}
              </div>
            ))}
          </div>
          <button
            onClick={() => dispatch({ type: 'REFRESH_BID' })}
            className="w-full py-2.5 rounded-lg border border-[#e8774d]/40 text-[#e8774d] font-bold text-sm hover:bg-[#e8774d]/10 active:scale-95 transition-all"
          >
            ↺ New Words
          </button>
        </div>

        {/* Current bid + timer */}
        <div className="text-center mb-6">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Current bid</p>
          <div className="text-[5.5rem] font-black leading-none text-white tabular-nums">{currentBid}</div>
          <p className="text-white/40 text-sm mt-1">
            <span className="text-white font-semibold">{activeName}</span> — bid lower or concede
          </p>
          <div className="mt-4 flex justify-center">
            <Timer timeLeft={biddingTimeLeft} total={90} />
          </div>
        </div>

        {/* Bid input — ↑↓ arrows adjust, Enter submits */}
        <div className="mb-3">
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={handleKey}
              placeholder={`${minBid}–${currentBid - 1}`}
              min={minBid}
              max={currentBid - 1}
              autoFocus
              className="flex-1 bg-[#15151e] border border-white/[0.08] text-white placeholder-white/20 rounded-xl px-4 py-3.5 text-xl font-black text-center outline-none focus:border-[#e8774d]/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => placeBid(input)}
              disabled={!input}
              className="px-5 py-3.5 rounded-xl bg-[#15151e] border border-white/[0.08] text-white font-black text-sm disabled:opacity-30 hover:border-white/20 active:scale-95 transition-all"
            >
              Bid
            </button>
          </div>
          {error
            ? <p className="text-red-400 text-xs mt-1.5 text-center">{error}</p>
            : <p className="text-white/20 text-xs mt-1.5 text-center">↑↓ arrows adjust · Enter to bid</p>
          }
        </div>

        {/* Concede */}
        <button
          onClick={() => dispatch({ type: 'CONCEDE' })}
          className="w-full py-3.5 rounded-xl bg-[#e8774d] text-white font-black text-base hover:bg-[#d9663b] active:scale-95 transition-all"
        >
          Concede
        </button>

        <p className="text-white/20 text-xs text-center mt-3">
          Concede → <strong className="text-white/35">{concedeName}</strong> gives clues using {currentBid} words
        </p>

      </div>
    </div>
  )
}
