import type { Metadata } from "next";

import BlogIndex from "../../components/platform/BlogIndex";
import { getProfile, listPosts } from "@/lib/platform/reads";
import { absolute } from "@/lib/site";

/**
 * /blog: the posts from the platform (specs/002-proprietor-adoption, A2).
 * Rendered per request, so a new post shows without a deploy and a build
 * never depends on the engine answering. A connected failure is a 5xx.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [posts, { name }] = await Promise.all([listPosts(), getProfile()]);
  return {
    title: `Blog | ${name}`,
    description: `Writing by ${name} on the systems he builds.`,
    alternates: { canonical: absolute("/blog") },
    // An index with nothing on it is not worth a search result.
    ...(posts.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function Page() {
  return <BlogIndex posts={await listPosts()} />;
}
