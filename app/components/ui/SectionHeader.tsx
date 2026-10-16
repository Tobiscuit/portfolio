import type { ReactNode } from 'react'

type SectionHeaderProps = {
  title: ReactNode
  /** Heading level. Pages have exactly one h1; sections use h2. */
  as?: 'h1' | 'h2' | 'h3'
  /** Small uppercase label above the title. */
  eyebrow?: ReactNode
  /** One or two sentences under the title. */
  lede?: ReactNode
  /** Buttons/links shown beside the title on wide screens. */
  actions?: ReactNode
  align?: 'start' | 'center'
  /** id for the title, so a section can reference it with aria-labelledby. */
  id?: string
  className?: string
}

export default function SectionHeader({
  title,
  as: Heading = 'h2',
  eyebrow,
  lede,
  actions,
  align = 'start',
  id,
  className = '',
}: SectionHeaderProps) {
  const classes = [
    'section-header',
    align === 'center' && 'section-header--center',
    actions && align !== 'center' && 'section-header--split',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Heading id={id} className="section-header__title">
        {title}
      </Heading>
      {lede && <p className="section-header__lede">{lede}</p>}
      {actions && <div className="section-header__actions">{actions}</div>}
    </div>
  )
}
