import { ChevronLeft, ChevronRight } from 'lucide-react'
import TransitionLink from './TransitionLink'

type PaginationProps = {
  page: number
  totalPages: number
  /** Builds the href for a page number, e.g. `(p) => (p === 1 ? '/blog' : `/blog?page=${p}`)`. */
  hrefFor: (page: number) => string
  label?: string
  className?: string
}

/** Pages shown around the current one; the rest collapse into an ellipsis. */
function pageWindow(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set<number>([1, total, page - 1, page, page + 1])
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap')
    out.push(p)
  })
  return out
}

export default function Pagination({ page, totalPages, hrefFor, label = 'Pagination', className = '' }: PaginationProps) {
  if (totalPages <= 1) return null
  const prev = page > 1 ? page - 1 : null
  const next = page < totalPages ? page + 1 : null

  return (
    <nav className={`pagination ${className}`.trim()} aria-label={label}>
      <ul className="pagination__list">
        <li>
          {prev ? (
            <TransitionLink href={hrefFor(prev)} className="pagination__link" rel="prev">
              <ChevronLeft aria-hidden="true" /> <span>Previous</span>
            </TransitionLink>
          ) : (
            <span className="pagination__link" aria-disabled="true">
              <ChevronLeft aria-hidden="true" /> <span>Previous</span>
            </span>
          )}
        </li>
        {pageWindow(page, totalPages).map((item, i) =>
          item === 'gap' ? (
            <li key={`gap-${i}`} className="pagination__ellipsis" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <TransitionLink
                href={hrefFor(item)}
                className="pagination__link"
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
              >
                {item}
              </TransitionLink>
            </li>
          ),
        )}
        <li>
          {next ? (
            <TransitionLink href={hrefFor(next)} className="pagination__link" rel="next">
              <span>Next</span> <ChevronRight aria-hidden="true" />
            </TransitionLink>
          ) : (
            <span className="pagination__link" aria-disabled="true">
              <span>Next</span> <ChevronRight aria-hidden="true" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
