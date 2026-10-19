import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { postMetadata } from "@jrcodex/seo-kit/next";

import BlogPost from "../../../components/platform/BlogPost";
import { getPost, getProfile } from "@/lib/platform/reads";

/**
 * /blog/<slug>: one post from the platform (specs/002-proprietor-adoption,
 * A2). The canonical, hreflang and Open Graph are the engine's, through the
 * kit's postMetadata; only the title gains the owner's name. No such post is
 * a 404; a failed read is a 5xx, never a 404. Rendered per request.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const { name } = await getProfile();
  return { ...postMetadata(post), title: `${post.title} | ${name}` };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return <BlogPost post={post} />;
}
