import type { CSSProperties, ElementType, ReactNode } from 'react'
import TransitionLink from './TransitionLink'

type CardGridProps = {
  children: ReactNode
  /** `ul` (default) when the children are `li` cards. */
  as?: ElementType
  className?: string
  'aria-label'?: string
}

/**
 * Responsive card grid: auto-fill columns from 18rem, a horizontal card when a
 * single column is wide (container query), and subgrid row alignment across
 * columns where supported. The grid is the container; cards query it.
 */
export function CardGrid({ children, as: Tag = 'ul', className = '', ...rest }: CardGridProps) {
  return (
    <Tag className={`card-grid ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}

type CardProps = {
  title: ReactNode
  /** Heading level for the card title: h2 on index pages, h3 inside a section. */
  titleAs?: 'h2' | 'h3' | 'h4'
  /** Internal route; the whole card becomes the link (stretched link pattern). */
  href?: string
  description?: ReactNode
  /** An `<img>`/`SuspenseImage` or any media; omitted → dotted placeholder. */
  media?: ReactNode
  /** Style for the media figure (used for `view-transition-name`). */
  mediaStyle?: CSSProperties
  /** Chips, meta or secondary links. Rendered above the stretched link. */
  footer?: ReactNode
  as?: ElementType
  className?: string
}

export function Card({
  title,
  titleAs: Heading = 'h3',
  href,
  description,
  media,
  mediaStyle,
  footer,
  as: Tag = 'li',
  className = '',
}: CardProps) {
  return (
    <Tag className={`card ${className}`.trim()}>
      <figure className="card__media" style={mediaStyle}>
        {media ?? <div className="media-placeholder" aria-hidden="true" />}
      </figure>
      <Heading className="card__title">
        {href ? (
          <TransitionLink href={href} className="card__link">
            {title}
          </TransitionLink>
        ) : (
          title
        )}
      </Heading>
      <p className="card__desc">{description}</p>
      <div className="card__footer">{footer}</div>
    </Tag>
  )
}
