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
  const activePlayers = teamPlayerLine(activeTeam.players, '', 4, 32)
  const holderPlayers = teamPlayerLine(holderTeam.players, '', 4, 32)

  const parsedInput = parseInt(input, 10)
  const inputIsValid = !isNaN(parsedInput) && parsedInput >= winBid && parsedInput <= maxBidAllowed
  const defaultBid = Math.max(winBid, currentBid - 1)
  const resolvedBid = inputIsValid ? parsedInput : defaultBid
  const resolvedLabel = resolvedBid === winBid ? `Bid ${winBid} · win` : `Bid ${resolvedBid}`

  function placeBid(amount: number) {
    if (amount > maxBidAllowed) { setError(`Must be ${maxBidAllowed} or lower`); return }
    if (amount < winBid) { setError(`Lowest claim is ${winBid}`); return }
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

  return (
    <div className="flex h-dvh flex-col items-center overflow-y-auto bg-[#0a0d14] p-2 text-white md:justify-center md:p-8 landscape-short:!justify-center landscape-short:!p-3 landscape-short:!overflow-hidden">
      <div className="grid w-full max-w-5xl gap-2 fade-in-up md:gap-4 landscape-short:!gap-2">

        <div className="flex items-baseline justify-between gap-3">
          <span className="mono-label text-[#ffd23f] text-xs font-bold">
            Bidding {state.round1Contests + 1}/{mode.bidding.contests}
          </span>
          <span className="mono-label text-[10px] text-white/35 tabular-nums">
            {teams[0].name} {teams[0].score} · {teams[1].name} {teams[1].score}
          </span>
        </div>

        <div className="grid gap-2 md:gap-4 lg:grid-cols-[0.9fr_1.1fr] landscape-short:grid-cols-[0.9fr_1.1fr] landscape-short:gap-3">

          {/* Words to clue */}
          <div className="rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5 landscape-short:!p-2">
            <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-3 landscape-short:!mb-1">{words.length} words to clue</p>
            <div className="mb-3 grid grid-cols-2 gap-1.5 md:gap-2 lg:grid-cols-1 landscape-short:!grid-cols-1 landscape-short:!mb-2 landscape-short:!gap-1">
              {words.map((w, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 md:gap-3 md:px-4 md:py-3 landscape-short:!py-0.5 landscape-short:!px-2">
                  <span className="font-mono text-[10px] text-white/35 md:text-xs">{String(i+1).padStart(2,'0')}</span>
                  <span className="min-w-0 truncate text-xs font-black uppercase tracking-normal md:text-base">{w}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setInput(''); setError(''); dispatch({ type: 'REFRESH_BID' }) }}
              className="mono-label w-full rounded-md border border-[#ffd23f]/40 py-1.5 text-[10px] text-[#ffd23f] transition-all hover:bg-[#ffd23f]/10 active:scale-95 md:py-2 landscape-short:!py-1"
            >
              New Words
            </button>
          </div>

          {/* Status + timer + urgent cluster + custom input */}
          <div className="flex flex-col gap-2 md:gap-3 landscape-short:!gap-2">

            <div className="rounded-lg border border-white/10 bg-[#101522] p-3 md:p-5 landscape-short:!p-2">
              {noBidsYet ? (
                <>
                  <p className="text-2xl font-black uppercase leading-tight md:text-3xl landscape-short:!text-lg">
                    <span style={{ color: activeColor }}>{activeTeam.name}</span>
                    <span className="text-white">, open the bidding.</span>
                  </p>
                  {activePlayers && (
                    <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-wide text-white/40 md:text-xs">{activePlayers}</p>
                  )}
                  <p className="mt-2 text-sm text-white/55 md:text-base landscape-short:!mt-1 landscape-short:!text-xs">
                    How many clue-words do you need for all {words.length}?
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-black uppercase leading-tight md:text-3xl landscape-short:!text-lg">
                    <span style={{ color: holderColor }}>{holderTeam.name}</span>
                    <span className="text-white"> says: </span>
                    <span className="text-[#ffd23f] tabular-nums">{currentBid}</span>
                    <span className="text-white"> is enough.</span>
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
              <div className="mt-3 flex items-center justify-between gap-3 md:mt-4 landscape-short:!mt-2">
                <div className="flex items-center gap-3">
                  <div className="landscape-short:hidden">
                    <Timer timeLeft={biddingTimeLeft} total={mode.timing.biddingSeconds} />
                  </div>
                  <div className="hidden landscape-short:!block">
                    <Timer timeLeft={biddingTimeLeft} total={mode.timing.biddingSeconds} size="xs" />
                  </div>
                  {timeExpired && (
                    <p className="text-xs font-bold text-[#ff3a6d]">Time&apos;s up — make a move.</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 landscape-short:!gap-1">
                  <button
                    onClick={() => { setInput(String(winBid)); setError('') }}
                    className="rounded-md border border-[#ff3a6d]/55 bg-[#ff3a6d]/10 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-normal text-[#ff3a6d] transition-all hover:bg-[#ff3a6d]/20 active:scale-95 md:px-3 md:py-2 md:text-xs landscape-short:!px-2 landscape-short:!py-1 landscape-short:!text-[10px]"
                  >
                    Set to {winBid}
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'CONCEDE' })}
                    className="rounded-md border border-[#ff3a6d]/55 bg-[#ff3a6d]/10 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-normal text-[#ff3a6d] transition-all hover:bg-[#ff3a6d]/20 active:scale-95 md:px-3 md:py-2 md:text-xs landscape-short:!px-2 landscape-short:!py-1 landscape-short:!text-[10px]"
                  >
                    Concede
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5 landscape-short:!gap-1.5 landscape-short:!p-2">
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
        </div>

        {/* Thumb-zone team selector */}
        <div className="grid grid-cols-2 gap-2 md:gap-4 landscape-short:!gap-2">
          {teams.map((team, i) => {
            const isActive = activeBidder === i
            const color = TEAM_COLORS[i]
            const players = teamPlayerLine(team.players, '', 4, 32)
            return (
              <button
                key={i}
                onClick={() => isActive && placeBid(resolvedBid)}
                disabled={!isActive}
                aria-label={`${team.name}: ${resolvedLabel}`}
                className={`flex flex-col items-center justify-center rounded-lg border-2 px-3 py-4 text-center transition-all active:scale-95 md:py-6 landscape-short:!py-3 ${
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
                {players && (
                  <span className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-white/45 md:text-[11px]">
                    {players}
                  </span>
                )}
                <span className="mt-1 text-2xl font-black uppercase leading-none tracking-normal text-white md:text-3xl landscape-short:!text-xl">
                  {resolvedLabel}
                </span>
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}
