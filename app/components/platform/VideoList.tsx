import type { VideoSummary } from "@/lib/platform/videos";

import { formatDuration } from "./format";

/**
 * /videos: one player per cut the owner showed, newest first (spec 002, D6).
 * `preload="metadata"` fetches only the duration and the first frame until
 * the visitor presses play. Plain semantic markup; the redesign lane styles it.
 */
export default function VideoList({ videos }: { videos: VideoSummary[] }) {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <header className="mb-12">
        <h1 className="font-serif text-parchment-100">Videos</h1>
      </header>

      {videos.length === 0 ? (
        <p className="text-ink-500">No videos yet.</p>
      ) : (
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-8" role="list">
          {videos.map((video) => (
            <li key={video.id}>
              <figure data-format={video.format}>
                <video
                  controls
                  preload="metadata"
                  playsInline
                  className={`w-full rounded-lg bg-ink-900 ${video.format === "portrait" ? "aspect-[9/16] max-w-sm" : "aspect-video"}`}
                >
                  <source src={video.src} type={video.contentType} />
                </video>
                <figcaption className="mt-3 text-parchment-100">
                  {video.title}
                  <span aria-hidden="true" className="text-ink-500"> · </span>
                  <time dateTime={`PT${Math.round(video.seconds)}S`} className="text-ink-500">
                    {formatDuration(video.seconds)}
                  </time>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
