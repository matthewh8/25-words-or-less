import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'yaml'
import {
  buildGameMode,
  DEFAULT_GAME_MODE,
  summarizeGameMode,
  validateGameModeDefinition,
  type GameMode,
  type GameModeSummary,
} from './gameMode'

const GAME_MODE_DIR = path.join(process.cwd(), 'gamemodes')
const DEFAULT_MODE_ID = DEFAULT_GAME_MODE.id

function safeModeId(value: string | undefined): string {
  const id = value?.trim() || DEFAULT_MODE_ID
  return /^[a-z0-9-]+$/i.test(id) ? id : DEFAULT_MODE_ID
}

async function readGameModeYaml(modeId: string): Promise<string> {
  return readFile(path.join(GAME_MODE_DIR, `${modeId}.yaml`), 'utf8')
}

function validationError(modeId: string, errors: string[]): Error {
  return new Error(`Invalid game mode "${modeId}":\n- ${errors.join('\n- ')}`)
}

export async function loadGameMode(modeId?: string): Promise<GameMode> {
  const safeId = safeModeId(modeId)

  try {
    const parsed = parse(await readGameModeYaml(safeId))
    const errors = validateGameModeDefinition(parsed)
    if (errors.length) throw validationError(safeId, errors)
    return buildGameMode(parsed)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') throw error
    if (safeId === DEFAULT_MODE_ID) return DEFAULT_GAME_MODE
    return loadGameMode(DEFAULT_MODE_ID)
  }
}

export async function listGameModes(): Promise<GameModeSummary[]> {
  try {
    const files = await readdir(GAME_MODE_DIR)
    const summaries = await Promise.all(
      files
        .filter(file => file.endsWith('.yaml'))
        .map(async file => {
          const routeId = file.replace(/\.yaml$/, '')
          const mode = await loadGameMode(routeId)
          return { ...summarizeGameMode(mode), id: routeId }
        })
    )
    return summaries.sort((a, b) => {
      if (a.id === DEFAULT_MODE_ID) return -1
      if (b.id === DEFAULT_MODE_ID) return 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return [summarizeGameMode(DEFAULT_GAME_MODE)]
  }
}
