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
  const sizing = layout === 'scroll' ? 'min-h-full overflow-y-auto landscape-short:!h-full landscape-short:!overflow-hidden landscape-short:!min-h-0' : 'h-full overflow-hidden'
  const bg = background === 'jackpot' ? 'bg-[#07130d]' : 'bg-[#0a0d14]'
  const container = `flex ${sizing} flex-col items-center justify-center ${bg} p-3 text-white md:p-8 landscape-short:!p-3`

  return (
    <div className={container}>
      <div className="w-full max-w-5xl fade-in-up landscape-short:!max-h-full landscape-short:!overflow-hidden landscape-short:!flex landscape-short:!flex-col">
        <div className="grid gap-2 md:gap-5 lg:grid-cols-[0.95fr_1.05fr] landscape-short:grid-cols-[0.95fr_1.05fr] landscape-short:gap-3 landscape-short:min-h-0 landscape-short:flex-1 landscape-short:overflow-hidden">
          {card}
          {sidebar}
        </div>

        {footer && <div className="mt-2 md:mt-5 landscape-short:!mt-2">{footer}</div>}

        <button
          onClick={onAction}
          className="mt-2 w-full rounded-md bg-[#ffd23f] py-3.5 text-base font-black uppercase tracking-normal text-[#0a0d14] transition-all hover:bg-[#ffe071] active:scale-95 md:mt-5 md:py-4 landscape-short:!mt-2 landscape-short:!py-2 landscape-short:!text-sm"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
