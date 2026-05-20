import { normalizePlayerName } from './teamSetup'

const STORAGE_KEY = '25wol_used_words'
const SETUP_STORAGE_KEY = '25wol_setup'
export const USED_WORD_HISTORY_LIMIT = 10_000

export interface SavedSetupState {
  players: string[]
  teamNames: [string, string]
  teamPlayers: [string[], string[]]
  selectedMode: string
  challengesEnabled: boolean
  alcoholPromptsEnabled: boolean
}

function getBrowserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function readStorageItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function writeStorageItem(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // Storage can be unavailable or quota-limited in private/restricted browsers.
  }
}

function removeStorageItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // Ignore storage cleanup failures; gameplay should not depend on persistence.
  }
}

function normalizeWords(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const words: string[] = []
  const seen = new Set<string>()

  value.forEach(word => {
    if (typeof word !== 'string') return
    const normalized = word.trim().toUpperCase()
    if (!normalized) return

    if (seen.has(normalized)) {
      words.splice(words.indexOf(normalized), 1)
    }
    seen.add(normalized)
    words.push(normalized)
  })

  return words.slice(-USED_WORD_HISTORY_LIMIT)
}

export function readUsedWords(storage: Storage | undefined = getBrowserStorage()): string[] {
  if (!storage) return []

  try {
    return normalizeWords(JSON.parse(readStorageItem(storage, STORAGE_KEY) ?? '[]'))
  } catch {
    removeStorageItem(storage, STORAGE_KEY)
    return []
  }
}

export function writeUsedWords(words: string[], storage: Storage | undefined = getBrowserStorage()): void {
  if (!storage) return
  writeStorageItem(storage, STORAGE_KEY, JSON.stringify(normalizeWords(words)))
}

export function clearUsedWords(storage: Storage | undefined = getBrowserStorage()): void {
  if (!storage) return
  removeStorageItem(storage, STORAGE_KEY)
}

export function mergeUsedWords(current: string[], incoming: string[]): string[] {
  return normalizeWords([...current, ...incoming])
}

function normalizeNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((name): name is string => typeof name === 'string')
        .map(normalizePlayerName)
        .filter(Boolean)
    )
  ).slice(0, 24)
}

function normalizeTeamName(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 24) : fallback
}

function normalizeTeamPlayers(value: unknown, players: string[]): [string[], string[]] {
  const teamPlayers = Array.isArray(value) ? value : []
  const playerSet = new Set(players)
  const teamOne = normalizeNames(teamPlayers[0]).filter(name => playerSet.has(name))
  const teamOneSet = new Set(teamOne)
  const teamTwo = normalizeNames(teamPlayers[1]).filter(name => playerSet.has(name) && !teamOneSet.has(name))

  return [teamOne, teamTwo]
}

function normalizeSavedSetup(value: unknown): SavedSetupState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const teamNames = Array.isArray(record.teamNames) ? record.teamNames : []
  const players = normalizeNames(record.players)

  return {
    players,
    teamNames: [
      normalizeTeamName(teamNames[0], 'Team 1'),
      normalizeTeamName(teamNames[1], 'Team 2'),
    ],
    teamPlayers: normalizeTeamPlayers(record.teamPlayers, players),
    selectedMode: typeof record.selectedMode === 'string' && record.selectedMode.trim() ? record.selectedMode.trim() : 'classic',
    challengesEnabled: typeof record.challengesEnabled === 'boolean' ? record.challengesEnabled : true,
    alcoholPromptsEnabled: typeof record.alcoholPromptsEnabled === 'boolean' ? record.alcoholPromptsEnabled : false,
  }
}

export function readSavedSetup(storage: Storage | undefined = getBrowserStorage()): SavedSetupState | null {
  if (!storage) return null

  try {
    return normalizeSavedSetup(JSON.parse(readStorageItem(storage, SETUP_STORAGE_KEY) ?? 'null'))
  } catch {
    removeStorageItem(storage, SETUP_STORAGE_KEY)
    return null
  }
}

export function writeSavedSetup(setup: SavedSetupState, storage: Storage | undefined = getBrowserStorage()): void {
  if (!storage) return
  writeStorageItem(storage, SETUP_STORAGE_KEY, JSON.stringify(normalizeSavedSetup(setup)))
}

export function clearSavedSetup(storage: Storage | undefined = getBrowserStorage()): void {
  if (!storage) return
  removeStorageItem(storage, SETUP_STORAGE_KEY)
}
