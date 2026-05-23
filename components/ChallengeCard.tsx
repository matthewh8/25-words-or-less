'use client'

import type { Challenge } from '@/lib/challenges'

interface ChallengeCardProps {
  challenge: Challenge
}

export default function ChallengeCard({ challenge }: ChallengeCardProps) {
  return (
    <aside className="rounded-lg border border-[#ffd23f]/30 bg-[#ffd23f]/10 p-3 md:p-4 landscape-short:p-2">
      <p className="mono-label text-[10px] text-[#ffd23f]">
        {challenge.label}
        {challenge.alcoholOptional && <span className="ml-2 opacity-70">21+ option</span>}
      </p>
      <p className="mt-1 text-sm leading-snug text-white md:text-base landscape-short:text-xs">{challenge.text}</p>
    </aside>
  )
}
