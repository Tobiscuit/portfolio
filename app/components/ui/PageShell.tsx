import type { ElementType, HTMLAttributes, ReactNode } from 'react'

type ShellProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  /** `narrow` for reading pages, `wide` for galleries. */
  size?: 'default' | 'narrow' | 'wide'
  as?: ElementType
}

/** Horizontal container: 16px gutters at 320px, growing to the site max width. */
export default function PageShell({ children, size = 'default', as: Tag = 'div', className = '', ...rest }: ShellProps) {
  const sizeClass = size === 'default' ? '' : ` shell--${size}`
  return (
    <Tag className={`shell${sizeClass} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}

type SectionProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  as?: ElementType
  /** Vertical rhythm. */
  spacing?: 'default' | 'tight' | 'loose'
  /** Draws a hairline above the section. */
  rule?: boolean
}

/** Vertical rhythm wrapper. Pair with PageShell: `<Section><PageShell>…</PageShell></Section>`. */
export function Section({ children, as: Tag = 'section', spacing = 'default', rule = false, className = '', ...rest }: SectionProps) {
  const classes = ['section', spacing !== 'default' && `section--${spacing}`, rule && 'section--rule', className]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
