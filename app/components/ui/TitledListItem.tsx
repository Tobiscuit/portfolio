import { TagChip } from './TagChip'

interface TitledListItemProps {
  title: string
  subtitle?: string
  status?: string
}

export function TitledListItem({ title, subtitle, status }: TitledListItemProps) {
  const tone = status === 'Earned' ? 'success' : 'warning'
  return (
    <div className="titled-item">
      <div>
        <p className="titled-item__title">{title}</p>
        {subtitle && <p className="titled-item__sub">{subtitle}</p>}
      </div>
      {status && <TagChip tone={tone}>{status}</TagChip>}
    </div>
  )
}
