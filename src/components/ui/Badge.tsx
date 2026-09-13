import { type HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const toneStyles: Record<Tone, string> = {
  success: 'bg-green-50 text-status-success',
  warning: 'bg-yellow-50 text-status-warning',
  danger: 'bg-red-50 text-status-danger',
  info: 'bg-blue-50 text-status-info',
  neutral: 'bg-slate-100 text-slate-600',
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  )
}
