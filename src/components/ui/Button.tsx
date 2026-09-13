import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-active',
  secondary: 'bg-white text-primary border border-slate-200 hover:bg-slate-50',
  danger: 'bg-status-danger text-white hover:opacity-90',
  ghost: 'bg-transparent text-primary hover:bg-slate-100',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
