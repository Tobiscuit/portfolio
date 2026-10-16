'use client'

import { useState, type CSSProperties } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { SuspenseImage, SuspenseSvg } from '@/app/components/ui/SuspenseImage'
import ImageModal from '@/app/components/ImageModal'
import MediaFrame from '@/app/components/ui/MediaFrame'
import PageShell, { Section } from '@/app/components/ui/PageShell'
import TransitionLink from '@/app/components/ui/TransitionLink'
import { TagList } from '@/app/components/ui/TagChip'
import { hostnameOf, projectTransitionName } from '@/app/components/ProjectCard'
import type { Project } from '@/app/lib/types'

export default function ProjectDetailsView({ project }: { project: Project }) {
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null)
  const openModal = (imageUrl: string) => setModalImageUrl(imageUrl)
  const closeModal = () => setModalImageUrl(null)

  // Diagrams and screenshots inside the write-up: a captioned figure that opens the zoom viewer.
  const renderFigure = (src: string | undefined, alt: string, blurDataURL?: string) => {
    if (!src) return null
    const isSvg = src.endsWith('.svg')
    return (
      <MediaFrame
        ratio="auto"
        fit="contain"
        caption={alt || undefined}
        onZoom={() => openModal(src)}
        zoomLabel={`View larger: ${alt || 'diagram'}`}
      >
        {isSvg ? (
          <SuspenseSvg src={src} alt="" />
        ) : (
          <SuspenseImage
            src={src}
            alt=""
            width={1200}
            height={800}
            aspectRatio="3/2"
            sizes="(max-width: 64rem) 100vw, 60vw"
            className="w-full h-full object-contain"
            blurDataURL={blurDataURL}
          />
        )}
      </MediaFrame>
    )
  }

  const hero = (
    <MediaFrame
      ratio="16 / 9"
      mediaStyle={{ viewTransitionName: projectTransitionName(project.id) } as CSSProperties}
    >
      {project.image ? (
        <SuspenseImage
          src={project.image}
          alt={`Screenshot of ${project.title}`}
          blurDataURL={project.blurDataURL}
          priority={true}
          width={1920}
          height={1080}
          sizes="(max-width: 72rem) 100vw, 72rem"
          className="w-full h-full object-cover"
          aspectRatio="16/9"
        />
      ) : (
        <div className="media-placeholder" aria-hidden="true" />
      )}
    </MediaFrame>
  )

  const { caseStudy } = project

  return (
    <>
      <div className="reading-progress" aria-hidden="true" />
      <Section spacing="tight">
        <PageShell>
          <TransitionLink href="/projects" className="back-link">
            <ArrowLeft aria-hidden="true" />
            All projects
          </TransitionLink>

          <article aria-labelledby="project-title">
            <header className="project-hero mt-space-m">
              <h1 id="project-title" className="project-hero__title">{project.title}</h1>
              <p className="lede measure">{project.description}</p>
              <TagList items={project.tech} label="Technologies used" />
              {project.url ? (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-media-link"
                  aria-label={`Open ${hostnameOf(project.url)} in a new tab`}
                >
                  {hero}
                </a>
              ) : (
                hero
              )}
            </header>

            <div className="project-layout">
              <div className="prose-body">
                {!caseStudy ? (
                  <p>A detailed case study for this project is coming soon.</p>
                ) : (
                  <>
                    <h2>{caseStudy.intro.title}</h2>
                    <p dangerouslySetInnerHTML={{ __html: caseStudy.intro.text }} />
                    {renderFigure(caseStudy.intro.image, caseStudy.intro.imageAlt || '', caseStudy.intro.blurDataURL)}

                    {caseStudy.sections.map((section, index) => (
                      <section key={index} aria-labelledby={`section-${index}`}>
                        <h2 id={`section-${index}`}>{section.title}</h2>
                        <p dangerouslySetInnerHTML={{ __html: section.text }} />
                        {section.list && (
                          <ol>
                            {section.list.map((item, i) => (
                              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                            ))}
                          </ol>
                        )}
                        {renderFigure(section.image, section.imageAlt || '', section.blurDataURL)}
                      </section>
                    ))}

                    <h2>{caseStudy.conclusion.title}</h2>
                    <p dangerouslySetInnerHTML={{ __html: caseStudy.conclusion.text }} />

                    {caseStudy.futureWork && (
                      <>
                        <h2>{caseStudy.futureWork.title}</h2>
                        <p dangerouslySetInnerHTML={{ __html: caseStudy.futureWork.intro }} />
                        <ul>
                          {caseStudy.futureWork.points.map((point, i) => (
                            <li key={i}>
                              <strong>{point.title}:</strong> <span dangerouslySetInnerHTML={{ __html: point.text }} />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {caseStudy.finalArchitecture && (
                      <>
                        <h2>{caseStudy.finalArchitecture.title}</h2>
                        <p dangerouslySetInnerHTML={{ __html: caseStudy.finalArchitecture.text }} />
                        <p>The final cloud architecture I deployed is as follows:</p>
                        {renderFigure(
                          caseStudy.finalArchitecture.image,
                          caseStudy.finalArchitecture.imageAlt,
                          caseStudy.finalArchitecture.blurDataURL,
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              <aside className="project-aside">
                <div className="project-aside__panel">
                  <h2 className="project-aside__heading">Key features</h2>
                  <ul className="key-list">
                    {project.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
                {project.url && (
                  <a href={project.url} target="_blank" rel="noopener noreferrer" className="btn btn--secondary">
                    Visit {hostnameOf(project.url)}
                    <ExternalLink aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </aside>
            </div>
          </article>
        </PageShell>
      </Section>
      <ImageModal imageUrl={modalImageUrl} onClose={closeModal} />
    </>
  )
}
