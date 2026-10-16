import type { Metadata } from 'next'
import ProjectCard from '@/app/components/ProjectCard'
import PageShell, { Section } from '@/app/components/ui/PageShell'
import SectionHeader from '@/app/components/ui/SectionHeader'
import { CardGrid } from '@/app/components/ui/CardGrid'
import EmptyState from '@/app/components/ui/EmptyState'
import { getProjects } from '@/app/lib/getProjects'

export const metadata: Metadata = {
  title: 'Projects',
  description: "A selection of applications and systems Juan Ramirez has built, with case studies where they exist.",
}

export default async function Projects() {
  const projects = await getProjects()
  return (
    <Section>
      <PageShell>
        <SectionHeader
          as="h1"
          eyebrow="Work"
          title="Projects"
          lede="A selection of applications and systems I've built. A card opens the project page; Visit opens the build itself."
        />
        {projects.length > 0 ? (
          <CardGrid aria-label="All projects">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} priority={index < 3} headingLevel="h2" />
            ))}
          </CardGrid>
        ) : (
          <EmptyState title="Nothing here yet">Projects are on their way.</EmptyState>
        )}
      </PageShell>
    </Section>
  )
}
