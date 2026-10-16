import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import TransitionLink from './TransitionLink'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'icon'
type Size = 'sm' | 'md' | 'lg'

function classes(variant: Variant, size: Size, block: boolean, className: string) {
  return ['btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block', className]
    .filter(Boolean)
    .join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  block?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', block = false, className = '', type = 'button', children, ...rest }: ButtonProps) {
  return (
    <button type={type} className={classes(variant, size, block, className)} {...rest}>
      {children}
    </button>
  )
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  variant?: Variant
  size?: Size
  block?: boolean
  children: ReactNode
}

/** Internal hrefs get client-side navigation with a view transition; external ones are plain anchors. */
export function ButtonLink({ href, variant = 'primary', size = 'md', block = false, className = '', children, ...rest }: ButtonLinkProps) {
  const cls = classes(variant, size, block, className)
  const isInternal = href.startsWith('/') && !href.startsWith('//')
  if (isInternal && !rest.download) {
    return (
      <TransitionLink href={href} className={cls} {...rest}>
        {children}
      </TransitionLink>
    )
  }
  return (
    <a href={href} className={cls} {...rest}>
      {children}
    </a>
  )
}
