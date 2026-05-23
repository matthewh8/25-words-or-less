'use client'

import { useState } from 'react'

interface TimeConfiguratorProps {
  label: string
  value: number
  presets: number[]
  min: number
  max: number
  ariaLabel: string
  onChange: (value: number) => void
}

export default function TimeConfigurator({
  label,
  value,
  presets,
  min,
  max,
  ariaLabel,
  onChange,
}: TimeConfiguratorProps) {
  const [draft, setDraft] = useState(String(value))

  function clamp(raw: number): number {
    if (!Number.isFinite(raw)) return min
    return Math.min(max, Math.max(min, Math.round(raw)))
  }

  function commit(raw: string) {
    const next = clamp(parseInt(raw, 10))
    setDraft(String(next))
    onChange(next)
  }

  function handleDraft(raw: string) {
    setDraft(raw)
    const next = parseInt(raw, 10)
    if (Number.isInteger(next) && next >= min && next <= max) onChange(next)
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5 landscape-short:p-2">
      <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-3 landscape-short:mb-1">{label}</p>
      <div className="mb-2 grid grid-cols-4 gap-1.5 md:mb-3 landscape-short:mb-1">
        {presets.map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setDraft(String(clamp(preset)))
              onChange(clamp(preset))
            }}
            className={`rounded-md py-2 text-sm font-black transition-all active:scale-95 landscape-short:py-1 landscape-short:text-xs ${
              value === preset
                ? 'bg-[#ffd23f] text-[#0a0d14]'
                : 'bg-white/[0.06] text-white/50 hover:text-white/80'
            }`}
          >
            {preset}s
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={event => handleDraft(event.target.value)}
          onBlur={event => commit(event.target.value)}
          min={min}
          max={max}
          aria-label={ariaLabel}
          className="flex-1 rounded-md border border-white/10 bg-[#0a0d14] px-3 py-2 text-center text-sm font-bold text-white outline-none transition-colors placeholder-white/20 focus:border-[#ffd23f]/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none landscape-short:py-1"
        />
        <span className="text-white/30 text-sm">sec</span>
      </div>
    </div>
  )
}
