'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PlayerChip from '@/components/PlayerChip'
import { teamPlayerLine } from '@/components/TeamNameBlock'
import type { GameModeSummary } from '@/lib/gameMode'
import { clearSavedSetup, clearUsedWords, readSavedSetup, writeSavedSetup } from '@/lib/storage'
import {
  assignPlayerToTeam,
  normalizePlayerName,
  parsePlayerNames,
  randomizeBalancedTeams,
  type TeamIndex,
} from '@/lib/teamSetup'

interface HomeClientProps {
  gameModes: GameModeSummary[]
}

function encodePlayers(players: string[]): string {
  return players.map(normalizePlayerName).filter(Boolean).join('|')
}

export default function HomeClient({ gameModes }: HomeClientProps) {
  const router = useRouter()
  const firstMode = gameModes[0]?.id ?? 'classic'
  const [teamNames, setTeamNames] = useState<[string, string]>(['Team 1', 'Team 2'])
  const [selectedMode, setSelectedMode] = useState(firstMode)
  const [players, setPlayers] = useState<string[]>([])
  const [teamPlayers, setTeamPlayers] = useState<[string[], string[]]>([[], []])
  const [draftNames, setDraftNames] = useState('')
  const [challengesEnabled, setChallengesEnabled] = useState(gameModes[0]?.challengeDefault ?? true)
  const [alcoholPromptsEnabled, setAlcoholPromptsEnabled] = useState(gameModes[0]?.alcoholDefault ?? false)
  const [cleared, setCleared] = useState(false)
  const setupHydratedRef = useRef(false)
  const skipNextSetupWriteRef = useRef(false)
  const clearNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedModeSummary = useMemo(
    () => gameModes.find(mode => mode.id === selectedMode) ?? gameModes[0],
    [gameModes, selectedMode]
  )

  const assigned = useMemo(() => new Set([...teamPlayers[0], ...teamPlayers[1]]), [teamPlayers])
  const bench = players.filter(player => !assigned.has(player))
  const rosterLanes = [
    {
      id: 'bench',
      title: 'Bench',
      names: bench,
      tone: 'text-[#ffd23f]',
      border: 'border-[#ffd23f]/25',
      dot: 'bg-[#ffd23f]',
      empty: 'Waiting for players',
    },
    {
      id: 'team-1',
      title: teamNames[0] || 'Team 1',
      names: teamPlayers[0],
      tone: 'text-[#ff8cab]',
      border: 'border-[#ff3a6d]/25',
      dot: 'bg-[#ff3a6d]',
      empty: 'No one assigned',
    },
    {
      id: 'team-2',
      title: teamNames[1] || 'Team 2',
      names: teamPlayers[1],
      tone: 'text-[#8bb8ff]',
      border: 'border-[#3a8bff]/25',
      dot: 'bg-[#3a8bff]',
      empty: 'No one assigned',
    },
  ] as const

  useEffect(() => {
    const saved = readSavedSetup()
    if (!saved) {
      setupHydratedRef.current = true
      return
    }
    skipNextSetupWriteRef.current = true
    // Hydrate localStorage-backed setup after SSR to avoid a client/server markup mismatch.
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage is only available after mount, so setup restores after hydration. */
    setPlayers(saved.players)
    setTeamNames(saved.teamNames)
    setTeamPlayers(saved.teamPlayers)
    setSelectedMode(gameModes.some(mode => mode.id === saved.selectedMode) ? saved.selectedMode : firstMode)
    setChallengesEnabled(saved.challengesEnabled)
    setAlcoholPromptsEnabled(saved.alcoholPromptsEnabled)
    /* eslint-enable react-hooks/set-state-in-effect */
    setupHydratedRef.current = true
  }, [firstMode, gameModes])

  useEffect(() => {
    if (!setupHydratedRef.current) return
    if (skipNextSetupWriteRef.current) {
      skipNextSetupWriteRef.current = false
      return
    }
    writeSavedSetup({
      players,
      teamNames,
      teamPlayers,
      selectedMode,
      challengesEnabled,
      alcoholPromptsEnabled,
    })
  }, [alcoholPromptsEnabled, challengesEnabled, players, selectedMode, teamNames, teamPlayers])

  useEffect(() => {
    return () => {
      if (clearNoticeTimeoutRef.current) clearTimeout(clearNoticeTimeoutRef.current)
    }
  }, [])

  function setTeamName(index: TeamIndex, value: string) {
    setTeamNames(prev => {
      const next: [string, string] = [...prev]
      next[index] = value.slice(0, 24)
      return next
    })
  }

  function addPlayers() {
    const names = parsePlayerNames(draftNames)
    if (!names.length) return
    const nextPlayers = Array.from(new Set([...players, ...names])).slice(0, 24)
    setPlayers(nextPlayers)
    setDraftNames('')
  }

  function removePlayer(player: string) {
    setPlayers(prev => prev.filter(name => name !== player))
    setTeamPlayers(prev => [
      prev[0].filter(name => name !== player),
      prev[1].filter(name => name !== player),
    ])
  }

  function assignPlayer(player: string, team: TeamIndex | null) {
    setTeamPlayers(prev => assignPlayerToTeam(prev, player, team))
  }

  function playerAssignment(player: string): TeamIndex | null {
    if (teamPlayers[0].includes(player)) return 0
    if (teamPlayers[1].includes(player)) return 1
    return null
  }

  function randomizeTeams() {
    setTeamPlayers(randomizeBalancedTeams(players))
  }

  function clearHistory() {
    clearUsedWords()
    setCleared(true)
    if (clearNoticeTimeoutRef.current) clearTimeout(clearNoticeTimeoutRef.current)
    clearNoticeTimeoutRef.current = setTimeout(() => {
      setCleared(false)
      clearNoticeTimeoutRef.current = null
    }, 2000)
  }

  function clearSetup() {
    skipNextSetupWriteRef.current = true
    setPlayers([])
    setTeamPlayers([[], []])
    setTeamNames(['Team 1', 'Team 2'])
    setSelectedMode(firstMode)
    setChallengesEnabled(gameModes[0]?.challengeDefault ?? true)
    setAlcoholPromptsEnabled(gameModes[0]?.alcoholDefault ?? false)
    setDraftNames('')
    clearSavedSetup()
  }

  function chooseMode(modeId: string) {
    const mode = gameModes.find(item => item.id === modeId)
    if (!mode) return
    setSelectedMode(mode.id)
    setChallengesEnabled(mode.challengeDefault)
    setAlcoholPromptsEnabled(mode.alcoholDefault)
  }

  function startGame() {
    const params = new URLSearchParams({
      mode: selectedMode,
      t1: teamNames[0].trim() || 'Team 1',
      t2: teamNames[1].trim() || 'Team 2',
      challenges: challengesEnabled ? '1' : '0',
      alcohol: alcoholPromptsEnabled ? '1' : '0',
    })
    if (teamPlayers[0].length) params.set('p1', encodePlayers(teamPlayers[0]))
    if (teamPlayers[1].length) params.set('p2', encodePlayers(teamPlayers[1]))
    router.push(`/game?${params}`)
  }

  return (
    <div className="h-full overflow-hidden bg-[#0a0d14] p-1.5 text-white sm:p-3 lg:p-4 landscape-short:p-2">
      <main className="mx-auto grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-1.5 lg:grid-cols-[0.52fr_1.48fr] lg:grid-rows-none lg:gap-3 landscape-short:grid-cols-[0.5fr_1.5fr] landscape-short:grid-rows-none landscape-short:gap-2">
        <section className="grid min-h-0 min-w-0 gap-1.5 rounded-lg border border-white/10 bg-[#101522] p-2 sm:gap-2 sm:p-3 lg:flex lg:flex-col lg:justify-between lg:p-5">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-normal sm:text-3xl lg:text-5xl">FIVE</span>
              <span className="font-mono text-xs font-semibold text-[#ffd23f]">05</span>
            </div>
            <h1 className="text-right text-xl font-black uppercase leading-[0.86] tracking-normal sm:text-2xl lg:mt-6 lg:text-left lg:text-6xl">
              Party setup
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-3">
            {teamNames.map((name, index) => (
              <label key={index} className="block min-w-0">
                <span className="mono-label sr-only mb-1 text-[9px] text-white/40 sm:not-sr-only sm:block">Team {index + 1}</span>
                <div className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-[#0a0d14] px-3 focus-within:border-[#ffd23f] sm:h-10 lg:h-12">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? 'bg-[#ff3a6d]' : 'bg-[#3a8bff]'}`} />
                  <input
                    value={name}
                    onChange={event => setTeamName(index as TeamIndex, event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && startGame()}
                    aria-label={`Team ${index + 1} name`}
                    placeholder={`Team ${index + 1}`}
                    maxLength={24}
                    className="min-w-0 flex-1 bg-transparent text-base font-black text-white outline-none placeholder:text-white/25 lg:text-lg"
                  />
                </div>
                <p className="mt-1 truncate text-[10px] font-bold text-white/35">
                  {teamPlayerLine(teamPlayers[index as TeamIndex], 'No players assigned', 4, 28)}
                </p>
              </label>
            ))}
          </div>

          <div className="grid items-start gap-1.5">
            <button
              onClick={startGame}
              className="h-9 w-full rounded-md bg-[#ffd23f] text-sm font-black uppercase leading-none tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-[0.98] sm:h-11 sm:text-base lg:h-14 lg:text-lg"
            >
              Start Game
            </button>
            <div className="grid grid-cols-2 items-start gap-1.5">
              <button
                onClick={clearHistory}
                className="mono-label h-7 rounded-md border border-white/10 text-[8px] leading-none text-white/45 transition-colors hover:text-white/75 sm:h-9 sm:text-[9px] lg:h-11"
              >
                {cleared ? 'History cleared' : 'Reset words'}
              </button>
              <button
                onClick={clearSetup}
                className="mono-label h-7 rounded-md border border-white/10 text-[8px] leading-none text-white/45 transition-colors hover:text-white/75 sm:h-9 sm:text-[9px] lg:h-11"
              >
                Clear setup
              </button>
            </div>
          </div>
        </section>

        <section className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-2 md:grid-cols-[minmax(18rem,1.08fr)_minmax(17rem,0.92fr)] md:grid-rows-none lg:gap-3">
          <div className="order-1 flex min-h-0 min-w-0 flex-col rounded-lg border border-white/10 bg-[#141826] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:p-4">
            <div className="mb-1 flex shrink-0 items-end justify-between gap-3 sm:mb-2 sm:gap-4">
              <div>
                <p className="mono-label text-[10px] text-[#ffd23f]">Players</p>
                <h2 className="mt-0.5 text-base font-black uppercase tracking-normal sm:text-xl lg:text-2xl">
                  {players.length === 0 ? 'No players' : `${players.length} ${players.length === 1 ? 'player' : 'players'}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={randomizeTeams}
                disabled={players.length < 2}
                className="h-7 rounded-md border border-[#ffd23f]/40 px-3 text-xs font-black leading-none text-[#ffd23f] transition-all hover:bg-[#ffd23f]/10 active:scale-95 disabled:opacity-30 sm:h-9 sm:text-sm"
              >
                Random
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <input
                value={draftNames}
                onChange={event => setDraftNames(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addPlayers()
                  }
                }}
                placeholder="Add player, press Enter"
                className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0a0d14] px-3 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-[#ffd23f]/60 sm:h-10 sm:text-sm"
              />
              <button
                type="button"
                onClick={addPlayers}
                className="h-10 rounded-md bg-white/[0.06] px-3 text-sm font-black uppercase leading-none text-white transition-all hover:bg-white/[0.1] active:scale-95 sm:h-10 sm:px-4 sm:text-sm"
              >
                Add
              </button>
            </div>

            <div className="panel-scroll mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid content-start gap-2">
              {rosterLanes.map(lane => (
                <div
                  key={lane.id}
                  className={`min-h-12 min-w-0 rounded-md border sm:min-h-[4.75rem] ${lane.border} bg-[#0a0d14] p-1.5 sm:p-2`}
                >
                  <div className="flex items-center justify-between gap-2 leading-none">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${lane.dot}`} />
                      <p className={`mono-label min-w-0 truncate text-[9px] leading-none ${lane.tone}`}>{lane.title}</p>
                    </div>
                    <span className="mono-label shrink-0 text-[9px] leading-none text-white/35">{lane.names.length}</span>
                  </div>

                  <div className="mt-1.5 flex min-w-0 flex-wrap content-start gap-1.5 sm:mt-2">
                    {lane.names.map(player => (
                      <PlayerChip
                        key={player}
                        player={player}
                        assignment={playerAssignment(player)}
                        team1Name={teamNames[0]}
                        team2Name={teamNames[1]}
                        onAssign={assignPlayer}
                        onRemove={removePlayer}
                      />
                    ))}
                    {!lane.names.length && players.length === 0 && (
                      <p className="grid h-7 w-full place-items-center rounded-md border border-dashed border-white/10 text-center text-[11px] font-bold text-white/25 sm:h-10">
                        {lane.empty}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>

            {players.length > 0 && (
              <div className="mt-1 flex shrink-0 items-center justify-between gap-2 text-[10px] text-white/35 sm:mt-1.5 sm:text-[11px]">
                <p className="min-w-0 truncate">
                  {Math.abs(teamPlayers[0].length - teamPlayers[1].length) <= 1 ? 'Balanced' : 'Uneven'} / {bench.length} bench / {players.length} total
                </p>
              </div>
            )}
          </div>

          <div className="order-2 flex min-h-0 min-w-0 flex-col rounded-lg border border-white/10 bg-[#141826] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:p-4">
            <div className="mb-1 flex shrink-0 items-end justify-between gap-3 sm:mb-2">
              <div className="min-w-0">
                <p className="mono-label text-[10px] text-[#ffd23f]">Game mode</p>
                <h2 className="sr-only mt-0.5 truncate text-lg font-black uppercase tracking-normal sm:not-sr-only sm:block sm:text-xl lg:text-2xl">{selectedModeSummary?.name ?? 'Classic'}</h2>
              </div>
              <p className="mono-label hidden shrink-0 text-right text-[9px] text-white/35 sm:block">
                {selectedModeSummary?.bidContests ?? 2} bid / {selectedModeSummary?.stackRounds.length ?? 2} stack / {selectedModeSummary?.moneyWords ?? 10} final
              </p>
            </div>

            <select
              value={selectedMode}
              onChange={event => chooseMode(event.target.value)}
              aria-label="Game mode"
              className="h-10 w-full shrink-0 rounded-md border border-[#ffd23f]/40 bg-[#0a0d14] px-3 text-base font-black uppercase text-white outline-none focus:border-[#ffd23f] sm:hidden"
            >
              {gameModes.map(mode => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>

            <div className="panel-scroll mt-2 hidden min-h-0 flex-1 overflow-y-auto pr-1 sm:block">
              <div className="grid auto-rows-[5.25rem] grid-cols-1 gap-1.5 xl:grid-cols-2">
                {gameModes.map(mode => {
                  const selected = selectedMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => chooseMode(mode.id)}
                      className={`h-full overflow-hidden rounded-md border px-2.5 py-2 text-left transition-all active:scale-[0.99] ${
                        selected
                          ? 'border-[#ffd23f] bg-[#ffd23f]/10 shadow-[inset_0_0_0_1px_rgba(255,210,63,0.18)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.055]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-black uppercase leading-none">{mode.name}</span>
                        <span className={`mono-label shrink-0 rounded border px-1.5 py-1 text-[8px] leading-none ${selected ? 'border-[#ffd23f]/35 text-[#ffd23f]' : 'border-white/10 text-white/35'}`}>
                          {mode.shortName}
                        </span>
                      </div>
                      <p className="mt-1.5 overflow-hidden text-[11px] leading-snug text-white/45 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        {mode.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-1 grid shrink-0 grid-cols-2 gap-1.5 sm:mt-2">
              <label className="flex h-7 items-center justify-between gap-2 rounded-md border border-white/10 bg-[#0a0d14] px-2 sm:h-10">
                <span className="truncate text-[10px] font-bold leading-none text-white/75 sm:text-xs">Party prompts</span>
                <input
                  type="checkbox"
                  checked={challengesEnabled}
                  onChange={event => setChallengesEnabled(event.target.checked)}
                  className="h-4 w-4 shrink-0 accent-[#ffd23f] sm:h-5 sm:w-5"
                />
              </label>
              <label className="flex h-7 items-center justify-between gap-2 rounded-md border border-white/10 bg-[#0a0d14] px-2 sm:h-10">
                <span className="truncate text-[10px] font-bold leading-none text-white/75 sm:text-xs">21+ options</span>
                <input
                  type="checkbox"
                  checked={alcoholPromptsEnabled}
                  onChange={event => setAlcoholPromptsEnabled(event.target.checked)}
                  disabled={!challengesEnabled}
                  className="h-4 w-4 shrink-0 accent-[#ffd23f] disabled:opacity-30 sm:h-5 sm:w-5"
                />
              </label>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
