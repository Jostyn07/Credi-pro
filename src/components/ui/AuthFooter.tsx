import { Logo } from '@/components/ui/Logo'

export function AuthFooter() {
  return (
    <footer className="flex flex-col items-center justify-between gap-4 px-6 py-6 text-sm text-slate-400 sm:flex-row">
      <Logo />
      <nav className="flex gap-6">
        <a href="/terminos" className="hover:text-slate-600 hover:underline">
          Términos y Condiciones
        </a>
        <a href="/privacidad" className="hover:text-slate-600 hover:underline">
          Política de Privacidad
        </a>
        <a href="/soporte" className="hover:text-slate-600 hover:underline">
          Soporte
        </a>
      </nav>
    </footer>
  )
}