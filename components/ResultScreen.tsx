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

export default function ResultScreen({ background = 'default', card, sidebar, footer, actionLabel, onAction }: ResultScreenProps) {
  const bg = background === 'jackpot' ? 'bg-[#07130d]' : 'bg-[#0a0d14]'

  return (
    <div className={`flex h-full flex-col overflow-hidden ${bg} text-white`}>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 md:flex md:flex-col md:items-center md:justify-center md:p-8 landscape-short:p-3">
        <div className="mx-auto w-full max-w-5xl fade-in-up landscape-short:max-h-full landscape-short:overflow-hidden landscape-short:flex landscape-short:flex-col">
          <div className="grid gap-2 md:gap-5 lg:grid-cols-[0.95fr_1.05fr] landscape-short:grid-cols-[0.95fr_1.05fr] landscape-short:gap-3 landscape-short:min-h-0 landscape-short:flex-1 landscape-short:overflow-hidden">
            {card}
            {sidebar}
          </div>
          {footer && <div className="mt-2 md:mt-5 landscape-short:mt-2">{footer}</div>}
        </div>
      </div>
      <div className="shrink-0 px-3 pb-3 pt-2 md:px-8 md:pb-8 md:pt-3 landscape-short:px-3 landscape-short:pb-3 landscape-short:pt-2">
        <button
          onClick={onAction}
          className="w-full rounded-md bg-[#ffd23f] py-3.5 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 md:py-4 landscape-short:py-2 landscape-short:text-sm"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
