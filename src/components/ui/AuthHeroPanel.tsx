import { Users, Wallet, Wallet2, BarChart3, Sparkles } from 'lucide-react'

const bullets = [
  { icon: Users, label: 'Gestiona tus clientes y préstamos' },
  { icon: Wallet, label: 'Controla pagos y cobranza' },
  { icon: Wallet2, label: 'Lleva el control de tu caja' },
  { icon: BarChart3, label: 'Genera reportes en tiempo real' },
  { icon: Sparkles, label: 'Toma mejores decisiones con IA' },
]

export function AuthHeroPanel() {
  return (
    <div
      className="hidden w-[380px] shrink-0 flex-col justify-between bg-primary p-10 text-white lg:flex"
      style={{
        backgroundImage: 'linear-gradient(160deg, #0B1F33 0%, #123249 60%, #1D5F8C 100%)',
      }}
    >
      <div>
        <h2 className="text-3xl font-bold leading-tight">
          Impulsa
          <br />
          el crecimiento
          <br />
          de tu negocio
        </h2>

        <ul className="mt-10 flex flex-col gap-4">
          {bullets.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-white/90">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <Icon size={16} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-card bg-white/10 p-4 backdrop-blur-sm">
        <p className="text-sm italic text-white/90">
          &ldquo;CrediPro nos ha permitido tener un control total de nuestra cartera y crecer con
          confianza.&rdquo;
        </p>
        <p className="mt-3 text-xs text-white/60">★★★★★ Finanzas del Norte S.A.S.</p>
      </div>
    </div>
  )
}