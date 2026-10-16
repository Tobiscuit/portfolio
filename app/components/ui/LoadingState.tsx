/**
 * Loading placeholders that reserve the same space as the real thing, so the
 * swap causes no layout shift. All are `aria-hidden`; announce loading state
 * on the surrounding region (`aria-busy`) instead.
 */

type SkeletonProps = {
  kind?: 'media' | 'title' | 'line'
  short?: boolean
  className?: string
}

export function Skeleton({ kind = 'line', short = false, className = '' }: SkeletonProps) {
  const classes = ['skeleton', `skeleton--${kind}`, short && 'is-short', className].filter(Boolean).join(' ')
  return <div className={classes} aria-hidden="true" />
}

export function CardSkeleton() {
  return (
    <li className="card" aria-hidden="true">
      <div className="card__media">
        <Skeleton kind="media" className="h-full rounded-none" />
      </div>
      <div className="card__title">
        <Skeleton kind="title" />
      </div>
      <div className="card__desc skeleton-stack">
        <Skeleton />
        <Skeleton short />
      </div>
      <div className="card__footer">
        <Skeleton short />
      </div>
    </li>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="card-grid" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </ul>
  )
}

export function ProseSkeleton({ lines = 8 }: { lines?: number }) {
  return (
    <div className="skeleton-stack" aria-busy="true" aria-label="Loading">
      <Skeleton kind="title" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} short={i % 4 === 3} />
      ))}
    </div>
  )
}
