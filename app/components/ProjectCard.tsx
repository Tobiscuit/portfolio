'use client'

import type { CSSProperties } from 'react'
import { ExternalLink } from 'lucide-react'
import { Card } from './ui/CardGrid'
import { TagList } from './ui/TagChip'
import { SuspenseImage } from './ui/SuspenseImage'
import type { Project } from '@/app/lib/types'

/** Shared element name: the card image morphs into the detail page hero. */
export const projectTransitionName = (id: number) => `project-${id}`

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

type ProjectCardProps = {
  project: Project
  priority?: boolean
  /** h2 on the projects index; h3 when the grid sits under a section heading. */
  headingLevel?: 'h2' | 'h3'
}

export default function ProjectCard({ project, priority = false, headingLevel = 'h2' }: ProjectCardProps) {
  return (
    <Card
      as="li"
      title={project.title}
      titleAs={headingLevel}
      href={`/projects/${project.id}`}
      description={project.description}
      mediaStyle={{ viewTransitionName: projectTransitionName(project.id) } as CSSProperties}
      media={
        project.image ? (
          <SuspenseImage
            src={project.image}
            alt=""
            width={1920}
            height={1080}
            quality={80}
            priority={priority}
            sizes="(max-width: 48rem) 100vw, (max-width: 64rem) 50vw, 33vw"
            className="w-full h-full object-cover"
            aspectRatio="16/9"
            blurDataURL={project.blurDataURL}
          />
        ) : undefined
      }
      footer={
        <>
          <TagList items={project.tech} max={3} label="Technologies" />
          {project.url && (
            <a className="card__external" href={project.url} target="_blank" rel="noopener noreferrer">
              Visit
              <ExternalLink aria-hidden="true" />
              <span className="sr-only"> {hostnameOf(project.url)} (opens in a new tab)</span>
            </a>
          )}
        </>
      }
    />
  )
}
