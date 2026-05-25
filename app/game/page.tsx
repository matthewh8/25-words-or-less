import { parseGameQuery } from '@/lib/gameQuery'
import GameClient from './GameClient'

interface GamePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function GamePage({ searchParams }: GamePageProps) {
  const params = await searchParams
  const parsed = parseGameQuery(params)

  return (
    <GameClient
      team1Name={parsed.team1Name}
      team2Name={parsed.team2Name}
      teamPlayers={parsed.teamPlayers}
      challengeSettings={parsed.challengeSettings}
    />
  )
}
