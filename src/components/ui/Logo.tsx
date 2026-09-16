import logoIcon from '@/assets/logo-icon.png'
import { cn } from '@/utils/cn'

interface LogoProps {
  variant?: 'compact' | 'full' | 'light'
  className?: string
}

// variant="compact": ícono + "CrediPro" + tagline, en línea, texto oscuro (headers claros)
// variant="light": igual que compact pero con texto blanco (sidebar oscuro)
// variant="full": solo el ícono grande (footer / hero)
export function Logo({ variant = 'compact', className }: LogoProps) {
  if (variant === 'full') {
    return <img src={logoIcon} alt="CrediPro" className={cn('h-10 w-10', className)} />
  }

  const isLight = variant === 'light'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img src={logoIcon} alt="CrediPro" className="h-9 w-9" />
      <div className="leading-tight">
        <p className={cn('text-lg font-bold', isLight ? 'text-white' : 'text-primary')}>CrediPro</p>
        <p className={cn('text-xs', isLight ? 'text-white/60' : 'text-neutral-500')}>
          Gestión de préstamos, más simple
        </p>
      </div>
    </div>
  )
}