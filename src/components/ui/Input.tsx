import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-primary',
            'placeholder:text-slate-400',
            'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
            error && 'border-status-danger focus:border-status-danger focus:ring-status-danger/20',
            className,
          )}
          {...props}
        />
        {error && <span className="text-xs text-status-danger">{error}</span>}
      </div>
    )
  },
)
Input.displayName = 'Input'
