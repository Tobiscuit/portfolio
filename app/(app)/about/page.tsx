import type { Metadata } from 'next'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { TitledListItem } from '@/components/ui/TitledListItem'
import ResumeButton from '@/components/ResumeButton'
import PageShell, { Section } from '@/components/ui/PageShell'
import SectionHeader from '@/components/ui/SectionHeader'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Juan Ramirez runs a production platform on bare metal and builds the applications that live on it. Experience, certifications, education and how he builds.',
}

const readingList = [
  { title: 'Fundamentals of Software Architecture', subtitle: 'Mark Richards & Neal Ford' },
  { title: 'Software Architecture: The Hard Parts', subtitle: 'Mark Richards & Neal Ford' },
  { title: 'Acing the System Design Interview', subtitle: 'Zhiyong Tan' },
  { title: 'Grokking Algorithms', subtitle: 'Aditya Bhargava' },
  { title: 'Designing Data-Intensive Applications', subtitle: 'Martin Kleppmann' },
  { title: 'Clean Code', subtitle: 'Robert C. Martin' },
  { title: 'Clean Agile: Back to Basics', subtitle: 'Robert C. Martin' },
  { title: 'The Clean Coder', subtitle: 'Robert C. Martin' },
  { title: 'Clean Architecture', subtitle: 'Robert C. Martin' },
  { title: 'The Product Book', subtitle: 'Josh Anon, Carlos González de Villaumbrosia' },
  { title: "Executive's Guide to Cloud Computing", subtitle: 'Eric A. Marks, Bob Lozano' },
  { title: 'SQL QuickStart Guide', subtitle: 'Walter Shields' },
  { title: 'Terraform in Action', subtitle: 'Scott Winkler' },
  { title: 'AWS Cloud Architecture Patterns', subtitle: 'SK Singh' },
  { title: 'AWS Cloud Adoption Framework', subtitle: 'AWS' },
  { title: "Solutions Architect's Handbook", subtitle: 'Saurabh Shrivastava' },
  { title: 'Learn Azure in a Month of Lunches', subtitle: 'Iain Foulds' },
  { title: 'PMP PMBOK 7 Project Management Professional Audio Study Guide', subtitle: '2025-2026 Edition' },
  { title: 'The DevOps Handbook, Second Edition', subtitle: 'Gene Kim, Jez Humble, Patrick Debois, John Willis' },
]

export default function About() {
  return (
    <Section>
      <PageShell>
        <div className="about-layout">
          <div className="about-side">
            <div className="about-portrait">
              <Image
                alt="Juan Ramirez"
                src="/profile.webp"
                width={256}
                height={256}
                quality={90}
                priority
                placeholder="blur"
                blurDataURL="data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoQABAAAgA0JaQAA3AA/vuOAA=="
                sizes="(max-width: 64rem) 11rem, 13rem"
              />
            </div>
            <dl className="fact-list">
              <div>
                <dt>Role</dt>
                <dd>Platform engineer who builds the apps too</dd>
              </div>
              <div>
                <dt>Certified</dt>
                <dd>AWS Certified Cloud Practitioner</dd>
              </div>
              <div>
                <dt>Working toward</dt>
                <dd>LFCS</dd>
              </div>
              <div>
                <dt>Reading</dt>
                <dd>Designing Data-Intensive Applications, second edition: a second time through, building the chapters as I go</dd>
              </div>
            </dl>
            <ResumeButton>View résumé</ResumeButton>
          </div>

          <div className="stack--xl">
            <header>
              <p className="eyebrow">About</p>
              <h1>A Foundation Built on First Principles.</h1>
            </header>

            <div className="prose-body measure">
              <p>
                My journey into software development began with a deep-seated curiosity for how systems work at the
                metal level. I didn&apos;t just want to use computers; I wanted to optimize them. I spent years
                analyzing operating system architecture and kernel-level performance, a pursuit that taught me the
                importance of efficiency and resource management.
              </p>
              <p>
                This passion for system internals naturally evolved into a career in full-stack engineering. Today, I
                apply that same &quot;optimization mindset&quot; to web architecture—building applications that are not
                just functional, but performant, secure, and architecturally sound.
              </p>
              <p>
                In practice that means running a production platform and building the applications that live on
                it. The platform is a single-node Kubernetes cluster (k3s) reconciled from git by Argo CD: 38
                applications behind one identity provider, secrets issued by Vault, TLS from an internal CA, and
                deliberately vulnerable workloads isolated under default-deny network policy for security practice.
                Every change is a commit. A change made by hand gets reverted, and that reversion is the feature.
              </p>
              <p>
                I&apos;m currently designing its second site: an independent cluster in another cloud, asynchronous
                Postgres replication, and a third-site witness so a network partition can&apos;t produce two primaries.
                The diagrams, including the options I rejected and why, are public at{' '}
                <a href="https://superblock.dev">superblock.dev</a>.
              </p>
            </div>

            <section aria-labelledby="experience-title">
              <SectionHeader id="experience-title" title="Experience" />
              <ol className="timeline">
                <li className="timeline__item">
                  <span className="timeline__when">Now</span>
                  <h3 className="timeline__title">Technology Specialist, The Computer Hospital</h3>
                  <p className="timeline__body">Bench technician who ended up building the shop&apos;s tooling.</p>
                  <ul className="timeline__list">
                    <li>Pulse Diagnostics: Windows diagnostics tool for technicians, Tauri 2 + Rust</li>
                    <li>Pulse Agent: the Rust service behind it</li>
                    <li>Tech Setup Wizard: Rust TUI toolkit for standardising machine setup from a USB stick</li>
                    <li>tch-vault: internal secrets handling for the shop, Rust</li>
                  </ul>
                  <p className="timeline__body">
                    Built on shift, for the people I work next to, against the problems we actually had.
                  </p>
                </li>
                <li className="timeline__item">
                  <span className="timeline__when">Before</span>
                  <h3 className="timeline__title">Independent Contractor, JRCodex</h3>
                  <p className="timeline__body">
                    Engaged by Houston small businesses, found through Indeed, to design and build their web presence.
                    Most engagements ended before launch; the builds are complete and are the portfolio.
                  </p>
                  <ul className="timeline__list">
                    <li>
                      Headless e-commerce: Next.js storefront on the Shopify Storefront API, an owner-facing admin
                      dashboard, an AI-assisted product-photography workflow, and prompt-injection protection on every
                      model-facing input
                    </li>
                    <li>
                      Sites in Next.js/TypeScript and Astro, deployed to AWS Amplify and Cloudflare Workers with DNS and
                      TLS handled end to end
                    </li>
                  </ul>
                </li>
              </ol>
            </section>

            <section aria-labelledby="how-title">
              <SectionHeader
                id="how-title"
                title="How I build"
                lede="Four design decisions from Proprietor, the platform montanobtm.com runs on."
              />
              <ul className="tile-grid">
                <li className="tile reveal">
                  <h3 className="tile__title">Private engine</h3>
                  <p className="tile__body">
                    The engine and the AI agents are reachable only through internal connections (Workers service
                    bindings, Durable Object stubs); the only public doors are the sign-in-protected dashboard and the
                    client sites.
                  </p>
                  <p className="tile__note">
                    Cloudflare&apos;s version of app servers in a private network. Standard good practice, done
                    properly; not novel.
                  </p>
                </li>
                <li className="tile reveal">
                  <h3 className="tile__title">Defense in depth, five locks</h3>
                  <p className="tile__body">
                    Access sign-in re-verified in the Worker; the business comes from session memberships, never from
                    the client; the agent is chosen by business id; the agent refuses other businesses; a fitness test
                    forces business_id into every query.
                  </p>
                  <p className="tile__note">Honest limit: all five trust lock one.</p>
                </li>
                <li className="tile reveal">
                  <h3 className="tile__title">Block language</h3>
                  <p className="tile__body">
                    Model output constrained by JSON Schema; edits arrive as id-addressed operations and are accepted
                    per block; every piece of text is rendered and escaped by the platform. No model-written markup is
                    served.
                  </p>
                </li>
                <li className="tile reveal">
                  <h3 className="tile__title">Temporal facts</h3>
                  <p className="tile__body">
                    A knowledge-graph model (subject, relation, object, provenance, valid_until and superseded_by) kept
                    in SQL rather than a graph database, with the reasoning written down.
                  </p>
                </li>
              </ul>
            </section>

            <section aria-labelledby="training-title">
              <SectionHeader
                id="training-title"
                title="Certifications & training"
                lede="Trained across offensive and defensive security curricula (CySA+, PenTest+, SecurityX). AWS Certified Cloud Practitioner. Working toward LFCS."
              />
              <div className="split">
                <div>
                  <h3 className="project-aside__heading mb-space-xs">Certifications</h3>
                  <TitledListItem title="AWS Certified Cloud Practitioner" status="Earned" />
                  <TitledListItem title="AWS Solutions Architect Associate" status="Completed Course" />
                  <TitledListItem title="CompTIA Linux+" status="Completed Course" />
                  <TitledListItem title="CompTIA Security+" status="Completed Course" />
                  <TitledListItem title="CompTIA CySA+" status="Completed Course" />
                </div>
                <div>
                  <h3 className="project-aside__heading mb-space-xs">Education</h3>
                  <TitledListItem title="University of Houston" subtitle="Coursework in Computer Information Systems, 2016–2018" />
                  <TitledListItem
                    title="Houston Community College"
                    subtitle="Coursework in computer systems and network administration, 2013–2015"
                  />
                  <TitledListItem title="Zero To Mastery Academy" />
                </div>
              </div>
            </section>

            <section aria-labelledby="reading-title">
              <SectionHeader id="reading-title" title="Technical literature" />
              <details className="disclosure">
                <summary>
                  <ChevronRight aria-hidden="true" />
                  View the complete reading list ({readingList.length})
                </summary>
                <div className="disclosure__body">
                  {readingList.map((book) => (
                    <TitledListItem key={book.title} title={book.title} subtitle={book.subtitle} />
                  ))}
                </div>
              </details>
            </section>
          </div>
        </div>
      </PageShell>
    </Section>
  )
}
