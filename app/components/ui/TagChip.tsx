import type { ReactNode } from 'react'

export type ChipTone = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'outline'

type TagChipProps = {
  children: ReactNode
  tone?: ChipTone
  as?: 'span' | 'li'
  className?: string
}

export function TagChip({ children, tone = 'default', as: Tag = 'span', className = '' }: TagChipProps) {
  const toneClass = tone === 'default' ? '' : ` chip--${tone}`
  return <Tag className={`chip${toneClass} ${className}`.trim()}>{children}</Tag>
}

type TagListProps = {
  items: string[]
  /** Show at most this many; the rest collapse into a "+N" chip. */
  max?: number
  tone?: ChipTone
  label?: string
  className?: string
}

export function TagList({ items, max, tone = 'default', label, className = '' }: TagListProps) {
  const shown = typeof max === 'number' ? items.slice(0, max) : items
  const hidden = items.length - shown.length
  return (
    <ul className={`chip-list ${className}`.trim()} aria-label={label}>
      {shown.map((item) => (
        <TagChip key={item} as="li" tone={tone}>
          {item}
        </TagChip>
      ))}
      {hidden > 0 && (
        <TagChip as="li" tone="outline">
          <span className="sr-only">and </span>+{hidden}
          <span className="sr-only"> more</span>
        </TagChip>
      )}
    </ul>
  )
}
