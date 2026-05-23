'use client'

import { useState } from 'react'
import type { GameState, GameAction } from '@/lib/gameState'
import { canPlaceBid } from '@/lib/gameState'
import { TEAM_COLORS } from '@/lib/teamColors'
import { useActionInterval } from '@/lib/useActionInterval'
import Timer from './Timer'
import TeamStatusBar from './TeamStatusBar'

interface Props {
  state: GameState
  dispatch: (a: GameAction) => void
}

export default function BiddingRound({ state, dispatch }: Props) {
  const { bid, teams } = state
  const mode = state.gameMode
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  useActionInterval(
    () => dispatch({ type: 'BIDDING_TICK' }),
    bid && bid.biddingTimeLeft > 0 ? 1000 : null
  )

  if (!bid) return null

  const { words, currentBid, activeBidder, biddingTeam, biddingTimeLeft } = bid
  const winBid = mode.bidding.wordCount
  const maxBid = mode.bidding.maxBid
  const noBidsYet = currentBid >= maxBid
  const activeTeam = teams[activeBidder]
  const holderTeam = teams[biddingTeam]
  const activeColor = TEAM_COLORS[activeBidder]
  const holderColor = TEAM_COLORS[biddingTeam]
  const maxBidAllowed = noBidsYet ? maxBid - 1 : currentBid - 1
  const placeholderRange = winBid >= maxBidAllowed ? `${winBid}` : `${winBid}–${maxBidAllowed}`
  const timeExpired = biddingTimeLeft <= 0

  const parsedInput = parseInt(input, 10)
  const inputIsValid = !isNaN(parsedInput) && canPlaceBid(parsedInput, currentBid, mode)
  const defaultBid = Math.max(winBid, currentBid - 1)
  const resolvedBid = inputIsValid ? parsedInput : defaultBid
  const resolvedLabel = resolvedBid === winBid ? `Bid ${winBid} · win` : `Bid ${resolvedBid}`

  function placeBid(amount: number) {
    if (!canPlaceBid(amount, currentBid, mode)) {
      if (amount < winBid) { setError(`Lowest claim is ${winBid}`); return }
      setError(`Must be ${maxBidAllowed} or lower`)
      return
    }
    setError('')
    setInput('')
    dispatch({ type: 'PLACE_BID', amount })
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const n = parseInt(input, 10)
      if (isNaN(n)) { setError('Enter a number'); return }
      placeBid(n)
      return
    }
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

  const teamBidButtons = teams.map((team, i) => {
    const isActive = activeBidder === i
    const color = TEAM_COLORS[i]
    return (
      <button
        key={i}
        onClick={() => isActive && placeBid(resolvedBid)}
        disabled={!isActive}
        aria-label={`${team.name}: ${resolvedLabel}`}
        className={`flex flex-col items-center justify-center rounded-lg border-2 px-3 py-3 text-center transition-all active:scale-95 landscape-short:py-2 ${
          isActive
            ? 'cursor-pointer hover:brightness-110'
            : 'pointer-events-none opacity-40'
        }`}
        style={{
          borderColor: color,
          backgroundColor: isActive ? `${color}26` : 'transparent',
        }}
      >
        <span className="mono-label text-[10px] font-bold tracking-wide" style={{ color }}>
          {team.name}
        </span>
        <span className="mt-1 text-2xl font-black uppercase leading-none tracking-normal text-white md:text-3xl landscape-short:text-lg">
          {resolvedLabel}
        </span>
      </button>
    )
  })

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0d14] text-white">

      {/* Fixed header */}
      <div className="shrink-0 border-b border-white/10 px-3 pb-2 pt-3 md:px-8 md:pb-3 md:pt-4 landscape-short:py-1.5">
        <div className="mb-2 flex items-center gap-2 landscape-short:mb-1">
          <div className="h-2 w-2 rounded-full bg-[#ffd23f]" />
          <span className="mono-label text-[10px] font-semibold text-white/45">
            Bidding {state.round1Contests + 1}/{mode.bidding.contests}
          </span>
        </div>
        <TeamStatusBar
          teams={teams}
          activeTeam={activeBidder}
          activeLabel="Bidding"
          compact
        />
      </div>

      {/* Main 2-panel area: flex-1 scroll on mobile (height constrained so scroll works), no-scroll grid on md+ */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 md:grid md:overflow-hidden md:grid-cols-[0.9fr_1.1fr] md:gap-3 md:p-4 landscape-short:grid landscape-short:overflow-hidden landscape-short:grid-cols-[0.9fr_1.1fr] landscape-short:gap-2 landscape-short:p-2">

        {/* Words to clue — shrinks to content on mobile, fills grid cell on desktop */}
        <div className="shrink-0 rounded-lg border border-white/10 bg-[#141826] p-3 md:flex md:min-h-0 md:shrink md:flex-col md:p-5 landscape-short:flex landscape-short:min-h-0 landscape-short:shrink landscape-short:flex-col landscape-short:p-2">
          <p className="mono-label mb-2 text-[10px] text-white/45 landscape-short:mb-1">{words.length} words to clue</p>
          <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1 landscape-short:grid-cols-1 landscape-short:gap-1">
              {words.map((w, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 md:gap-3 md:px-4 md:py-3 landscape-short:px-2 landscape-short:py-0.5">
                  <span className="font-mono text-[10px] text-white/35 md:text-xs">{String(i+1).padStart(2,'0')}</span>
                  <span className="min-w-0 truncate text-xs font-black uppercase tracking-normal md:text-base">{w}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setInput(''); setError(''); dispatch({ type: 'REFRESH_BID' }) }}
            className="mono-label mt-2 w-full rounded-md border border-[#ffd23f]/40 py-1.5 text-[10px] text-[#ffd23f] transition-all hover:bg-[#ffd23f]/10 active:scale-95 landscape-short:mt-1 landscape-short:py-1"
          >
            New Words
          </button>
        </div>

        {/* Status + timer + quick actions + input */}
        <div className="flex shrink-0 flex-col gap-2 md:flex-none landscape-short:flex-none landscape-short:gap-1.5">

          <div className="rounded-lg border border-white/10 bg-[#101522] p-3 md:p-5 landscape-short:p-2">
            {noBidsYet ? (
              <>
                <p className="text-xl font-black uppercase leading-tight md:text-2xl landscape-short:text-base">
                  <span style={{ color: activeColor }}>{activeTeam.name}</span>
                  <span className="text-white">, open the bidding.</span>
                </p>
                <p className="mt-1.5 text-sm text-white/55 landscape-short:mt-1 landscape-short:text-xs">
                  How many clue-words do you need for all {words.length}?
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-black uppercase leading-tight md:text-2xl landscape-short:text-base">
                  <span style={{ color: holderColor }}>{holderTeam.name}</span>
                  <span className="text-white"> says </span>
                  <span className="tabular-nums text-[#ffd23f]">{currentBid}</span>
                  <span className="text-white"> is enough.</span>
                </p>
                <p className="mt-1.5 text-sm landscape-short:mt-1 landscape-short:text-xs">
                  <span className="font-black" style={{ color: activeColor }}>{activeTeam.name}</span>
                  <span className="text-white/55">, your move.</span>
                </p>
              </>
            )}
            <div className="mt-2 flex items-center justify-between gap-3 landscape-short:mt-1.5">
              <div className="flex items-center gap-3">
                <Timer timeLeft={biddingTimeLeft} total={mode.timing.biddingSeconds} landscapeShortSize="xs" />
                {timeExpired && (
                  <p className="text-xs font-bold text-[#ff3a6d]">Time&apos;s up</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5 landscape-short:gap-1">
                <button
                  onClick={() => { setInput(String(winBid)); setError('') }}
                  className="rounded-md border border-[#ff3a6d]/55 bg-[#ff3a6d]/10 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-normal text-[#ff3a6d] transition-all hover:bg-[#ff3a6d]/20 active:scale-95 landscape-short:px-2 landscape-short:py-1 landscape-short:text-[10px]"
                >
                  Set to {winBid}
                </button>
                <button
                  onClick={() => dispatch({ type: 'CONCEDE' })}
                  className="rounded-md border border-[#ff3a6d]/55 bg-[#ff3a6d]/10 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-normal text-[#ff3a6d] transition-all hover:bg-[#ff3a6d]/20 active:scale-95 landscape-short:px-2 landscape-short:py-1 landscape-short:text-[10px]"
                >
                  Concede
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5 landscape-short:gap-1.5 landscape-short:p-2">
            <p className="mono-label text-[10px] text-white/45">or pick a number</p>
            <input
              type="number"
              inputMode="numeric"
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={handleKey}
              placeholder={placeholderRange}
              min={winBid}
              max={maxBidAllowed}
              aria-label={`Claim a number between ${winBid} and ${maxBidAllowed}`}
              className="w-full rounded-md border border-white/10 bg-[#0a0d14] px-3 py-2 text-center text-base font-black text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#ffd23f]/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none md:py-3 md:text-lg"
            />
            <p className="text-center text-[10px] text-white/35 md:text-[11px]">
              Range {placeholderRange}{noBidsYet ? '' : ` · lower than ${currentBid}`}
            </p>
            {error && <p className="text-center text-[11px] text-[#ff3a6d] md:text-xs">{error}</p>}
          </div>

        </div>

        {/* Bid buttons at end of scroll content on mobile */}
        <div className="grid shrink-0 grid-cols-2 gap-2 md:hidden landscape-short:hidden">
          {teamBidButtons}
        </div>

      </div>

      {/* Bid buttons pinned outside on desktop + landscape */}
      <div className="hidden shrink-0 grid-cols-2 gap-2 px-4 pb-4 md:grid landscape-short:grid landscape-short:px-2 landscape-short:pb-2">
        {teamBidButtons}
      </div>

    </div>
  )
}
