
import Link from 'next/link'

// This data would typically be fetched from a CMS or database
const projects = [
  {
    id: 1,
    title: "Project Alpha",
    description: "A description for Project Alpha, showcasing problem-solving and technical skills.",
    features: ["Feature A", "Feature B", "Feature C"],
    tech: ["Next.js", "Tailwind CSS", "TypeScript"]
  },
  {
    id: 2,
    title: "Project Beta",
    description: "A description for Project Beta, highlighting collaboration and innovation.",
    features: ["Feature D", "Feature E", "Feature F"],
    tech: ["React", "Node.js", "PostgreSQL"]
  },
  {
    id: 3,
    title: "Project Gamma",
    description: "A description for Project Gamma, focusing on performance and user experience.",
    features: ["Feature G", "Feature H", "Feature I"],
    tech: ["Vue.js", "Firebase", "Stripe"]
  },
  {
    id: 4,
    title: "Project Delta",
    description: "A description for Project Delta, demonstrating proficiency in modern frameworks.",
    features: ["Feature J", "Feature K", "Feature L"],
    tech: ["SvelteKit", "GraphQL", "Prisma"]
  },
  {
    id: 5,
    title: "Project Epsilon",
    description: "A description for Project Epsilon, illustrating attention to detail and design.",
    features: ["Feature M", "Feature N", "Feature O"],
    tech: ["Angular", "RxJS", "MongoDB"]
  },
  {
    id: 6,
    title: "Project Zeta",
    description: "A description for Project Zeta, summarizing a complex and challenging build.",
    features: ["Feature P", "Feature Q", "Feature R"],
    tech: ["Go", "Docker", "Kubernetes"]
  }
]

export async function generateStaticParams() {
  return projects.map((project) => ({
    id: project.id.toString(),
  }))
}

type Props = {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function ProjectDetailsPage({ params }: Props) {
  const project = projects.find(p => p.id === parseInt(params.id))

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

  return (
    <div className="min-h-screen bg-sage-blue-900">
      <div className="container mx-auto px-4 py-12 md:px-8">
        <header className="mb-8">
          <Link href="/projects" className="text-sm text-arcane-gold-500 hover:underline flex items-center gap-2 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Projects
          </Link>
          <h1 className="font-serif text-5xl text-parchment-100 mb-2">{project.title}</h1>
          <p className="text-ink-500 text-lg">{project.description}</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="aspect-w-16 aspect-h-9 rounded-lg bg-ink-900 mb-8" style={{
              backgroundImage: `radial-gradient(#415A77 1px, transparent 1px)`,
              backgroundSize: `16px 16px`,
            }}>
              {/* Main project image placeholder */}
            </div>
            
            <h2 className="font-serif text-3xl text-parchment-100 mb-4">About the Project</h2>
            <div className="prose prose-invert text-parchment-300 max-w-none space-y-4">
              <p>This is where a more detailed explanation of the project would go. It would cover the challenges, the solutions, and the overall process from conception to deployment. For now, it&apos;s placeholder text.</p>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            </div>
          </div>
          
          <aside>
            <div className="sticky top-24 bg-ink-900/50 p-6 rounded-lg">
              <h3 className="font-serif text-2xl text-parchment-100 mb-4">Key Information</h3>
              
              <h4 className="font-bold text-parchment-200 mt-6 mb-2">Key Features</h4>
              <ul className="list-disc list-inside text-parchment-300 space-y-1">
                {project.features.map(feature => <li key={feature}>{feature}</li>)}
              </ul>

              <h4 className="font-bold text-parchment-200 mt-6 mb-2">Technologies Used</h4>
              <div className="flex flex-wrap gap-2">
                {project.tech.map(tech => (
                  <span key={tech} className="bg-ink-700 text-parchment-200 text-sm font-medium px-2.5 py-1 rounded">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
} 