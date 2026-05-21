'use client'

import { useState } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import { winningBidAmount } from '@/lib/gameState'
import { useActionInterval } from '@/lib/useActionInterval'
import Scoreboard from './Scoreboard'
import Timer from './Timer'
import TeamStatusBar from './TeamStatusBar'
import TeamNameBlock from './TeamNameBlock'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function BiddingRound({ state, dispatch }: Props) {
  const { bid, teams } = state
  const mode = state.gameMode
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState<{ team: 0 | 1; amount: number }[]>([])

  useActionInterval(
    () => dispatch({ type: 'BIDDING_TICK' }),
    bid && bid.biddingTimeLeft > 0 ? 1000 : null
  )

  if (!bid) return null

  const { words, currentBid, activeBidder, biddingTeam, biddingTimeLeft } = bid
  const activeName = teams[activeBidder].name
  const concedeName = teams[biddingTeam].name
  const winBid = winningBidAmount(mode)
  const timeExpired = biddingTimeLeft <= 0

  function placeBid(raw: string) {
    const n = parseInt(raw, 10)
    if (isNaN(n)) { setError('Enter a number'); return }
    if (n >= currentBid) { setError(`Must be less than ${currentBid}`); return }
    if (n < winBid) { setError(`Win the bid at ${winBid}`); return }
    setError('')
    setInput('')
    setHistory(prev => [...prev.slice(-7), { team: activeBidder, amount: n }])
    dispatch({ type: 'PLACE_BID', amount: n })
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { placeBid(input); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const current = parseInt(input, 10)
      const next = isNaN(current) ? currentBid - 1 : Math.max(winBid, current - 1)
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
    <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0d14] p-2 text-white md:p-8">
      <div className="grid h-full w-full max-w-6xl grid-rows-[auto_1fr] gap-2 fade-in-up md:h-auto md:gap-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <span className="mono-label text-[#ffd23f] text-xs font-bold">
            Bidding {state.round1Contests + 1}/{mode.bidding.contests}
          </span>
          <Scoreboard teams={teams} compact />
        </div>

        <TeamStatusBar
          teams={teams}
          activeTeam={activeBidder}
          activeLabel="Bid now"
          caption={`Holding ${currentBid} — other team lowers or concedes`}
          compact
        />

        <div className="grid min-h-0 gap-2 lg:grid-cols-[1fr_260px_1fr] lg:gap-4">
          {/* Words */}
          <div className="rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5">
            <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-3">{words.length} words to clue</p>
            <div className="mb-2 grid grid-cols-2 gap-1.5 md:mb-4 lg:flex lg:flex-col lg:gap-2">
              {words.map((w, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-white md:gap-3 md:px-4 md:py-3">
                  <span className="font-mono text-xs text-white/35">0{i + 1}</span>
                  <span className="min-w-0 truncate font-black uppercase tracking-normal">{w}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setHistory([]); dispatch({ type: 'REFRESH_BID' }) }}
              className="mono-label w-full rounded-md border border-[#ffd23f]/40 py-2.5 text-[10px] text-[#ffd23f] hover:bg-[#ffd23f]/10 active:scale-95 transition-all"
            >
              New Words
            </button>
          </div>

          {/* Current bid + timer */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-[#101522] p-2 text-center md:p-5">
            <p className="mono-label mb-1 text-[10px] text-white/45 md:mb-2">Current bid</p>
            <div className="text-5xl font-black leading-[0.8] tracking-normal text-[#ffd23f] tabular-nums md:text-[9rem]">{currentBid}</div>
            <p className="mt-1 text-xs text-white/45 md:mt-3 md:text-sm">
              <span className="font-semibold text-white">{activeName}</span> bids lower, bids {winBid}, or concedes
            </p>
            <p className="mt-1 max-w-44 truncate text-[10px] font-bold text-white/30">
              {teams[activeBidder].players.length ? teams[activeBidder].players.join(' / ') : 'No players assigned'}
            </p>
            <div className={`mono-label mt-1 text-[10px] md:hidden ${timeExpired ? 'text-[#ff3a6d]' : 'text-white/45'}`}>
              {timeExpired ? 'timer expired' : `${biddingTimeLeft}s left`}
            </div>
            <div className="mt-2 hidden justify-center md:mt-5 md:flex">
              <Timer timeLeft={biddingTimeLeft} total={mode.timing.biddingSeconds} />
            </div>
            {timeExpired && (
              <p className="mt-3 text-xs font-bold text-[#ff3a6d]">No automatic move. Bid {winBid} or concede.</p>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5">
            <div className="mb-2 grid grid-cols-2 gap-2 md:mb-4">
              {teams.map((team, i) => (
                <div
                  key={team.name}
                  className={`rounded-md border p-2 md:p-3 ${biddingTeam === i ? 'border-[#ffd23f] bg-[#ffd23f]/10' : 'border-white/10 bg-white/[0.03]'}`}
                >
                  <div className="mono-label text-[9px] text-white/45">{biddingTeam === i ? 'holds bid' : 'challenger'}</div>
                  <TeamNameBlock
                    team={team}
                    className="mt-1"
                    nameClassName="text-base font-black uppercase md:text-lg"
                    playersClassName="mt-0.5 text-[10px] font-bold text-white/35"
                    maxPlayers={3}
                  />
                </div>
              ))}
            </div>

            {/* Bid input */}
            <div className="mb-2 md:mb-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={input}
                  onChange={e => { setInput(e.target.value); setError('') }}
                  onKeyDown={handleKey}
                  placeholder={`${winBid}–${currentBid - 1}`}
                  min={winBid}
                  max={currentBid - 1}
                  autoFocus
                  aria-label={`Bid lower than ${currentBid}`}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#0a0d14] px-4 py-2.5 text-center text-lg font-black text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ffd23f]/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none md:py-3.5 md:text-xl"
                />
                <button
                  onClick={() => placeBid(input)}
                  disabled={!input}
                  className="rounded-md border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-black text-white transition-all hover:border-white/20 active:scale-95 disabled:opacity-30 md:px-5 md:py-3.5"
                >
                  Bid
                </button>
              </div>
              {error
                ? <p className="text-[#ff3a6d] text-xs mt-1.5 text-center">{error}</p>
                : <p className="text-white/25 text-xs mt-1.5 text-center">Arrow keys adjust / Enter submits</p>
              }
            </div>

            <div className="mb-1 min-h-0 md:mb-3 md:min-h-10">
              {history.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {history.map((h, i) => (
                    <span key={`${h.team}-${h.amount}-${i}`} className="rounded-full border border-white/10 px-2 py-1 font-mono text-[10px] text-white/55">
                      {teams[h.team].name.slice(0, 1)} / {h.amount}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => dispatch({ type: 'CONCEDE' })}
              className="w-full rounded-md bg-[#ffd23f] py-2 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 md:py-3.5"
            >
              Concede
            </button>

            <p className="mt-3 hidden text-center text-xs text-white/25 md:block">
              <strong className="text-white/50">{concedeName}</strong> clues all {words.length} using {currentBid} words if the other team concedes.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
