/* eslint-disable @next/next/no-img-element -- the engine's pictures come with their own srcset; /media serves them */
import type { PostSummary } from "@jrcodex/seo-kit";

import { formatDate } from "./format";

/**
 * /blog: every post newest first, each linking to the path the engine gave
 * it (specs/002-proprietor-adoption, A2). Plain semantic markup on the
 * site's tokens; the redesign lane styles it.
 */
export default function BlogIndex({ posts }: { posts: PostSummary[] }) {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <header className="mb-12">
        <h1 className="font-serif text-parchment-100">Blog</h1>
        <p className="text-ink-500 mt-4">Writing on the systems I build.</p>
      </header>

      {posts.length === 0 ? (
        <p className="text-ink-500">No posts yet.</p>
      ) : (
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-8" role="list">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="h-full bg-ink-900 rounded-lg overflow-hidden">
                {post.hero && (
                  <img
                    src={post.hero.src}
                    srcSet={post.hero.srcset || undefined}
                    sizes={post.hero.sizes || undefined}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-video object-cover"
                  />
                )}
                <div className="p-6">
                  <h2 className="font-serif text-parchment-100">
                    <a href={post.path} className="hover:text-arcane-gold-500 transition-colors">
                      {post.title}
                    </a>
                  </h2>
                  <p className="mt-2 text-parchment-300">{post.excerpt}</p>
                  <p className="mt-4 text-sm text-ink-500">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    <span aria-hidden="true"> · </span>
                    <span>{post.readingMinutes} min read</span>
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
