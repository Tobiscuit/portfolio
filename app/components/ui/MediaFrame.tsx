import type { CSSProperties, ReactNode } from 'react'

type MediaFrameProps = {
  children: ReactNode
  /** CSS aspect-ratio, e.g. "16 / 9", "4 / 3", "1"; `auto` lets the media set its own height. */
  ratio?: string
  /** `cover` (default) fills the frame; `contain` letterboxes diagrams. */
  fit?: 'cover' | 'contain'
  /** No border/background: for images that already have their own frame. */
  bare?: boolean
  caption?: ReactNode
  /** Called when the media is clicked (opens a lightbox). Only pass from client components. */
  onZoom?: () => void
  zoomLabel?: string
  /** Applied to the media box (e.g. a `view-transition-name`). */
  mediaStyle?: CSSProperties
  className?: string
}

/**
 * A figure with a fixed aspect ratio (no layout shift) and an optional caption.
 * Works for images, `<video>`, and iframes (see VideoEmbed).
 */
export default function MediaFrame({
  children,
  ratio = '16 / 9',
  fit = 'cover',
  bare = false,
  caption,
  onZoom,
  zoomLabel = 'View larger',
  mediaStyle,
  className = '',
}: MediaFrameProps) {
  const classes = ['media-frame', fit === 'contain' && 'media-frame--contain', ratio === 'auto' && 'media-frame--auto', bare && 'media-frame--bare', className]
    .filter(Boolean)
    .join(' ')
  const style = { ...(ratio !== 'auto' ? { '--aspect': ratio } : {}), ...mediaStyle } as CSSProperties

  const media = (
    <div className="media-frame__media" style={style}>
      {children}
    </div>
  )

  return (
    <figure className={classes}>
      {onZoom ? (
        <button type="button" className="media-frame__button" onClick={onZoom} aria-label={zoomLabel}>
          {media}
        </button>
      ) : (
        media
      )}
      {caption && <figcaption className="media-frame__caption">{caption}</figcaption>}
    </figure>
  )
}
