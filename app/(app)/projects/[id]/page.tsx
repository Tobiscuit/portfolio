import Link from 'next/link'
import { getProjects, getProject } from '@/app/lib/getProjects'
import ProjectDetailsView from '@/app/components/ProjectDetailsView'
import type { Project } from '@/app/lib/types'

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const projects = await getProjects()
  return projects.map((project: Project) => ({
    id: String(project.id),
  }))
}

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    return (
      <div className="min-h-screen bg-sage-blue-900 text-parchment-100 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-serif mb-4">Project Not Found</h1>
        <Link href="/projects" className="text-arcane-gold-500 hover:underline">
          Back to Projects
        </Link>
      </div>
    )
  }

  return <ProjectDetailsView project={project} />
} 