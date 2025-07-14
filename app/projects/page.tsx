import ProjectCard from '../components/ProjectCard'

const projects = [
  {
    id: 1,
    title: "WeatherWise AI",
    description: "A case study in architectural refactoring, transforming a complex microservice proof-of-concept into a robust monolithic service.",
    image: "/weatherwise-screenshot.png",
  },
  {
    id: 2,
    title: "Project Beta",
    description: "A description for Project Beta, highlighting collaboration and innovation.",
  },
  {
    id: 3,
    title: "Project Gamma",
    description: "A description for Project Gamma, focusing on performance and user experience.",
  },
  {
    id: 4,
    title: "Project Delta",
    description: "A description for Project Delta, demonstrating proficiency in modern frameworks.",
  },
  {
    id: 5,
    title: "Project Epsilon",
    description: "A description for Project Epsilon, illustrating attention to detail and design.",
  },
  {
    id: 6,
    title: "Project Zeta",
    description: "A description for Project Zeta, summarizing a complex and challenging build.",
  }
]

export default function Projects() {
  return (
    <div className="min-h-screen bg-sage-blue-900">
      <div className="container mx-auto px-4 py-12 md:px-8">
        <header className="mb-12">
          <h1 className="font-serif text-parchment-100">Projects</h1>
          <p className="text-ink-500 mt-4">A selection of applications and systems I&apos;ve built</p>
        </header>
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </main>
      </div>
    </div>
  )
}