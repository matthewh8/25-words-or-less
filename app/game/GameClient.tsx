'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { gameReducer, initGame, isCluingPhase } from '@/lib/gameState'
import type { GameAction, GameState } from '@/lib/gameState'
import type { GameMode } from '@/lib/gameMode'
import type { ChallengeSettings } from '@/lib/challenges'
import { actionFromDeal, planDeal } from '@/lib/dealPlan'
import type { DealRequest, DealResponse } from '@/lib/dealPlan'
import { readUsedWords, writeUsedWords } from '@/lib/storage'
import BiddingRound from '@/components/BiddingRound'
import ClueGiverView from '@/components/ClueGiverView'
import RoundResult from '@/components/RoundResult'
import RoundIntro from '@/components/RoundIntro'
import StackSelection from '@/components/StackSelection'
import MoneyIntro from '@/components/MoneyIntro'
import MoneyResult from '@/components/MoneyResult'
import FinalScoreboard from '@/components/FinalScoreboard'
import PassToClueGiver from '@/components/PassToClueGiver'
import Premeditation from '@/components/Premeditation'

interface GameClientProps {
  team1Name: string
  team2Name: string
  teamPlayers: [string[], string[]]
  challengeSettings: ChallengeSettings
  gameMode: GameMode
}

async function requestDeal(body: DealRequest): Promise<DealResponse> {
  const response = await fetch('/api/deal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Deal request failed (${response.status})`)
  }

  return response.json() as Promise<DealResponse>
}

function cluingReadyKey(state: GameState): string | null {
  if (!isCluingPhase(state.phase) || !state.cluing) return null
  if (state.cluing.stream === 'bidding') return null
  return [
    state.phase,
    state.currentRound,
    state.round1Contests,
    state.cluing.stream,
    state.cluing.cluingTeam,
    state.cluing.stackId ?? '',
    state.cluing.words.join('|'),
  ].join(':')
}

export default function GameClient({ team1Name, team2Name, teamPlayers, challengeSettings, gameMode }: GameClientProps) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    return initGame(team1Name, team2Name, readUsedWords(), gameMode, teamPlayers, challengeSettings)
  })
  const stateRef = useRef(state)
  const pendingDealRef = useRef(false)
  const [cluingReadyFor, setCluingReadyFor] = useState<string | null>(null)
  const [dealPending, setDealPending] = useState(false)
  const [dealError, setDealError] = useState('')

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (state.phase === 'final') {
      writeUsedWords(state.usedWords)
    }
  }, [state.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const dispatchWithDeals = useCallback((action: GameAction) => {
    const dealAndDispatch = async () => {
      const current = stateRef.current
      const plan = planDeal(current, action)

      if (plan.type === 'direct') {
        dispatch(plan.action)
        return
      }

      if (pendingDealRef.current) return
      pendingDealRef.current = true
      setDealPending(true)
      setDealError('')
      try {
        const deal = await requestDeal(plan.request)
        dispatch(actionFromDeal(plan, deal))
      } catch (error) {
        setDealError(error instanceof Error ? error.message : 'Could not deal words')
      } finally {
        pendingDealRef.current = false
        setDealPending(false)
      }
    }

    void dealAndDispatch()
  }, [])

  const dealOverlay = (
    <>
      {dealPending && (
        <div className="fixed right-2 top-2 z-50 rounded-md border border-[#ffd23f]/30 bg-[#101522]/95 px-3 py-2 text-[11px] font-black uppercase text-[#ffd23f] shadow-xl">
          Dealing words
        </div>
      )}
      {dealError && (
        <button
          type="button"
          onClick={() => setDealError('')}
          className="fixed right-2 top-2 z-50 max-w-[calc(100vw-1rem)] rounded-md border border-[#ff3a6d]/35 bg-[#2a1020]/95 px-3 py-2 text-left text-[11px] font-bold text-[#ff8aaa] shadow-xl"
        >
          {dealError}
        </button>
      )}
    </>
  )

  const isCluing = isCluingPhase(state.phase)
  const activeCluingKey = cluingReadyKey(state)
  const cluingReady = activeCluingKey !== null && cluingReadyFor === activeCluingKey
  const needsPassToClueGiver = activeCluingKey !== null

  if (isCluing && needsPassToClueGiver && !cluingReady) {
    return <>{dealOverlay}<PassToClueGiver state={state} onReady={() => setCluingReadyFor(activeCluingKey)} /></>
  }
  if (isCluing) {
    return <>{dealOverlay}<ClueGiverView state={state} dispatch={dispatchWithDeals} /></>
  }

  if (state.phase === 'round1_bidding') {
    return <>{dealOverlay}<BiddingRound state={state} dispatch={dispatchWithDeals} /></>
  }

  if (state.phase === 'round1_premeditation') {
    return <>{dealOverlay}<Premeditation state={state} dispatch={dispatchWithDeals} /></>
  }

  switch (state.phase) {
    case 'round1_intro':
    case 'round23_intro':
      return <>{dealOverlay}<RoundIntro state={state} dispatch={dispatchWithDeals} /></>

    case 'round1_result':
    case 'round23_result':
      return <>{dealOverlay}<RoundResult state={state} dispatch={dispatchWithDeals} /></>

    case 'round23_selection':
      return <>{dealOverlay}<StackSelection state={state} dispatch={dispatchWithDeals} /></>

    case 'money_intro':
      return <>{dealOverlay}<MoneyIntro state={state} dispatch={dispatchWithDeals} /></>

    case 'money_result':
      return <>{dealOverlay}<MoneyResult state={state} dispatch={dispatchWithDeals} /></>

    case 'final':
      return <>{dealOverlay}<FinalScoreboard state={state} dispatch={dispatch} onRestart={() => window.location.href = '/'} /></>

    default:
      return null
  }
}
