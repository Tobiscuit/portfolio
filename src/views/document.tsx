import type { BusinessProfile } from "@jrcodex/seo-kit";
import type { Child } from "hono/jsx";

import type { ProfileLink } from "../../lib/profile-links";
import { absolute, PERSON_NAME } from "../../lib/site";
import { FONT_PRELOADS, STYLESHEET } from "../assets";
import { Icon } from "./ui";

/**
 * The document every page renders into: what Next.js's metadata API and root
 * layout did, now explicit (spec 003 section 2.3). Landmarks as PR #5 tested
 * them: skip link, banner, main#main, contentinfo; one h1, rendered by the
 * page.
 */

export interface PageMeta {
  /** The page's own title; the document title is "<title> — Juan Ramirez" except on the home page. */
  title: string;
  description: string;
  /** Root-relative path of the canonical URL. */
  path: string;
  /** An absolute canonical given by the engine (a post's), overriding `path`. */
  canonical?: string;
  /** hreflang alternates (a post's), absolute. */
  alternates?: Array<{ locale: string; url: string }>;
  ogType?: "website" | "article" | "profile";
  /** An absolute image URL for link previews. */
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: unknown[];
}

export interface Chrome {
  /** The current path, for aria-current in the nav. */
  path: string;
  profile: BusinessProfile;
  links: ProfileLink[];
  /** Extra scripts this page needs (the contact page's htmx and Turnstile). */
  scripts?: Array<{ src: string; async?: boolean; defer?: boolean; crossorigin?: boolean }>;
  /** Inline script appended at the end of body, page-specific. */
  inlineScript?: string;
}

const NAV = [
  { href: "/work", text: "Work" },
  { href: "/blog", text: "Writing" },
  { href: "/about", text: "About" },
  { href: "/contact", text: "Contact" },
] as const;

const isCurrent = (current: string, href: string) => current === href || current.startsWith(`${href}/`);

/** Runs before first paint, so a stored light/dark choice never flashes (PR #5's ThemeToggle bootstrap). */
export const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}`;

/** The toggle only exists with JavaScript: no dead control without it. */
export const THEME_TOGGLE = `(function(){var b=document.querySelector('.theme-toggle');if(!b)return;b.hidden=false;b.addEventListener('click',function(){var r=document.documentElement,n=r.dataset.theme==='light'?'dark':'light';r.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}})})();`;

export function documentTitle(meta: PageMeta): string {
  return meta.path === "/" ? `${PERSON_NAME} — Software engineer` : `${meta.title} — ${PERSON_NAME}`;
}

export function Document({ meta, chrome, children }: { meta: PageMeta; chrome: Chrome; children: Child }) {
  const title = documentTitle(meta);
  const canonical = meta.canonical ?? absolute(meta.path);
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={canonical} />
        {(meta.alternates ?? []).map((alt) => (
          <link rel="alternate" hreflang={alt.locale} href={alt.url} />
        ))}
        {meta.noindex ? <meta name="robots" content="noindex" /> : null}
        <meta name="theme-color" content="#0D1B2A" />
        <meta property="og:type" content={meta.ogType ?? "website"} />
        <meta property="og:site_name" content={PERSON_NAME} />
        <meta property="og:title" content={meta.path === "/" ? title : meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={canonical} />
        {meta.ogImage ? <meta property="og:image" content={meta.ogImage} /> : null}
        <meta name="twitter:card" content={meta.ogImage ? "summary_large_image" : "summary"} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {FONT_PRELOADS.map((href) => (
          <link rel="preload" href={href} as="font" type="font/woff2" crossorigin="anonymous" />
        ))}
        <link rel="stylesheet" href={STYLESHEET.href} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {(meta.jsonLd ?? []).map((data) => (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(data) }} />
        ))}
        {(chrome.scripts ?? []).map((script) => (
          <script src={script.src} async={script.async} defer={script.defer} crossorigin={script.crossorigin ? "anonymous" : undefined} />
        ))}
      </head>
      <body>
        <a class="skip-link" href="#main">
          Skip to content
        </a>
        <div class="site">
          <Header path={chrome.path} />
          <main id="main" class="site-main" tabindex={-1}>
            {children}
          </main>
          <Footer profile={chrome.profile} links={chrome.links} />
        </div>
        <script dangerouslySetInnerHTML={{ __html: THEME_TOGGLE + (chrome.inlineScript ?? "") }} />
      </body>
    </html>
  );
}

function Header({ path }: { path: string }) {
  return (
    <header class="site-header">
      <div class="shell site-header__inner">
        <a href="/" class="site-header__brand">
          <Icon.monogram />
          <span>{PERSON_NAME}</span>
        </a>
        <nav class="site-nav" aria-label="Primary">
          {NAV.map((link) => (
            <a href={link.href} class="site-nav__link" aria-current={isCurrent(path, link.href) ? "page" : undefined}>
              {link.text}
            </a>
          ))}
        </nav>
        <div class="site-header__actions">
          <button type="button" class="theme-toggle" hidden>
            <Icon.sun />
            <Icon.moon />
            <span class="sr-only theme-toggle__label theme-toggle__label--to-light">Switch to light theme</span>
            <span class="sr-only theme-toggle__label theme-toggle__label--to-dark">Switch to dark theme</span>
          </button>
          <button type="button" class="btn btn--icon menu-button" popovertarget="site-menu" aria-label="Open menu">
            <Icon.menu />
          </button>
        </div>
      </div>
      {/* The small-screen menu: a popover, so Esc, light dismiss and the top layer come from the platform, with no script. */}
      <nav id="site-menu" popover="auto" class="nav-popover" aria-label="Menu">
        <ul class="nav-popover__list">
          {NAV.map((link) => (
            <li>
              <a href={link.href} class="nav-popover__link" aria-current={isCurrent(path, link.href) ? "page" : undefined}>
                {link.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function Footer({ profile, links }: { profile: BusinessProfile; links: ProfileLink[] }) {
  const year = new Date().getUTCFullYear();
  return (
    <footer class="site-footer">
      <div class="shell">
        <div class="site-footer__grid">
          <div>
            <p class="site-footer__brand">{profile.name}</p>
            <p class="site-footer__tagline">Software engineer. I build on Cloudflare Workers and run my own Kubernetes platform.</p>
          </div>
          <div>
            <h2 class="site-footer__heading">Elsewhere</h2>
            <ul class="site-footer__list">
              {links.map((link) => (
                <li>
                  <a href={link.href} rel="me noopener">
                    {link.label}
                  </a>
                </li>
              ))}
              {profile.email ? (
                <li>
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <h2 class="site-footer__heading">This site</h2>
            <ul class="site-footer__list">
              {NAV.map((link) => (
                <li>
                  <a href={link.href}>{link.text}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div class="site-footer__meta">
          <span>
            © {year} {profile.name}
          </span>
          <span>
            Hono on Cloudflare Workers, content from Proprietor. <a href="https://github.com/Tobiscuit/portfolio">Source</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

/** JSON inside <script>: `<` escaped so the data can never close the tag. */
export function jsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
