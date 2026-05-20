import type { ChallengeRules } from './gameMode'

export interface Challenge {
  label: string
  text: string
  alcoholOptional: boolean
}

export interface ChallengeStats {
  stream: 'bidding' | 'stack' | 'money'
  allCorrect: boolean
  correctCount: number
  totalWords: number
  skipCount: number
  moneyWon: boolean
  roundMarker: number
  challengesShown: number
}

export type ChallengeCategory =
  | 'zeroCorrect'
  | 'manySkips'
  | 'perfect'
  | 'closeFailure'
  | 'moneyWin'
  | 'moneyFail'
  | 'standard'

export interface ChallengeSettings {
  enabled: boolean
  includeAlcohol: boolean
}

const DEFAULT_PROMPTS: Record<ChallengeCategory, string[]> = {
  zeroCorrect: [
    'Team reset: everyone on the cluing team says one useful clue they should have tried.',
    'Bench conference: cluing team takes ten seconds to create a team chant.',
    'Water timeout: cluing team takes a reset sip of water before the next round.',
  ],
  manySkips: [
    'Skip tax: cluing team must describe the next round in three words before it starts.',
    'Speed bump: team captain gives the next clue giver a one-sentence pep talk.',
    'Table vote: the room names the funniest skipped word.',
  ],
  perfect: [
    'Victory lap: opponents give the perfect team a five-second applause break.',
    'Perfect pressure: opponents choose one harmless voice for the next clue giver.',
    'Clean sweep: winning team assigns a tiny celebration dance to the other team.',
  ],
  closeFailure: [
    'So close: cluing team gets one dramatic group sigh.',
    'Near miss: opponents pick the word that hurt the most.',
    'One-away energy: cluing team points to its almost-MVP.',
  ],
  moneyWin: [
    'Jackpot toast: everyone celebrates the winners with a water cheers.',
    'Final flex: winners choose a victory pose for the room.',
    'Clutch call: opponents must compliment the final clue giver.',
  ],
  moneyFail: [
    'Final stumble: winning team still gets a water cheers.',
    'Left on the table: room picks the one word that would have changed everything.',
    'Closeout reset: both teams take ten seconds before final scores.',
  ],
  standard: [
    'Room challenge: losing team gives the next clue giver a nickname for one round.',
    'Mini dare: cluing team speaks in dramatic announcer voice until the next screen.',
    'Hydration break: both teams take a quick water sip.',
  ],
}

const ALCOHOL_PROMPTS: Record<ChallengeCategory, string[]> = {
  zeroCorrect: [
    '21+ option: cluing team takes one sip each, or does a team chant instead.',
  ],
  manySkips: [
    '21+ option: one sip for the clue giver, or the clue giver does ten seconds of karaoke.',
  ],
  perfect: [
    '21+ option: opponents take a sip, or perform the perfect team chant.',
  ],
  closeFailure: [
    '21+ option: clue giver takes one sip, or gives the room a fake apology speech.',
  ],
  moneyWin: [
    '21+ option: everyone takes a celebration sip, or raises a water cheers.',
  ],
  moneyFail: [
    '21+ option: final clue giver takes a sip, or gives a dramatic concession speech.',
  ],
  standard: [
    '21+ option: losing team takes a sip, or does a five-second slow clap.',
  ],
}

function isAlcoholPrompt(text: string): boolean {
  return text.toLowerCase().includes('21+ option')
}

function promptPool(rules: ChallengeRules, category: ChallengeCategory, includeAlcohol: boolean): string[] {
  const configured = rules.prompts[category] ?? []
  const safeConfigured = includeAlcohol ? configured : configured.filter(prompt => !isAlcoholPrompt(prompt))
  const base = safeConfigured.length ? safeConfigured : DEFAULT_PROMPTS[category].filter(prompt => includeAlcohol || !isAlcoholPrompt(prompt))
  return includeAlcohol ? [...base, ...ALCOHOL_PROMPTS[category]] : base
}

function chooseCategory(stats: ChallengeStats): ChallengeCategory {
  if (stats.stream === 'money') return stats.moneyWon ? 'moneyWin' : 'moneyFail'
  if (stats.allCorrect) return 'perfect'
  if (stats.correctCount === 0) return 'zeroCorrect'
  if (stats.skipCount >= Math.max(2, Math.ceil(stats.totalWords / 2))) return 'manySkips'
  if (stats.correctCount >= stats.totalWords - 1) return 'closeFailure'
  return 'standard'
}

function shouldShowChallenge(rules: ChallengeRules, settings: ChallengeSettings, stats: ChallengeStats): boolean {
  if (!settings.enabled) return false
  if (rules.frequency === 'off') return false
  if (stats.challengesShown >= rules.maxPerGame) return false

  const category = chooseCategory(stats)
  if (rules.frequency === 'high') return true
  if (category !== 'standard') return true
  if (rules.frequency === 'low') return false

  // Normal mode keeps routine prompts occasional while still showing performance-based prompts.
  return (stats.roundMarker + stats.challengesShown) % 2 === 0
}

export function selectChallenge(
  rules: ChallengeRules,
  settings: ChallengeSettings,
  stats: ChallengeStats
): Challenge | null {
  if (!shouldShowChallenge(rules, settings, stats)) return null

  const category = chooseCategory(stats)
  const pool = promptPool(rules, category, settings.includeAlcohol)
  const text = pool[(stats.roundMarker + stats.correctCount + stats.skipCount + stats.challengesShown) % pool.length]

  return {
    label: category === 'moneyWin' ? 'Money win'
      : category === 'moneyFail' ? 'Money miss'
      : category === 'zeroCorrect' ? 'Zero correct'
      : category === 'manySkips' ? 'Skip penalty'
      : category === 'perfect' ? 'Perfect round'
      : category === 'closeFailure' ? 'Close failure'
      : 'Party prompt',
    text,
    alcoholOptional: isAlcoholPrompt(text),
  }
}
