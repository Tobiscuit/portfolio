import { getProfile } from "@/lib/platform/reads";
import { GITHUB_URL, LINKEDIN_URL } from "@/lib/site";

/**
 * The site's footer (specs/002-proprietor-adoption, A5): the owner's name and
 * email from the platform's profile, or the site's own facts while it cannot
 * be read (app/lib/site.ts); LinkedIn and GitHub are the site's constants,
 * since the profile has no field for them. A server component; the profile
 * read never throws. Plain markup on the site's tokens.
 */
export default async function Footer() {
  const { name, email } = await getProfile();
  return (
    <footer className="w-full border-t border-ink-700">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-sm text-ink-500">
        <p>
          © {new Date().getUTCFullYear()} {name}
        </p>
        <ul className="flex flex-wrap gap-6" role="list">
          {email && (
            <li>
              <a href={`mailto:${email}`} className="hover:text-parchment-100 transition-colors">
                {email}
              </a>
            </li>
          )}
          <li>
            <a href={LINKEDIN_URL} className="hover:text-parchment-100 transition-colors">
              LinkedIn
            </a>
          </li>
          <li>
            <a href={GITHUB_URL} className="hover:text-parchment-100 transition-colors">
              GitHub
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
