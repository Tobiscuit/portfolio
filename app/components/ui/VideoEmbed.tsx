import type { ReactNode } from 'react'
import MediaFrame from './MediaFrame'

type VideoEmbedProps = {
  /** Embed URL (YouTube `/embed/…`, Twitch player, Cloudflare Stream iframe …). */
  src: string
  /** Required: the accessible name of the player. */
  title: string
  ratio?: string
  caption?: ReactNode
  /** Permissions policy for the iframe. */
  allow?: string
  className?: string
}

/** Lazy, aspect-ratio-locked iframe inside a MediaFrame. No layout shift, no script. */
export default function VideoEmbed({
  src,
  title,
  ratio = '16 / 9',
  caption,
  allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
  className = '',
}: VideoEmbedProps) {
  return (
    <MediaFrame ratio={ratio} caption={caption} className={`video-embed ${className}`.trim()}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow={allow}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </MediaFrame>
  )
}
