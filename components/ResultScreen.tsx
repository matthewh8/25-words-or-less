'use client'

import type { ReactNode } from 'react'

interface ResultScreenProps {
  layout?: 'fit' | 'scroll'
  background?: 'default' | 'jackpot'
  card: ReactNode
  sidebar: ReactNode
  footer?: ReactNode
  actionLabel: string
  onAction: () => void
}

export default function ResultScreen({ layout = 'fit', background = 'default', card, sidebar, footer, actionLabel, onAction }: ResultScreenProps) {
  const sizing = layout === 'scroll' ? 'min-h-dvh overflow-y-auto' : 'h-dvh overflow-hidden'
  const bg = background === 'jackpot' ? 'bg-[#07130d]' : 'bg-[#0a0d14]'
  const container = `flex ${sizing} flex-col items-center justify-center ${bg} p-3 text-white md:p-8`

  return (
    <div className={container}>
      <div className="w-full max-w-5xl fade-in-up">
        <div className="grid gap-2 md:gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          {card}
          {sidebar}
        </div>

        {footer && <div className="mt-2 md:mt-5">{footer}</div>}

        <button
          onClick={onAction}
          className="mt-2 w-full rounded-md bg-[#ffd23f] py-3.5 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 md:mt-5 md:py-4"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
