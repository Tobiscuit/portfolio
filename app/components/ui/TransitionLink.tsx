'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ComponentProps } from 'react'

/**
 * Same-document View Transitions for App Router navigations, with no library.
 *
 * `next/link` only fires `onNavigate` for client-side, same-origin navigations,
 * and lets us cancel its own push. When the browser supports
 * `document.startViewTransition` and the visitor has not asked for reduced
 * motion, we run the push inside a view transition and settle it once the new
 * pathname has committed (see `ViewTransitionSettler`, mounted in the layout).
 *
 * Everywhere else this is a plain `<Link>`: no transition, identical routing.
 * Cross-document navigations (hard loads) are covered by `@view-transition`
 * in the stylesheet instead.
 */

type Pending = { resolve: (() => void) | null }
const pending: Pending = { resolve: null }

const SETTLE_TIMEOUT_MS = 1200

function settle() {
  pending.resolve?.()
  pending.resolve = null
}

function canTransition(): boolean {
  if (typeof document === 'undefined') return false
  if (typeof document.startViewTransition !== 'function') return false
  if (typeof window.matchMedia !== 'function') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Mount once (in the root layout). Resolves the in-flight transition when the route commits. */
export function ViewTransitionSettler() {
  const pathname = usePathname()
  useEffect(() => {
    settle()
  }, [pathname])
  return null
}

type TransitionLinkProps = ComponentProps<typeof Link>

export default function TransitionLink({ onNavigate, href, ...rest }: TransitionLinkProps) {
  const router = useRouter()

  return (
    <Link
      href={href}
      {...rest}
      onNavigate={(event) => {
        onNavigate?.(event)
        if (!canTransition()) return
        const target = typeof href === 'string' ? href : href.pathname ?? null
        if (!target) return

        event.preventDefault()
        // Any transition still waiting is superseded.
        settle()

        document.startViewTransition(() => {
          const done = new Promise<void>((resolve) => {
            pending.resolve = resolve
            window.setTimeout(resolve, SETTLE_TIMEOUT_MS)
          })
          router.push(target)
          return done
        })
      }}
    />
  )
}
