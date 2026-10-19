import { listVideos } from "@/lib/platform/reads";

/**
 * Whether the header shows "Videos" (specs/002-proprietor-adoption, A4): only
 * when the owner has shown at least one cut. The root layout asks once per
 * render and hands Header (a client component) the answer as a prop. With
 * kit 0.6.2 over http(), the production transport today, the list is always
 * empty and nothing is asked of the engine.
 */
export async function showVideosInNav(): Promise<boolean> {
  return (await listVideos()).length > 0;
}
