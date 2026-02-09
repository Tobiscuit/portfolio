import ProjectCard from '@/components/ProjectCard'
import { projects } from '@/lib/project-data'

export default function Projects() {
  return (
    <div className="min-h-screen bg-sage-blue-900">
      <div className="container mx-auto px-4 py-12 md:px-8">
        <header className="mb-12">
          <h1 className="font-serif text-parchment-100">Projects</h1>
          <p className="text-ink-500 mt-4">A selection of applications and systems I&apos;ve built</p>
        </header>
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} priority={index < 6} />
          ))}
        </main>
      </div>
    </div>
  )
}