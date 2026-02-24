import { useStore } from '@/hooks/useStore'
import type { Step } from '@/types'

const STEPS: { num: Step; label: string }[] = [
  { num: 1, label: 'Paste Cards' },
  { num: 2, label: 'Review' },
  { num: 3, label: 'Listing Info' },
  { num: 4, label: 'Generate' },
]

const ROMAN = ['I', 'II', 'III', 'IV'] as const

export function StepIndicator() {
  const step    = useStore(s => s.step)
  const setStep = useStore(s => s.setStep)

  return (
    <div className="flex border-b border-border bg-bg-dark">
      {STEPS.map(({ num, label }, i) => {
        const isActive = step === num
        const isDone   = step > num
        return (
          <button
            key={num}
            onClick={() => isDone && setStep(num)}
            className={[
              'flex-1 py-3 px-4 text-center font-cinzel text-[0.65rem] tracking-widest uppercase',
              'border-r border-border last:border-r-0 transition-all duration-150 relative',
              isActive ? 'text-gold bg-bg-surface' : '',
              isDone   ? 'text-text-secondary cursor-pointer hover:text-text-primary' : '',
              !isActive && !isDone ? 'text-text-dim cursor-default' : '',
            ].join(' ')}
          >
            <span className="block text-sm font-semibold mb-0.5">{ROMAN[i]}</span>
            <span>{label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
        )
      })}
    </div>
  )
}
