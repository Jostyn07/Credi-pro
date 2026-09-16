interface UsageBarProps {
  label: string
  used: number
  limit: number
}

export function UsageBar({ label, used, limit }: UsageBarProps) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const isNearLimit = pct >= 90

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80">
          {used} / {limit || '—'}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={isNearLimit ? 'h-full bg-warning-500' : 'h-full bg-accent'}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}