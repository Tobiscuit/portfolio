import type { ElementType, HTMLAttributes, ReactNode } from 'react'

export type Placement = 'content' | 'wide' | 'full' | 'inset-right' | 'inset-left'

/** Class for a block's placement inside `.prose`. */
export function placementClass(placement: Placement = 'content'): string {
  return placement === 'content' ? '' : `placement-${placement}`
}

type ProseProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  as?: ElementType
}

/**
 * Article layout: a three-track grid (content → wide → full). Each direct child
 * sits in the content column unless it carries a placement class. Use it as a
 * direct child of <main>; it provides its own gutters.
 */
export default function Prose({ children, as: Tag = 'article', className = '', ...rest }: ProseProps) {
  return (
    <Tag className={`prose ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}

type ProseFlowProps = {
  /** Pre-filtered HTML (already sanitised upstream) rendered as running text. */
  html?: string
  children?: ReactNode
  placement?: Placement
  className?: string
}

/**
 * Running text inside Prose. Inset placements float within a ProseFlow so the
 * paragraphs that follow wrap around them.
 */
export function ProseFlow({ html, children, placement = 'content', className = '' }: ProseFlowProps) {
  const classes = ['prose__flow', 'prose-body', placementClass(placement), className].filter(Boolean).join(' ')
  if (html !== undefined) {
    return <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <div className={classes}>{children}</div>
}
