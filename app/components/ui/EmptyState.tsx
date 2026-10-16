import type { ReactNode } from 'react'
import { Compass } from 'lucide-react'

type EmptyStateProps = {
  title: ReactNode
  children?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  /** Heading level; h1 when the empty state is the whole page (e.g. not found). */
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

/** For "nothing here yet" and not-found views. Keeps the page's heading structure intact. */
export default function EmptyState({ title, children, icon, actions, as: Heading = 'h2', className = '' }: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <span className="empty-state__icon" aria-hidden="true">
        {icon ?? <Compass />}
      </span>
      <Heading className="empty-state__title">{title}</Heading>
      {children && <p className="empty-state__text">{children}</p>}
      {actions && <div className="empty-state__actions">{actions}</div>}
    </div>
  )
}
