'use client'

import { useState } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import { TEAM_COLORS } from '@/lib/teamColors'
import { useActionInterval } from '@/lib/useActionInterval'
import Timer from './Timer'
import { teamPlayerLine } from './TeamNameBlock'

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
  const winBid = mode.bidding.wordCount
  const maxBid = mode.bidding.maxBid
  const noBidsYet = currentBid >= maxBid
  const opponentIndex: 0 | 1 = activeBidder === 0 ? 1 : 0
  const activeTeam = teams[activeBidder]
  const holderTeam = teams[biddingTeam]
  const opponentTeam = teams[opponentIndex]
  const activeColor = TEAM_COLORS[activeBidder]
  const holderColor = TEAM_COLORS[biddingTeam]
  const maxBidAllowed = noBidsYet ? maxBid - 1 : currentBid - 1
  const placeholderRange = winBid >= maxBidAllowed ? `${winBid}` : `${winBid}–${maxBidAllowed}`
  const timeExpired = biddingTimeLeft <= 0
  const activePlayers = teamPlayerLine(activeTeam.players, '', 4, 32)
  const holderPlayers = teamPlayerLine(holderTeam.players, '', 4, 32)

  function placeBid(raw: string) {
    const n = parseInt(raw, 10)
    if (isNaN(n)) { setError('Enter a number'); return }
    if (n > maxBidAllowed) { setError(`Must be ${maxBidAllowed} or lower`); return }
    if (n < winBid) { setError(`Lowest claim is ${winBid}`); return }
    setError('')
    setInput('')
    setHistory(prev => [...prev.slice(-7), { team: activeBidder, amount: n }])
    dispatch({ type: 'PLACE_BID', amount: n })
  }

  function takeFloor() {
    placeBid(String(winBid))
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { placeBid(input); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const current = parseInt(input, 10)
      const next = isNaN(current) ? maxBidAllowed : Math.max(winBid, current - 1)
      setInput(String(next))
      setError('')
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const current = parseInt(input, 10)
      const next = isNaN(current) ? maxBidAllowed : Math.min(maxBidAllowed, current + 1)
      setInput(String(next))
      setError('')
    }
  }

  return (
    <div className="flex h-dvh flex-col items-center overflow-y-auto bg-[#0a0d14] p-2 text-white md:justify-center md:p-8">
      <div className="grid w-full max-w-5xl gap-2 fade-in-up md:gap-4">

        <div className="flex items-baseline justify-between gap-3">
          <span className="mono-label text-[#ffd23f] text-xs font-bold">
            Bidding {state.round1Contests + 1}/{mode.bidding.contests}
          </span>
          <span className="mono-label text-[10px] text-white/35 tabular-nums">
            {teams[0].name} {teams[0].score} · {teams[1].name} {teams[1].score}
          </span>
        </div>

        <div className="grid gap-2 md:gap-4 lg:grid-cols-[0.9fr_1.1fr]">

          {/* Words to clue */}
          <div className="rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5">
            <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-3">{words.length} words to clue</p>
            <div className="mb-3 grid grid-cols-2 gap-1.5 md:gap-2 lg:grid-cols-1">
              {words.map((w, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 md:gap-3 md:px-4 md:py-3">
                  <span className="font-mono text-[10px] text-white/35 md:text-xs">{String(i+1).padStart(2,'0')}</span>
                  <span className="min-w-0 truncate text-xs font-black uppercase tracking-normal md:text-base">{w}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setHistory([]); dispatch({ type: 'REFRESH_BID' }) }}
              className="mono-label w-full rounded-md border border-[#ffd23f]/40 py-1.5 text-[10px] text-[#ffd23f] transition-all hover:bg-[#ffd23f]/10 active:scale-95 md:py-2"
            >
              New Words
            </button>
          </div>

          {/* State sentence + actions */}
          <div className="flex flex-col gap-2 md:gap-3">

            <div className="rounded-lg border border-white/10 bg-[#101522] p-3 md:p-5">
              {noBidsYet ? (
                <>
                  <p className="text-2xl font-black uppercase leading-tight md:text-3xl">
                    <span style={{ color: activeColor }}>{activeTeam.name}</span>
                    <span className="text-white">, open the bidding.</span>
                  </p>
                  {activePlayers && (
                    <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wide text-white/40 md:text-xs">{activePlayers}</p>
                  )}
                  <p className="mt-2 text-sm text-white/55 md:text-base">
                    How many clue-words do you need for all {words.length}?
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-black uppercase leading-tight md:text-3xl">
                    <span style={{ color: holderColor }}>{holderTeam.name}</span>
                    <span className="text-white"> says: </span>
                    <span className="text-[#ffd23f] tabular-nums">{currentBid}</span>
                    <span className="text-white"> clue-words is enough.</span>
                  </p>
                  {holderPlayers && (
                    <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wide text-white/40 md:text-xs">{holderPlayers}</p>
                  )}
                  <p className="mt-2 text-sm md:text-base">
                    <span className="font-black" style={{ color: activeColor }}>{activeTeam.name}</span>
                    <span className="text-white/55">, your move.</span>
                  </p>
                  {activePlayers && (
                    <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wide text-white/40 md:text-xs">{activePlayers}</p>
                  )}
                </>
              )}
              <div className="mt-3 flex items-center gap-3 md:mt-4">
                <Timer timeLeft={biddingTimeLeft} total={mode.timing.biddingSeconds} />
                {timeExpired && (
                  <p className="text-xs font-bold text-[#ff3a6d]">Time&apos;s up — make a move.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#141826] p-3 md:gap-3 md:p-5">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={input}
                  onChange={e => { setInput(e.target.value); setError('') }}
                  onKeyDown={handleKey}
                  placeholder={placeholderRange}
                  min={winBid}
                  max={maxBidAllowed}
                  autoFocus
                  aria-label={`Claim a number between ${winBid} and ${maxBidAllowed}`}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#0a0d14] px-3 py-2 text-center text-base font-black text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ffd23f]/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none md:px-4 md:py-3 md:text-lg"
                />
                <button
                  onClick={() => placeBid(input)}
                  disabled={!input}
                  className="shrink-0 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-black text-white transition-all hover:border-white/20 active:scale-95 disabled:opacity-30 md:px-5 md:py-3"
                >
                  {noBidsYet ? 'Open' : 'Bid lower'}
                </button>
              </div>
              <p className="text-center text-[10px] text-white/35 md:text-[11px]">
                Range {placeholderRange}{noBidsYet ? '' : ` · lower than ${currentBid}`}
              </p>

              {error && <p className="text-center text-[11px] text-[#ff3a6d] md:text-xs">{error}</p>}

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={takeFloor}
                  className="rounded-md bg-[#ffd23f] py-2.5 text-sm font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 md:py-3 md:text-base"
                >
                  Take {winBid} · auto-win
                </button>
                <button
                  onClick={() => dispatch({ type: 'CONCEDE' })}
                  className="rounded-md border border-white/15 bg-white/[0.04] py-2.5 text-sm font-black uppercase tracking-normal text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.08] active:scale-95 md:py-3 md:text-base"
                >
                  Concede · {opponentTeam.name} {noBidsYet ? `clues all ${words.length}` : `at ${currentBid}`}
                </button>
              </div>

              {history.length > 0 && (
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  {history.map((h, i) => (
                    <span key={`${h.team}-${h.amount}-${i}`} className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/55">
                      {teams[h.team].name.slice(0, 1).toUpperCase()} / {h.amount}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
