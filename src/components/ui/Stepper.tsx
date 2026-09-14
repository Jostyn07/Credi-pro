import { cn } from '@/utils/cn'
import { Check } from 'lucide-react'

interface Step {
  label: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number // 1-indexed
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="mb-8 flex items-center">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isDone = stepNumber < currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={step.label} className={cn('flex items-center', !isLast && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  isDone && 'bg-status-success text-white',
                  isActive && 'bg-accent text-white',
                  !isActive && !isDone && 'bg-slate-100 text-slate-400',
                )}
              >
                {isDone ? <Check size={16} /> : stepNumber}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-xs',
                  isActive ? 'font-medium text-primary' : 'text-slate-400',
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={cn('mx-2 h-px flex-1', isDone ? 'bg-status-success' : 'bg-slate-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export const ONBOARDING_STEPS: Step[] = [
  { label: 'Tu cuenta' },
  { label: 'Organización' },
  { label: 'Plan' },
  { label: 'Listo' },
]