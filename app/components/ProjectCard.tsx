'use client'

import Link from 'next/link'
import { SuspenseImage, ImageSkeleton } from './ui/SuspenseImage'
import type { Project } from '@/app/lib/types'

type ProjectCardProps = {
  project: Project
  priority?: boolean
}

export default function ProjectCard({ project, priority = false }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg">
          {project.image ? (
            <SuspenseImage
              src={project.image}
              alt={project.title}
              width={1920}
              height={1080}
              quality={90}
              priority={priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300 aspect-[16/9]"
              aspectRatio="16/9"
              blurDataURL={project.blurDataURL}
            />
          ) : (
            <div className="w-full bg-ink-900 aspect-[16/9]" style={{
              backgroundImage: `radial-gradient(#415A77 1px, transparent 1px)`,
              backgroundSize: `12px 12px`,
            }}>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-serif text-parchment-100 group-hover:text-arcane-gold-500 transition-colors">
            {project.title}
          </h4>
          <p className="text-sm text-ink-500 mt-1">
            {project.description}
          </p>
        </div>
      </div>
    </Link>
  )
}