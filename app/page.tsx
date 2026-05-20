import { listGameModes } from '@/lib/gameModeServer'
import HomeClient from './HomeClient'

export default async function Home() {
  const gameModes = await listGameModes()
  return <HomeClient gameModes={gameModes} />
}
