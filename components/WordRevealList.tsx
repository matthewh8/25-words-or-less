'use client'

interface WordRevealListProps {
  words: string[]
  guessed: boolean[]
  definitions?: Record<string, string>
  title?: string
  variant?: 'round' | 'money'
  className?: string
}

function definitionFor(word: string, definitions: Record<string, string> | undefined): string {
  if (!definitions) return ''
  const canonical = word.trim().toUpperCase()
  return definitions[canonical] ?? definitions[word] ?? ''
}

export default function WordRevealList({
  words,
  guessed,
  definitions,
  title = 'Answers',
  variant = 'round',
  className = '',
}: WordRevealListProps) {
  if (!words.length) return null

  const gridClassName = variant === 'money'
    ? 'grid-cols-2 sm:grid-cols-5'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1'
  const maxHeightClassName = variant === 'money' ? 'max-h-[30vh]' : 'max-h-[44vh]'

  return (
    <section className={`min-h-0 rounded-lg border border-white/10 bg-[#141826] p-3 md:p-5 ${className}`}>
      <p className="mono-label mb-2 text-[10px] text-white/45 md:mb-3">{title}</p>
      <div className={`panel-scroll grid min-h-0 ${maxHeightClassName} ${gridClassName} gap-1.5 overflow-y-auto pr-1 md:gap-2`}>
        {words.map((word, index) => {
          const correct = Boolean(guessed[index])
          const definition = definitionFor(word, definitions)
          return (
            <article
              key={`${word}-${index}`}
              className={`min-w-0 rounded-md border px-2 py-2 md:px-3 ${
                correct
                  ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300'
                  : 'border-[#ff3a6d]/20 bg-[#ff3a6d]/10 text-[#ff3a6d]'
              }`}
            >
              <div className="flex min-w-0 items-center justify-between gap-2 text-[10px] font-black uppercase md:text-xs">
                <span className="shrink-0 font-mono opacity-50">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0 truncate">{word}</span>
                <span className="shrink-0">{correct ? 'Got' : 'Miss'}</span>
              </div>
              {definition && (
                <p className="mt-1 overflow-hidden text-[10px] normal-case leading-tight text-white/45 md:text-[11px] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {definition}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
