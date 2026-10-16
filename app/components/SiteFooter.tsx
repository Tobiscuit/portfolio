import type { ReactNode } from 'react'
import TransitionLink from './ui/TransitionLink'

export const CONTACT_EMAIL = 'jramirez203@outlook.com'
export const LINKEDIN_URL = 'https://www.linkedin.com/in/cloud-juan-manuel-ramirez/'
export const RESUME_PATH = '/JuanRamirez-Resume-September-2025.pdf'

const siteLinks = [
  { href: '/projects', text: 'Work' },
  { href: '/about', text: 'About' },
  { href: '/contact', text: 'Contact' },
]

type SiteFooterProps = {
  /** Owner's name; defaults to the site's own. The platform profile can pass it in. */
  name?: string
  /** Contact email; defaults to the site's own. Pass null to hide it. */
  email?: string | null
  /** Extra links for the "Elsewhere" column (e.g. GitHub). */
  elsewhere?: { href: string; label: string }[]
  /** Extra profile details rendered under the tagline. */
  children?: ReactNode
}

export default function SiteFooter({ name = 'Juan Ramirez', email = CONTACT_EMAIL, elsewhere = [], children }: SiteFooterProps) {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__grid">
          <div>
            <p className="site-footer__brand">{name}</p>
            <p className="site-footer__tagline">
              Platform engineer: k3s, GitOps, Vault, Argo CD. Builds the apps too (React/Next.js).
            </p>
            {children}
          </div>
          <nav aria-label="Footer">
            <h2 className="site-footer__heading">Site</h2>
            <ul className="site-footer__list">
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <TransitionLink href={link.href}>{link.text}</TransitionLink>
                </li>
              ))}
              <li>
                <a href={RESUME_PATH} download>
                  Résumé (PDF)
                </a>
              </li>
            </ul>
          </nav>
          <div>
            <h2 className="site-footer__heading">Elsewhere</h2>
            <ul className="site-footer__list">
              {email && (
                <li>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
              <li>
                <a href={LINKEDIN_URL} rel="me">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://superblock.dev">superblock.dev</a>
              </li>
              <li>
                <a href="https://fluency.study">fluency.study</a>
              </li>
              {elsewhere.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="site-footer__meta">
          <span>
            © {year} {name}
          </span>
          <span>jrcodex.dev</span>
        </div>
      </div>
    </footer>
  )
}
