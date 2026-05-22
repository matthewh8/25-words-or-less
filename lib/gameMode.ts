export type WordDeckId = 'bidding' | 'green' | 'yellow' | 'red' | 'money'
export type ClueStream = 'bidding' | 'stack' | 'money'
export type FailureAward = 'opponent' | 'cluing' | 'none'
export type ChallengeFrequency = 'off' | 'low' | 'normal' | 'high'

export interface GameModeTiming {
  turnSeconds: number
  moneySeconds: number
  biddingSeconds: number
  premeditationSeconds: number
  minSeconds: number
  maxSeconds: number
  turnPresets: number[]
  moneyPresets: number[]
}

export interface BiddingRules {
  title: string
  contests: number
  wordDeck: WordDeckId
  wordCount: number
  minBid: number
  maxBid: number
  successPoints: number
  failurePoints: number
  failureAward: FailureAward
}

export interface StackRoundRules {
  number: number
  turns: number
  startTeam: 0 | 1
}

export interface StackOptionRules {
  id: string
  label: string
  wordDeck: WordDeckId
  pointsPerWord: number
  color: string
}

export interface StackRules {
  title: string
  wordCount: number
  wordLimit: number
  allCorrectBonus: number
  rounds: StackRoundRules[]
  options: StackOptionRules[]
}

export interface MoneyRules {
  title: string
  wordDeck: WordDeckId
  wordCount: number
  wordLimit: number
  jackpotPoints: number
}

export interface AccessibilityDefaults {
  speechRecognitionDefault: boolean
  announceControls: boolean
}

export interface ClueActionRules {
  allowSkip: boolean
  allowBudgetRefund: boolean
  autoAdvanceOnCorrect: boolean
}

export interface ChallengePromptRules {
  zeroCorrect: string[]
  manySkips: string[]
  perfect: string[]
  closeFailure: string[]
  moneyWin: string[]
  moneyFail: string[]
  standard: string[]
}

export interface ChallengeRules {
  enabledByDefault: boolean
  includeAlcoholByDefault: boolean
  maxPerGame: number
  frequency: ChallengeFrequency
  prompts: ChallengePromptRules
}

export interface GameMode {
  id: string
  name: string
  shortName: string
  description: string
  roundCount: number
  timing: GameModeTiming
  bidding: BiddingRules
  stacks: StackRules
  money: MoneyRules
  clueActions: ClueActionRules
  challenge: ChallengeRules
  accessibility: AccessibilityDefaults
}

export interface GameModeSummary {
  id: string
  name: string
  shortName: string
  description: string
  bidContests: number
  stackRounds: number[]
  moneyWords: number
  challengeDefault: boolean
  alcoholDefault: boolean
}

type UnknownRecord = Record<string, unknown>

export const DEFAULT_GAME_MODE: GameMode = {
  id: 'classic',
  name: 'Classic 25',
  shortName: 'FIVE',
  description: 'Classic two-team 25 Words or Less flow with bidding, color stacks, and a money round.',
  roundCount: 4,
  timing: {
    turnSeconds: 45,
    moneySeconds: 60,
    biddingSeconds: 15,
    premeditationSeconds: 15,
    minSeconds: 10,
    maxSeconds: 300,
    turnPresets: [30, 45, 60, 90],
    moneyPresets: [45, 60, 90, 120],
  },
  bidding: {
    title: 'The Bid',
    contests: 2,
    wordDeck: 'bidding',
    wordCount: 5,
    minBid: 5,
    maxBid: 25,
    successPoints: 10,
    failurePoints: 10,
    failureAward: 'opponent',
  },
  stacks: {
    title: 'Color Stacks',
    wordCount: 5,
    wordLimit: 25,
    allCorrectBonus: 5,
    rounds: [
      { number: 2, turns: 3, startTeam: 0 },
      { number: 3, turns: 3, startTeam: 1 },
    ],
    options: [
      { id: 'green', label: 'Green', wordDeck: 'green', pointsPerWord: 1, color: '#2de584' },
      { id: 'yellow', label: 'Yellow', wordDeck: 'yellow', pointsPerWord: 2, color: '#ffd23f' },
      { id: 'red', label: 'Red', wordDeck: 'red', pointsPerWord: 3, color: '#ff3a6d' },
    ],
  },
  money: {
    title: 'Money Round',
    wordDeck: 'money',
    wordCount: 10,
    wordLimit: 25,
    jackpotPoints: 25,
  },
  clueActions: {
    allowSkip: true,
    allowBudgetRefund: true,
    autoAdvanceOnCorrect: true,
  },
  challenge: {
    enabledByDefault: true,
    includeAlcoholByDefault: false,
    maxPerGame: 5,
    frequency: 'normal',
    prompts: {
      zeroCorrect: [],
      manySkips: [],
      perfect: [],
      closeFailure: [],
      moneyWin: [],
      moneyFail: [],
      standard: [],
    },
  },
  accessibility: {
    speechRecognitionDefault: false,
    announceControls: true,
  },
}

export const DECK_IDS = new Set<WordDeckId>(['bidding', 'green', 'yellow', 'red', 'money'])
const FAILURE_AWARDS = new Set<FailureAward>(['opponent', 'cluing', 'none'])
const CHALLENGE_FREQUENCIES = new Set<ChallengeFrequency>(['off', 'low', 'normal', 'high'])

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function section(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {}
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function positiveInt(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback
}

function nonNegativeInt(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback
}

function boundedTeam(value: unknown, fallback: 0 | 1): 0 | 1 {
  return value === 0 || value === 1 ? value : fallback
}

function intArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback
  const values = value.filter((item): item is number => Number.isInteger(item) && item > 0)
  return values.length ? values : fallback
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const values = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
  return values.length ? values : fallback
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function deckId(value: unknown, fallback: WordDeckId): WordDeckId {
  return typeof value === 'string' && DECK_IDS.has(value as WordDeckId) ? value as WordDeckId : fallback
}

function failureAward(value: unknown, fallback: FailureAward): FailureAward {
  return typeof value === 'string' && FAILURE_AWARDS.has(value as FailureAward)
    ? value as FailureAward
    : fallback
}

function challengeFrequency(value: unknown, fallback: ChallengeFrequency): ChallengeFrequency {
  return typeof value === 'string' && CHALLENGE_FREQUENCIES.has(value as ChallengeFrequency)
    ? value as ChallengeFrequency
    : fallback
}

function colorValue(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  return /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback
}

function promptRules(value: unknown, fallback: ChallengePromptRules): ChallengePromptRules {
  const record = section(value)
  return {
    zeroCorrect: stringArray(record.zeroCorrect, fallback.zeroCorrect),
    manySkips: stringArray(record.manySkips, fallback.manySkips),
    perfect: stringArray(record.perfect, fallback.perfect),
    closeFailure: stringArray(record.closeFailure, fallback.closeFailure),
    moneyWin: stringArray(record.moneyWin, fallback.moneyWin),
    moneyFail: stringArray(record.moneyFail, fallback.moneyFail),
    standard: stringArray(record.standard, fallback.standard),
  }
}

function stackOptions(value: unknown, fallback: StackOptionRules[]): StackOptionRules[] {
  if (!Array.isArray(value)) return fallback

  const options = value
    .map((item, index) => {
      const record = section(item)
      const fallbackOption = fallback[index] ?? fallback[0]
      return {
        id: stringValue(record.id, fallbackOption.id),
        label: stringValue(record.label, fallbackOption.label),
        wordDeck: deckId(record.wordDeck, fallbackOption.wordDeck),
        pointsPerWord: nonNegativeInt(record.pointsPerWord, fallbackOption.pointsPerWord),
        color: colorValue(record.color, fallbackOption.color),
      }
    })
    .filter(option => option.id)

  const seen = new Set<string>()
  const unique = options.filter(option => {
    if (seen.has(option.id)) return false
    seen.add(option.id)
    return true
  })

  return unique.length ? unique : fallback
}

function stackRounds(value: unknown, fallback: StackRoundRules[]): StackRoundRules[] {
  if (!Array.isArray(value)) return fallback

  const rounds = value.map((item, index) => {
    const record = section(item)
    const fallbackRound = fallback[index] ?? fallback[0]
    return {
      number: positiveInt(record.number, fallbackRound.number),
      turns: positiveInt(record.turns, fallbackRound.turns),
      startTeam: boundedTeam(record.startTeam, fallbackRound.startTeam),
    }
  })

  return rounds.length ? rounds : fallback
}

export function buildGameMode(raw: unknown, fallback: GameMode = DEFAULT_GAME_MODE): GameMode {
  const root = section(raw)
  const timing = section(root.timing)
  const bidding = section(root.bidding)
  const stacks = section(root.stacks)
  const money = section(root.money)
  const clueActions = section(root.clueActions)
  const challenge = section(root.challenge)
  const challengePrompts = section(challenge.prompts)
  const accessibility = section(root.accessibility)

  const minSeconds = positiveInt(timing.minSeconds, fallback.timing.minSeconds)
  const maxSeconds = Math.max(minSeconds, positiveInt(timing.maxSeconds, fallback.timing.maxSeconds))
  const minBid = positiveInt(bidding.minBid, fallback.bidding.minBid)
  const maxBid = Math.max(minBid + 1, positiveInt(bidding.maxBid, fallback.bidding.maxBid))
  const builtStackRounds = stackRounds(stacks.rounds, fallback.stacks.rounds)

  return {
    id: stringValue(root.id, fallback.id),
    name: stringValue(root.name, fallback.name),
    shortName: stringValue(root.shortName, fallback.shortName),
    description: stringValue(root.description, fallback.description),
    roundCount: positiveInt(root.roundCount, 1 + builtStackRounds.length + 1),
    timing: {
      turnSeconds: positiveInt(timing.turnSeconds, fallback.timing.turnSeconds),
      moneySeconds: positiveInt(timing.moneySeconds, fallback.timing.moneySeconds),
      biddingSeconds: positiveInt(timing.biddingSeconds, fallback.timing.biddingSeconds),
      premeditationSeconds: positiveInt(timing.premeditationSeconds, fallback.timing.premeditationSeconds),
      minSeconds,
      maxSeconds,
      turnPresets: intArray(timing.turnPresets, fallback.timing.turnPresets),
      moneyPresets: intArray(timing.moneyPresets, fallback.timing.moneyPresets),
    },
    bidding: {
      title: stringValue(bidding.title, fallback.bidding.title),
      contests: positiveInt(bidding.contests, fallback.bidding.contests),
      wordDeck: deckId(bidding.wordDeck, fallback.bidding.wordDeck),
      wordCount: positiveInt(bidding.wordCount, fallback.bidding.wordCount),
      minBid,
      maxBid,
      successPoints: nonNegativeInt(bidding.successPoints, fallback.bidding.successPoints),
      failurePoints: nonNegativeInt(bidding.failurePoints, fallback.bidding.failurePoints),
      failureAward: failureAward(bidding.failureAward, fallback.bidding.failureAward),
    },
    stacks: {
      title: stringValue(stacks.title, fallback.stacks.title),
      wordCount: positiveInt(stacks.wordCount, fallback.stacks.wordCount),
      wordLimit: positiveInt(stacks.wordLimit, fallback.stacks.wordLimit),
      allCorrectBonus: nonNegativeInt(stacks.allCorrectBonus, fallback.stacks.allCorrectBonus),
      rounds: builtStackRounds,
      options: stackOptions(stacks.options, fallback.stacks.options),
    },
    money: {
      title: stringValue(money.title, fallback.money.title),
      wordDeck: deckId(money.wordDeck, fallback.money.wordDeck),
      wordCount: positiveInt(money.wordCount, fallback.money.wordCount),
      wordLimit: positiveInt(money.wordLimit, fallback.money.wordLimit),
      jackpotPoints: nonNegativeInt(money.jackpotPoints, fallback.money.jackpotPoints),
    },
    clueActions: {
      allowSkip: boolValue(clueActions.allowSkip, fallback.clueActions.allowSkip),
      allowBudgetRefund: boolValue(clueActions.allowBudgetRefund, fallback.clueActions.allowBudgetRefund),
      autoAdvanceOnCorrect: boolValue(clueActions.autoAdvanceOnCorrect, fallback.clueActions.autoAdvanceOnCorrect),
    },
    challenge: {
      enabledByDefault: boolValue(challenge.enabledByDefault, fallback.challenge.enabledByDefault),
      includeAlcoholByDefault: boolValue(challenge.includeAlcoholByDefault, fallback.challenge.includeAlcoholByDefault),
      maxPerGame: nonNegativeInt(challenge.maxPerGame, fallback.challenge.maxPerGame),
      frequency: challengeFrequency(challenge.frequency, fallback.challenge.frequency),
      prompts: promptRules(challengePrompts, fallback.challenge.prompts),
    },
    accessibility: {
      speechRecognitionDefault: boolValue(accessibility.speechRecognitionDefault, fallback.accessibility.speechRecognitionDefault),
      announceControls: boolValue(accessibility.announceControls, fallback.accessibility.announceControls),
    },
  }
}

function requireString(record: UnknownRecord, key: string, path: string, errors: string[]): void {
  if (typeof record[key] !== 'string' || !String(record[key]).trim()) {
    errors.push(`${path}.${key} must be a non-empty string`)
  }
}

function requirePositiveInt(record: UnknownRecord, key: string, path: string, errors: string[]): void {
  if (!Number.isInteger(record[key]) || Number(record[key]) <= 0) {
    errors.push(`${path}.${key} must be a positive integer`)
  }
}

function requireNonNegativeInt(record: UnknownRecord, key: string, path: string, errors: string[]): void {
  if (!Number.isInteger(record[key]) || Number(record[key]) < 0) {
    errors.push(`${path}.${key} must be a non-negative integer`)
  }
}

function requireBoolean(record: UnknownRecord, key: string, path: string, errors: string[]): void {
  if (typeof record[key] !== 'boolean') {
    errors.push(`${path}.${key} must be a boolean`)
  }
}

function requireDeck(record: UnknownRecord, key: string, path: string, errors: string[]): void {
  if (typeof record[key] !== 'string' || !DECK_IDS.has(record[key] as WordDeckId)) {
    errors.push(`${path}.${key} must be one of ${Array.from(DECK_IDS).join(', ')}`)
  }
}

function requireHexColor(record: UnknownRecord, key: string, path: string, errors: string[]): void {
  if (typeof record[key] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(record[key])) {
    errors.push(`${path}.${key} must be a #rrggbb color`)
  }
}

function validateStringArray(record: UnknownRecord, key: string, path: string, errors: string[]): void {
  if (record[key] === undefined) return
  if (!Array.isArray(record[key]) || !(record[key] as unknown[]).every(item => typeof item === 'string' && item.trim())) {
    errors.push(`${path}.${key} must be an array of non-empty strings`)
  }
}

function isAlcoholPromptText(value: string): boolean {
  return value.toLowerCase().includes('21+ option')
}

function hasNonAlcoholAlternative(value: string): boolean {
  return /\bor\b/i.test(value)
}

function validateChallengePromptArray(record: UnknownRecord, key: string, path: string, errors: string[]): void {
  validateStringArray(record, key, path, errors)
  if (!Array.isArray(record[key])) return

  record[key].forEach((item, index) => {
    if (typeof item !== 'string') return
    if (isAlcoholPromptText(item) && !hasNonAlcoholAlternative(item)) {
      errors.push(`${path}.${key}[${index}] 21+ prompt must include a non-alcohol alternative`)
    }
  })
}

function isPositiveInt(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0
}

export function validateGameModeDefinition(raw: unknown): string[] {
  const errors: string[] = []
  if (!isRecord(raw)) return ['game mode must be a YAML object']

  requireString(raw, 'id', 'mode', errors)
  requireString(raw, 'name', 'mode', errors)
  requireString(raw, 'shortName', 'mode', errors)
  requireString(raw, 'description', 'mode', errors)
  requirePositiveInt(raw, 'roundCount', 'mode', errors)

  const timing = section(raw.timing)
  ;['turnSeconds', 'moneySeconds', 'biddingSeconds', 'premeditationSeconds', 'minSeconds', 'maxSeconds'].forEach(key => {
    requirePositiveInt(timing, key, 'timing', errors)
  })
  ;['turnPresets', 'moneyPresets'].forEach(key => {
    if (!Array.isArray(timing[key]) || !(timing[key] as unknown[]).every(item => Number.isInteger(item) && Number(item) > 0)) {
      errors.push(`timing.${key} must be an array of positive integers`)
    }
  })
  const timingMin = isPositiveInt(timing.minSeconds) ? timing.minSeconds : null
  const timingMax = isPositiveInt(timing.maxSeconds) ? timing.maxSeconds : null
  if (timingMin !== null && timingMax !== null && timingMin > timingMax) {
    errors.push('timing.minSeconds must be lower than or equal to timing.maxSeconds')
  }
  if (timingMin !== null && timingMax !== null) {
    ;(['turnSeconds', 'moneySeconds', 'biddingSeconds', 'premeditationSeconds'] as const).forEach(key => {
      if (isPositiveInt(timing[key]) && (timing[key] < timingMin || timing[key] > timingMax)) {
        errors.push(`timing.${key} must be between timing.minSeconds and timing.maxSeconds`)
      }
    })
    ;(['turnPresets', 'moneyPresets'] as const).forEach(key => {
      if (Array.isArray(timing[key]) && (timing[key] as unknown[]).some(item => isPositiveInt(item) && (item < timingMin || item > timingMax))) {
        errors.push(`timing.${key} values must be between timing.minSeconds and timing.maxSeconds`)
      }
    })
  }

  const bidding = section(raw.bidding)
  requireString(bidding, 'title', 'bidding', errors)
  requireDeck(bidding, 'wordDeck', 'bidding', errors)
  ;['contests', 'wordCount', 'minBid', 'maxBid'].forEach(key => requirePositiveInt(bidding, key, 'bidding', errors))
  ;['successPoints', 'failurePoints'].forEach(key => requireNonNegativeInt(bidding, key, 'bidding', errors))
  if (typeof bidding.failureAward !== 'string' || !FAILURE_AWARDS.has(bidding.failureAward as FailureAward)) {
    errors.push(`bidding.failureAward must be one of ${Array.from(FAILURE_AWARDS).join(', ')}`)
  }
  if (Number(bidding.minBid) >= Number(bidding.maxBid)) {
    errors.push('bidding.minBid must be lower than bidding.maxBid')
  }

  const stacks = section(raw.stacks)
  requireString(stacks, 'title', 'stacks', errors)
  requirePositiveInt(stacks, 'wordCount', 'stacks', errors)
  requirePositiveInt(stacks, 'wordLimit', 'stacks', errors)
  requireNonNegativeInt(stacks, 'allCorrectBonus', 'stacks', errors)
  if (!Array.isArray(stacks.rounds) || stacks.rounds.length === 0) {
    errors.push('stacks.rounds must contain at least one round')
  } else {
    const roundNumbers = new Set<number>()
    stacks.rounds.forEach((item, index) => {
      const round = section(item)
      requirePositiveInt(round, 'number', `stacks.rounds[${index}]`, errors)
      requirePositiveInt(round, 'turns', `stacks.rounds[${index}]`, errors)
      if (round.startTeam !== 0 && round.startTeam !== 1) errors.push(`stacks.rounds[${index}].startTeam must be 0 or 1`)
      if (typeof round.number === 'number') {
        if (roundNumbers.has(round.number)) errors.push(`stacks.rounds[${index}].number duplicates ${round.number}`)
        roundNumbers.add(round.number)
      }
    })
    if (isPositiveInt(raw.roundCount) && raw.roundCount !== stacks.rounds.length + 2) {
      errors.push('mode.roundCount must equal one bidding round, all stack rounds, and one money round')
    }
  }
  if (!Array.isArray(stacks.options) || stacks.options.length === 0) {
    errors.push('stacks.options must contain at least one stack')
  } else {
    const stackIds = new Set<string>()
    stacks.options.forEach((item, index) => {
      const option = section(item)
      requireString(option, 'id', `stacks.options[${index}]`, errors)
      requireString(option, 'label', `stacks.options[${index}]`, errors)
      requireDeck(option, 'wordDeck', `stacks.options[${index}]`, errors)
      requireNonNegativeInt(option, 'pointsPerWord', `stacks.options[${index}]`, errors)
      requireHexColor(option, 'color', `stacks.options[${index}]`, errors)
      if (typeof option.id === 'string') {
        if (stackIds.has(option.id)) errors.push(`stacks.options[${index}].id duplicates ${option.id}`)
        stackIds.add(option.id)
      }
    })
  }

  const money = section(raw.money)
  requireString(money, 'title', 'money', errors)
  requireDeck(money, 'wordDeck', 'money', errors)
  ;['wordCount', 'wordLimit'].forEach(key => requirePositiveInt(money, key, 'money', errors))
  requireNonNegativeInt(money, 'jackpotPoints', 'money', errors)

  const clueActions = section(raw.clueActions)
  ;['allowSkip', 'allowBudgetRefund', 'autoAdvanceOnCorrect'].forEach(key => requireBoolean(clueActions, key, 'clueActions', errors))

  const challenge = section(raw.challenge)
  requireBoolean(challenge, 'enabledByDefault', 'challenge', errors)
  requireBoolean(challenge, 'includeAlcoholByDefault', 'challenge', errors)
  requireNonNegativeInt(challenge, 'maxPerGame', 'challenge', errors)
  if (typeof challenge.frequency !== 'string' || !CHALLENGE_FREQUENCIES.has(challenge.frequency as ChallengeFrequency)) {
    errors.push(`challenge.frequency must be one of ${Array.from(CHALLENGE_FREQUENCIES).join(', ')}`)
  }
  const prompts = section(challenge.prompts)
  ;(['zeroCorrect', 'manySkips', 'perfect', 'closeFailure', 'moneyWin', 'moneyFail', 'standard'] as const).forEach(key => {
    validateChallengePromptArray(prompts, key, 'challenge.prompts', errors)
  })
  const challengeCanShow = Number.isInteger(challenge.maxPerGame)
    && Number(challenge.maxPerGame) > 0
    && typeof challenge.frequency === 'string'
    && challenge.frequency !== 'off'
  const promptCount = (['zeroCorrect', 'manySkips', 'perfect', 'closeFailure', 'moneyWin', 'moneyFail', 'standard'] as const)
    .reduce((count, key) => count + (Array.isArray(prompts[key])
      ? (prompts[key] as unknown[]).filter(item => typeof item === 'string' && item.trim()).length
      : 0), 0)
  if (challengeCanShow && promptCount === 0) {
    errors.push('challenge.prompts must include at least one prompt when challenges can show')
  }

  const accessibility = section(raw.accessibility)
  requireBoolean(accessibility, 'speechRecognitionDefault', 'accessibility', errors)
  requireBoolean(accessibility, 'announceControls', 'accessibility', errors)

  return errors
}

export function summarizeGameMode(gameMode: GameMode): GameModeSummary {
  return {
    id: gameMode.id,
    name: gameMode.name,
    shortName: gameMode.shortName,
    description: gameMode.description,
    bidContests: gameMode.bidding.contests,
    stackRounds: gameMode.stacks.rounds.map(round => round.number),
    moneyWords: gameMode.money.wordCount,
    challengeDefault: gameMode.challenge.enabledByDefault,
    alcoholDefault: gameMode.challenge.includeAlcoholByDefault,
  }
}

export function findStackOption(gameMode: GameMode, stackId: string): StackOptionRules | undefined {
  return gameMode.stacks.options.find(option => option.id === stackId)
}

export function getStackRound(gameMode: GameMode, roundNumber: number): StackRoundRules | undefined {
  return gameMode.stacks.rounds.find(round => round.number === roundNumber)
}

export function getNextStackRound(gameMode: GameMode, roundNumber: number): StackRoundRules | undefined {
  const currentIndex = gameMode.stacks.rounds.findIndex(round => round.number === roundNumber)
  return currentIndex >= 0 ? gameMode.stacks.rounds[currentIndex + 1] : undefined
}
