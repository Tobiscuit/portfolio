
import Link from 'next/link'
import Image from 'next/image'

// This data would typically be fetched from a CMS or database
const projects = [
  {
    id: 1,
    title: "WeatherWise AI: A Case Study in Architectural Refactoring",
    description: "This project showcases the strategic refactoring of a cloud-native application, transforming a complex microservice proof-of-concept into a robust, maintainable, and performant monolithic service ready for automated deployment.",
    features: [
      "AI-Powered Weather Summaries", 
      "Monolithic Service Refactoring", 
      "Test-Driven Development", 
      "Automated CI/CD with Cloud Build"
    ],
    tech: [
      "Google Cloud Run", 
      "Google Gemini", 
      "Fastify", 
      "TypeScript", 
      "Jest", 
      "Open-Meteo API", 
      "Geocode Maps API"
    ],
    image: "/weatherwise-screenshot.png"
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

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return projects.map((project) => ({
    id: project.id.toString(),
  }))
}

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
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
            <div className="aspect-w-16 aspect-h-9 rounded-lg bg-ink-900 mb-8 overflow-hidden">
              {project.image ? (
                <Image
                  src={project.image}
                  alt={`Screenshot of ${project.title}`}
                  width={1920}
                  height={1080}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" style={{
                  backgroundImage: `radial-gradient(#415A77 1px, transparent 1px)`,
                  backgroundSize: `16px 16px`,
                }}></div>
              )}
            </div>
            
            <div className="prose prose-invert text-parchment-300 max-w-none space-y-6">
              <h2 className="font-serif text-3xl text-parchment-100 mb-4">The Initial Spark: Questioning the "As-Is" Architecture</h2>
              <p>My involvement began with a simple request: to understand the WeatherWise application's architecture. The initial diagrams revealed a system composed of two distinct microservices: a main application backend and a separate service for its AI component, "Nimbus," which used Google Gemini to generate summaries.</p>
              
              <div className="p-4 my-6 border border-dashed border-ink-700 rounded-lg text-center text-ink-500">
                [Placeholder for "Corrected As-Is Architecture" Diagram]
              </div>

              <p>While functional, I immediately questioned the validity of this approach. My architectural intuition suggested that for the scale and scope of this project, the added complexity of a microservice architecture was not providing value. It introduced network latency, operational overhead, and a deployment dependency between two services that were, in reality, tightly coupled. I concluded that the architecture was unnecessarily complicated and that a simpler, more direct approach would yield a better result.</p>

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">The Strategic Pivot: A Case for a Well-Structured Monolith</h2>
              <p>Based on this analysis, I proposed a significant architectural pivot: we would refactor the application into a single monolithic service. This decision was driven by first-principles of software design: reducing complexity, improving performance, and lowering costs. The goal was to create a "to-be" architecture that was lean, efficient, and easier to reason about.</p>

              <div className="p-4 my-6 border border-dashed border-ink-700 rounded-lg text-center text-ink-500">
                [Placeholder for "Proposed Monolith Architecture" Diagram]
              </div>

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">The Execution: A Disciplined, Multi-Stage Refactoring</h2>
              <p>With a clear architectural goal, I executed a methodical refactoring process, applying senior engineering best practices at each stage.</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>Service-Oriented Design & The Facade Pattern:</strong> I untangled the business logic from the web server by designing and implementing a dedicated service layer (`LocationService`, `WeatherService`, `GeminiService`), encapsulating all external API interactions.</li>
                <li><strong>Dependency Injection for Testability:</strong> Crucially, the new services were designed to be testable. Instead of creating their own dependencies, dependencies like the HTTP client were injected into their constructors, unlocking our ability to perform comprehensive unit testing.</li>
                <li><strong>Test-Driven Cleanup & Verification:</strong> I developed a full suite of unit tests using Jest and axios-mock-adapter. This testing process acted as a quality gate, revealing dead code, unused dependencies, and subtle bugs.</li>
                <li><strong>Process Automation & Cleanup:</strong> The final touch was to professionalize the deployment process. I analyzed the existing manual PowerShell scripts and the `cloudbuild.yaml` file, identified the automated Cloud Build pipeline as the superior solution, and decisively removed the now-obsolete manual scripts, ensuring a clean path to production.</li>
              </ol>

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">The Final Software Architecture</h2>
              <p>The result of this process is a codebase with a clear, logical, and maintainable internal structure. It is a monolith, but it is not a "big ball of mud." It is a well-structured system with clear boundaries and responsibilities.</p>

              <div className="p-4 my-6 border border-dashed border-ink-700 rounded-lg text-center text-ink-500">
                [Placeholder for "Final Software Architecture" Diagram]
              </div>

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">Architectural Limitations and Future Work</h2>
              <p>A key principle of senior-level architecture is understanding the trade-offs and limitations of any design. The following points represent the next logical iteration to make it a truly production-grade system.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>The Scalability Trap of In-Memory Caching:</strong> In a serverless environment, each container instance would have its own isolated cache. The solution is to implement a Strategy Pattern for caching, allowing a switch to a distributed cache like Redis in production.</li>
                <li><strong>Brittleness to External Service Failure:</strong> The system lacks explicit handling for downstream service failures. The solution is to implement the Circuit Breaker Pattern to detect when a dependency is failing and "trip the breaker" to fail fast and protect the application.</li>
                <li><strong>Undefined Production Secret Management:</strong> Production secrets should not be managed manually. The solution is to use a service like Google Secret Manager to securely inject secrets at deployment time, making the process automated and secure.</li>
              </ul>

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">Conclusion: More Than Code, A Mindset</h2>
              <p>The final artifact is not just a working application; it is a clean, well-documented, fully-tested codebase with a professional, automated deployment pipeline—and a clear, forward-looking roadmap for future enhancement. The final cloud architecture we deployed is as follows:</p>

              <div className="p-4 my-6 border border-dashed border-ink-700 rounded-lg text-center text-ink-500">
                [Placeholder for "Final Cloud Architecture" Diagram]
              </div>

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