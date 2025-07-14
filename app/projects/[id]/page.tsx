import Link from 'next/link'
import { projects } from '@/app/lib/project-data' // Assuming you move the data here
import ProjectDetailsView from '@/app/components/ProjectDetailsView'

// Define the type for a single project based on the data structure
type Project = {
  id: number;
  title: string;
  description: string;
  features: string[];
  tech: string[];
  image?: string;
};

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return projects.map((project: Project) => ({
    id: project.id.toString(),
  }))
}

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  const project = projects.find((p: Project) => p.id === parseInt(params.id))

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