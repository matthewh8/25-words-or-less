'use client'

import { useReducer, useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { gameReducer, initGame } from '@/lib/gameState'
import BiddingRound from '@/components/BiddingRound'
import ClueGiverView from '@/components/ClueGiverView'
import RoundResult from '@/components/RoundResult'
import RoundIntro from '@/components/RoundIntro'
import ColorSelection from '@/components/ColorSelection'
import MoneyRound from '@/components/MoneyRound'
import FinalScoreboard from '@/components/FinalScoreboard'
import PassToClueGiver from '@/components/PassToClueGiver'
import PassToBidders from '@/components/PassToBidders'

const CLUING_PHASES = new Set(['round1_cluing', 'round23_cluing', 'money_cluing'])

function GameInner() {
  const params = useSearchParams()
  const t1 = params.get('t1') ?? 'Team 1'
  const t2 = params.get('t2') ?? 'Team 2'

  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    const saved = typeof window !== 'undefined'
      ? (JSON.parse(localStorage.getItem('25wol_used_words') ?? '[]') as string[])
      : []
    return initGame(t1, t2, saved)
  })
  const [cluingReady, setCluingReady] = useState(false)
  const [biddingReady, setBiddingReady] = useState(false)

  // Persist used words to localStorage when game ends
  useEffect(() => {
    if (state.phase === 'final') {
      const prev = JSON.parse(localStorage.getItem('25wol_used_words') ?? '[]') as string[]
      const merged = Array.from(new Set([...prev, ...state.usedWords]))
      localStorage.setItem('25wol_used_words', JSON.stringify(merged))
    }
  }, [state.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset gates when entering new phases
  useEffect(() => {
    if (CLUING_PHASES.has(state.phase)) setCluingReady(false)
  }, [state.phase])

  useEffect(() => {
    if (state.phase === 'round1_bidding') setBiddingReady(false)
  }, [state.phase, state.bid?.words])

  const isCluing = CLUING_PHASES.has(state.phase)
  const isBidding = state.phase === 'round1_bidding'

  if (isCluing && !cluingReady) {
    return <PassToClueGiver state={state} onReady={() => setCluingReady(true)} />
  }
  if (isCluing && cluingReady) {
    return <ClueGiverView state={state} dispatch={dispatch} />
  }

  if (isBidding && !biddingReady) {
    return <PassToBidders state={state} onReady={() => setBiddingReady(true)} />
  }
  if (isBidding && biddingReady) {
    return <BiddingRound state={state} dispatch={dispatch} />
  }

  switch (state.phase) {
    case 'round1_intro':
    case 'round23_intro':
      return <RoundIntro state={state} dispatch={dispatch} />

    case 'round1_result':
    case 'round23_result':
      return <RoundResult state={state} dispatch={dispatch} />

    case 'round23_selection':
      return <ColorSelection state={state} dispatch={dispatch} />

    case 'money_intro':
    case 'money_result':
      return <MoneyRound state={state} dispatch={dispatch} />

    case 'final':
      return <FinalScoreboard state={state} onRestart={() => window.location.href = '/'} />

    default:
      return null
  }
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center text-white text-2xl font-bold">
        Loading…
      </div>
    }>
      <GameInner />
    </Suspense>
  )
}
