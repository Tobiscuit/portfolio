import SiteFooter from "@/components/SiteFooter";
import { getProfile } from "@/lib/platform/reads";
import { GITHUB_URL } from "@/lib/site";

/**
 * The site's footer (specs/002-proprietor-adoption, A5): the owner's name and
 * email from the platform's profile, or the site's own facts while it cannot
 * be read (app/lib/site.ts), rendered by the design system's SiteFooter.
 * LinkedIn is SiteFooter's own constant; GitHub is added here, since the
 * profile has no field for either. A server component; the profile read
 * never throws.
 */
export default async function Footer() {
  const { name, email } = await getProfile();
  return <SiteFooter name={name} email={email} elsewhere={[{ href: GITHUB_URL, label: "GitHub" }]} />;
}
