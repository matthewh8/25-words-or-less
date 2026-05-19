export interface Challenge {
  emoji: string
  text: string
}

// Context-aware pools — picked from based on what just happened
const onPerfect: Challenge[] = [
  { emoji: '🏆', text: 'Perfect round — losing team each takes a drink.' },
  { emoji: '🎉', text: 'All words guessed! Winning team picks one person from the other team to drink.' },
  { emoji: '👑', text: 'Flawless. Losing team members drink once each.' },
  { emoji: '🍾', text: 'Perfect round — everyone toasts and drinks together.' },
  { emoji: '😤', text: 'Too good. Losing team\'s clue giver drinks twice.' },
]

const onBidFail: Challenge[] = [
  { emoji: '😬', text: 'You said you could do it in that many words. Everyone on the failing team drinks.' },
  { emoji: '🫵', text: 'Bold claim, bad execution. Clue giver drinks twice.' },
  { emoji: '📉', text: 'Bid failed. Clue giver picks a teammate to drink with them.' },
  { emoji: '🤦', text: 'Over-promised, under-delivered. Failing team each takes a sip.' },
  { emoji: '🎯', text: 'Off target. The whole room decides if the clue giver drinks.' },
]

const onPartial: Challenge[] = [
  { emoji: '🎲', text: 'One drink per missed word — split however the team wants.' },
  { emoji: '🤏', text: 'Close but not perfect. Clue giver drinks once per skipped word.' },
  { emoji: '👀', text: 'Left some on the table. Clue giver drinks once, guessers decide if they join.' },
  { emoji: '💸', text: 'Points lost. Clue giver owes one drink to the room.' },
  { emoji: '⏱️', text: 'Didn\'t finish in time. Everyone on the cluing team takes a sip.' },
]

const wildCards: Challenge[] = [
  { emoji: '🔄', text: 'Swap seats with someone before the next round.' },
  { emoji: '🤫', text: 'Loser of the round must whisper everything for the next turn.' },
  { emoji: '🎤', text: 'Next clue giver must speak in an accent for their entire turn.' },
  { emoji: '🙈', text: 'Next clue giver must give all clues with their eyes closed.' },
  { emoji: '🤐', text: 'Slowest guesser last round takes a drink — team decides who that was.' },
  { emoji: '🍺', text: 'Everyone takes one drink just because.' },
  { emoji: '🫳', text: 'Losing team nominates their clue giver to drink.' },
  { emoji: '🧊', text: 'Winning team picks one person on the losing team to drink.' },
  { emoji: '🎯', text: 'Everyone drinks — it\'s been long enough.' },
  { emoji: '🕵️', text: 'If any guesser cheated (peeked), they drink twice. Honor system.' },
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export type ChallengeContext = 'perfect' | 'bid_fail' | 'partial' | 'money_win' | 'money_fail'

export function getChallenge(ctx: ChallengeContext): Challenge {
  // 30% chance of a wildcard regardless of context, for variety
  if (Math.random() < 0.30) return pick(wildCards)

  switch (ctx) {
    case 'perfect':   return pick(onPerfect)
    case 'bid_fail':  return pick(onBidFail)
    case 'money_win': return pick([
      { emoji: '🏆', text: 'JACKPOT! Losers each take two drinks to honor the champions.' },
      { emoji: '🍾', text: 'Money round won! Everyone drinks in celebration.' },
      { emoji: '💰', text: 'They did it! Losing team buys the next round.' },
    ])
    case 'money_fail': return pick([
      { emoji: '😔', text: 'So close! Clue giver drinks once for every missed word.' },
      { emoji: '💸', text: 'Left money on the table. Whole winning team takes a consolation drink.' },
    ])
    case 'partial':
    default:          return pick([...onPartial, ...wildCards])
  }
}
