import { useStore } from '@/hooks/useStore'
import { StepIndicator } from '@/components/StepIndicator'
import { StepPaste } from '@/components/StepPaste'
import { StepReview } from '@/components/StepReview'
import { StepListingInfo } from '@/components/StepListingInfo'
import { StepGenerate } from '@/components/StepGenerate'
import { Toast } from '@/components/Toast'

export default function App() {
  const step = useStore(s => s.step)

  return (
    <>
      <header className="border-b border-border px-8 py-5 flex items-center gap-3"
        style={{ background: 'linear-gradient(to bottom, rgba(201,168,76,0.06), transparent)' }}>
        <div>
          <span className="font-cinzel text-2xl font-bold text-gold tracking-wider"
            style={{ textShadow: '0 0 20px rgba(201,168,76,0.3)' }}>
            CardScribe
          </span>
          <span className="font-crimson italic text-text-secondary text-sm ml-2 tracking-widest">
            · Sorcery Trade Ad Builder
          </span>
        </div>
      </header>

      <StepIndicator />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {step === 1 && <StepPaste />}
        {step === 2 && <StepReview />}
        {step === 3 && <StepListingInfo />}
        {step === 4 && <StepGenerate />}
      </main>

      <Toast />
    </>
  )
}
