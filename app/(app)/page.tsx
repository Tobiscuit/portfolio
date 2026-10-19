import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { getProjects } from '@/app/lib/getProjects'
import ProjectCard from '@/app/components/ProjectCard'
import ResumeButton from '@/app/components/ResumeButton'
import PageShell, { Section } from '@/app/components/ui/PageShell'
import SectionHeader from '@/app/components/ui/SectionHeader'
import { ButtonLink } from '@/app/components/ui/Button'
import { CardGrid } from '@/app/components/ui/CardGrid'
import { TagChip } from '@/app/components/ui/TagChip'

export const metadata: Metadata = {
  title: { absolute: 'Juan Ramirez — Platform engineer who builds the apps too' },
}

export default async function Home() {
  const projects = await getProjects()
  const featured = projects.slice(0, 3)

  return (
    <>
      <PageShell as="section" aria-labelledby="hero-title">
        <div className="hero">
          <div className="hero__copy">
            <p className="eyebrow hero__eyebrow">Juan Ramirez · Platform engineer</p>
            <h1 id="hero-title" className="hero__title">
              Code that scales, and the platform it runs on.
            </h1>
            <p className="lede hero__lede">
              I run a production platform and build the applications that live on it: k3s and GitOps on one side,
              React and Next.js on the other, with a multi-cloud failover site in design. AWS Certified Cloud
              Practitioner.
            </p>
            <div className="hero__actions">
              <ButtonLink href="/projects">
                See the work
                <ArrowRight aria-hidden="true" />
              </ButtonLink>
              <ResumeButton className="btn btn--secondary">Résumé</ResumeButton>
              <ButtonLink href="/contact" variant="tertiary">
                Start a project
              </ButtonLink>
            </div>
          </div>
          <figure className="hero__figure">
            <Image
              alt="Abstract representation of cloud architecture and security"
              src="/abstract-profile.webp"
              width={600}
              height={600}
              quality={85}
              priority
              placeholder="blur"
              blurDataURL="data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAACwAQCdASoQABAAAgA0JaQAA3AA/v3+gAAA/v8bjMIkH8+d0aPwAAAA"
              sizes="(max-width: 64rem) min(100vw, 26rem), 30vw"
            />
          </figure>
        </div>

        <ul className="proof-strip" aria-label="Platform facts">
          <li className="proof">
            <span className="proof__value">38 applications</span>
            <span className="proof__label">on one k3s cluster, reconciled from git by Argo CD</span>
          </li>
          <li className="proof">
            <span className="proof__value">One identity provider</span>
            <span className="proof__label">in front of every app; secrets issued by Vault; TLS from an internal CA</span>
          </li>
          <li className="proof">
            <span className="proof__value">Default-deny</span>
            <span className="proof__label">
              network policy isolating deliberately vulnerable workloads, for security practice
            </span>
          </li>
          <li className="proof">
            <span className="proof__value">Every change is a commit</span>
            <span className="proof__label">a change made by hand gets reverted, and that reversion is the feature</span>
          </li>
        </ul>
      </PageShell>

      <Section aria-labelledby="work-title">
        <PageShell>
          <SectionHeader
            id="work-title"
            eyebrow="Selected work"
            title="Three builds to start with."
            lede="The rest are on the projects page, with the reasoning behind each build where a write-up exists."
            actions={
              <ButtonLink href="/projects" variant="secondary">
                All projects
              </ButtonLink>
            }
          />
          <CardGrid aria-label="Selected projects">
            {featured.map((project, index) => (
              <ProjectCard key={project.id} project={project} priority={index === 0} headingLevel="h3" />
            ))}
          </CardGrid>
        </PageShell>
      </Section>

      <Section rule aria-labelledby="now-title">
        <PageShell>
          <SectionHeader id="now-title" eyebrow="Now" title="What I'm working on." />
          <dl className="tile-grid">
            <div className="tile reveal">
              <dt className="tile__title">
                The Computer Hospital <TagChip tone="accent">Technology Specialist</TagChip>
              </dt>
              <dd className="tile__body">
                Bench technician who ended up building the shop&apos;s tooling: Pulse Diagnostics, a Windows
                diagnostics tool for technicians in Tauri 2 and Rust; Pulse Agent, the Rust service behind it; a Rust
                TUI toolkit for standardising machine setup from a USB stick; and tch-vault, internal secrets handling
                for the shop. Built on shift, for the people I work next to, against the problems we actually had.
              </dd>
            </div>
            <div className="tile reveal">
              <dt className="tile__title">
                Fluency <TagChip tone="warning">In progress</TagChip>
              </dt>
              <dd className="tile__body">
                A spaced-repetition learning system in Next.js 16 with FSRS scheduling and AI-assisted deck generation.
                Generation and review work; migration from its predecessor does not yet. Listed as in progress on
                purpose.{' '}
                <a className="tile__link" href="https://fluency.study">
                  fluency.study
                </a>
              </dd>
            </div>
            <div className="tile reveal">
              <dt className="tile__title">
                superblock.dev <TagChip tone="accent">Platform</TagChip>
              </dt>
              <dd className="tile__body">
                A single-node Kubernetes platform (k3s) reconciled from git by Argo CD. The site publishes the
                architecture, including the options I rejected and why.{' '}
                <a className="tile__link" href="https://superblock.dev">
                  superblock.dev
                </a>
              </dd>
            </div>
            <div className="tile reveal">
              <dt className="tile__title">
                A second site <TagChip tone="warning">Designing</TagChip>
              </dt>
              <dd className="tile__body">
                An independent cluster in another cloud, asynchronous Postgres replication, and a third-site witness so
                a network partition can&apos;t produce two primaries.
              </dd>
            </div>
          </dl>
        </PageShell>
      </Section>

      <Section rule aria-labelledby="hire-title">
        <PageShell>
          <div className="cta-panel">
            <div>
              <h2 id="hire-title" className="cta-panel__title">
                Need a website for your business?
              </h2>
              <p className="cta-panel__text">
                I have built sites for Houston small businesses in Next.js, TypeScript and Astro, deployed to AWS
                Amplify and Cloudflare Workers with DNS and TLS handled end to end.{' '}
                <a href="https://montanobtm.com">montanobtm.com</a> is live on my platform today. Tell me what your
                site has to do and I&apos;ll reply personally, usually within a couple of days.
              </p>
            </div>
            <ButtonLink href="/contact" size="lg">
              Tell me about your project
            </ButtonLink>
          </div>
        </PageShell>
      </Section>
    </>
  )
}
