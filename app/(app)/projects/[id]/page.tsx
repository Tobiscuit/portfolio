import type { Metadata } from 'next'
import { getProjects, getProject } from '@/app/lib/getProjects'
import ProjectDetailsView from '@/app/components/ProjectDetailsView'
import PageShell, { Section } from '@/app/components/ui/PageShell'
import EmptyState from '@/app/components/ui/EmptyState'
import { ButtonLink } from '@/app/components/ui/Button'
import type { Project } from '@/app/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const projects = await getProjects()
  return projects.map((project: Project) => ({
    id: String(project.id),
  }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const project = await getProject(id)
  if (!project) return { title: 'Project not found' }
  return { title: project.title, description: project.description }
}

export default async function ProjectDetailsPage({ params }: Params) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    return (
      <Section spacing="loose">
        <PageShell size="narrow">
          <EmptyState
            as="h1"
            title="Project not found"
            actions={
              <ButtonLink href="/projects" variant="secondary">
                Back to projects
              </ButtonLink>
            }
          >
            There is no project at this address. It may have been renamed or removed.
          </EmptyState>
        </PageShell>
      </Section>
    )
  }

  return <ProjectDetailsView project={project} />
}
