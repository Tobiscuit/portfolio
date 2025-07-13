interface TitledListItemProps {
  title: string
  subtitle?: string
  status?: string
}

export function TitledListItem({
  title,
  subtitle,
  status,
}: TitledListItemProps) {
  const statusColor =
    status === 'Earned'
      ? 'bg-green-500/20 text-green-400'
      : 'bg-amber-500/20 text-amber-400'

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="font-medium text-parchment-100">{title}</p>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      {status && <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>{status}</span>}
    </div>
  )
}