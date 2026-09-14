import logoIcon from '@/assets/logo-icon.png'
import { cn } from '@/utils/cn'

interface LogoProps {
  variant?: 'compact' | 'full'
  className?: string
}

// variant="compact": ícono + "CrediPro" + tagline, en línea (para el header de auth)
// variant="full": solo el ícono grande (para el panel héroe / footer)
export function Logo({ variant = 'compact', className }: LogoProps) {
  if (variant === 'full') {
    return <img src={logoIcon} alt="CrediPro" className={cn('h-10 w-10', className)} />
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img src={logoIcon} alt="CrediPro" className="h-9 w-9" />
      <div className="leading-tight">
        <p className="text-lg font-bold text-primary">CrediPro</p>
        <p className="text-xs text-slate-400">Gestión de préstamos, más simple</p>
      </div>
    </div>
  )
}