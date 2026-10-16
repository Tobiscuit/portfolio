import type { Metadata } from "next";

import VideoList from "../../components/platform/VideoList";
import { getProfile, listVideos } from "@/lib/platform/reads";
import { absolute } from "@/lib/site";

/**
 * /videos: the cuts the owner chose to show (specs/002-proprietor-adoption,
 * A4, D6). While none are shown it is an empty page that asks not to be
 * indexed, never an error; the nav hides its link. Rendered per request.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [videos, { name }] = await Promise.all([listVideos(), getProfile()]);
  return {
    title: `Videos | ${name}`,
    alternates: { canonical: absolute("/videos") },
    ...(videos.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function Page() {
  return <VideoList videos={await listVideos()} />;
}
