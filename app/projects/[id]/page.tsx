
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
                <Link href="https://weatherwise-ai-356687723492.us-central1.run.app/" target="_blank" rel="noopener noreferrer">
                  <Image
                    src={project.image}
                    alt={`Screenshot of ${project.title}`}
                    width={1920}
                    height={1080}
                    className="w-full h-full object-cover"
                  />
                </Link>
              ) : (
                <div className="w-full h-full" style={{
                  backgroundImage: `radial-gradient(#415A77 1px, transparent 1px)`,
                  backgroundSize: `16px 16px`,
                }}></div>
              )}
            </div>

            <div className="lg:hidden mb-8">
              <h4 className="font-bold text-parchment-200 mb-2">Technologies Used</h4>
              <div className="flex flex-wrap gap-2">
                {project.tech.map(tech => (
                  <span key={tech} className="bg-ink-700 text-parchment-200 text-sm font-medium px-2.5 py-1 rounded">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="prose prose-lg prose-invert text-parchment-300 max-w-none space-y-6 prose-p:leading-relaxed">
              <h2 className="font-serif text-3xl text-parchment-100 mb-4">The Initial Spark: Questioning the "As-Is" Architecture</h2>
              <p>My involvement began with a simple request: to understand the application's architecture. The initial diagrams revealed a system composed of two distinct microservices: a main application backend and a separate Gemini service for generating AI summaries.</p>
              
              <Image src="/images/projects/weatherwise/arch_diagram_1.drawio.png" alt="Initial As-Is Architecture Diagram" width={1200} height={800} className="w-full h-auto rounded-lg my-6" />

              <p>While functional, I immediately questioned the validity of this approach. My architectural intuition suggested that for the scale and scope of this project, the added complexity of a microservice architecture was not providing value. It introduced network latency, operational overhead, and a deployment dependency between two services that were, in reality, tightly coupled. I concluded that the architecture was unnecessarily complicated and that a simpler, more direct approach would yield a better result.</p>

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">The Strategic Pivot: A Case for a Well-Structured Monolith</h2>
              <p>Based on this analysis, I charted a new course: a significant architectural pivot to refactor the application into a single monolithic service. This decision was driven by first-principles of software design: reducing complexity, improving performance, and lowering costs. The goal was to create a "to-be" architecture that was lean, efficient, and easier to reason about.</p>

              <Image src="/images/projects/weatherwise/arch_diagram_2.drawio.png" alt="Proposed Monolith Architecture Diagram" width={1200} height={800} className="w-full h-auto rounded-lg my-6" />

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">The Execution: A Disciplined, Multi-Stage Refactoring</h2>
              <p>With a clear architectural goal, I executed a methodical refactoring process, applying senior engineering best practices at each stage.</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>Service-Oriented Design & The Facade Pattern:</strong> I untangled the business logic from the web server by designing and implementing a dedicated service layer, encapsulating all external API interactions (<code>LocationService</code>, <code>WeatherService</code>, <code>GeminiService</code>). These services act as <strong>Facades</strong>, providing a simple, clean interface to the application while hiding the complex machinery of authentication, network requests, and error handling.</li>
                <li><strong>Dependency Injection for Testability:</strong> Crucially, the new services were designed to be testable. Instead of creating their own dependencies, dependencies like the HTTP client were injected into their constructors. This decoupling was the key that unlocked the ability to perform comprehensive unit testing.</li>
                <li><strong>Test-Driven Cleanup & Verification:</strong> With a testable architecture in place, I developed a full suite of unit tests using <strong>Jest</strong> and <code>axios-mock-adapter</code>. This wasn't just about validation; the testing process itself acted as a quality gate, revealing dead code, unused dependencies, and subtle bugs in the implementation. This iterative cycle of testing and fixing was instrumental in achieving a clean, reliable codebase.</li>
                <li><strong>Process Automation & Cleanup:</strong> The final touch was to professionalize the deployment process. I analyzed the existing manual PowerShell scripts and the <code>cloudbuild.yaml</code> file. I identified the automated Cloud Build pipeline as the superior, repeatable solution. I updated the Cloud Build configuration to match the new monolithic architecture, and decisively removed the now-obsolete manual scripts, ensuring a clean and unambiguous path to production.</li>
              </ol>

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">The Final Software Architecture</h2>
              <p>The result of this process is a codebase with a clear, logical, and maintainable internal structure. It is a monolith, but it is not a "big ball of mud." It is a well-structured system with clear boundaries and responsibilities.</p>
              
              <Image src="/images/projects/weatherwise/arch_diagram_3.drawio.png" alt="Final Software Architecture Diagram" width={1200} height={800} className="w-full h-auto rounded-lg my-6" />

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">Conclusion: More Than Code, A Mindset</h2>
              <p>This project is a showcase of an engineering mindset that values clarity, simplicity, and robustness over unnecessary complexity. It demonstrates the ability to critically analyze an existing architecture, propose a bold but reasoned alternative, and execute that vision through disciplined, test-driven development and the application of established design patterns.</p>

              <h2 className="font-serif text-3xl text-parchment-100 mt-12 mb-4">Architectural Limitations and Future Work</h2>
              <p>A key principle of senior-level architecture is understanding the trade-offs and limitations of any design. While this application is now robust, tested, and maintainable, it is optimized for clarity and cost-effectiveness as a portfolio piece, not for high-traffic production loads. The following points represent the next logical iteration to make it a truly production-grade system.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>The Scalability Trap of In-Memory Caching:</strong> In a serverless environment like Google Cloud Run, which scales by creating multiple, independent container instances, each instance would have its own isolated cache. This leads to inconsistent performance and low cache-hit ratios under load.<br/><strong>The Solution:</strong> Implement the <strong>Strategy Pattern</strong> for caching. I would define a <code>CacheStrategy</code> interface and create two implementations: an <code>InMemoryCacheStrategy</code> for local development, and a <code>RedisCacheStrategy</code> for production. The production strategy would connect to a managed, distributed cache like <strong>Google Cloud Memorystore for Redis</strong>, ensuring all container instances share a single, consistent cache.</li>
                <li><strong>Brittleness to External Service Failure:</strong> The current service layer is optimistic and does not explicitly handle scenarios where a downstream dependency (like the Geocoding or Weather API) becomes slow or unresponsive. This can lead to blocked request threads and cascading failures.<br/><strong>The Solution:</strong> Implement the <strong>Circuit Breaker Pattern</strong>. By wrapping external API calls in a circuit breaker (e.g., using a library like <code>opossum</code>), the application could detect when a downstream service is failing. It would "trip the breaker," failing fast on subsequent requests for a period of time, allowing the dependency to recover and protecting my own application from being dragged down.</li>
                <li><strong>Undefined Production Secret Management:</strong> While the app uses <code>.env</code> files for local development, the process for injecting production secrets (like the <code>GEOCODE_API_KEY</code>) is not codified. This relies on manual configuration in the Cloud Console, which is error-prone and not repeatable.<br/><strong>The Solution:</strong> Use <strong>Google Secret Manager</strong>. The API key would be stored securely in Secret Manager. The Cloud Run service's identity would be granted the "Secret Manager Secret Accessor" role, and the <code>cloudbuild.yaml</code> would be updated to securely mount this secret as an environment variable at deployment time. This makes the entire process automated, secure, and defined as code.</li>
              </ul>

              <p>The final artifact is not just a working application; it is a clean, well-documented, fully-tested codebase with a professional, automated deployment pipeline, and a clear, forward-looking roadmap for future enhancement.</p>
              <p>The final cloud architecture I deployed is as follows:</p>

              <Image src="/images/projects/weatherwise/arch_diagram_4.drawio.png" alt="Final Cloud Architecture Diagram" width={1200} height={800} className="w-full h-auto rounded-lg my-6" />

            </div>
          </div>
          
          <aside>
            <div className="sticky top-24 bg-ink-900/50 p-6 rounded-lg">
              <h3 className="font-serif text-2xl text-parchment-100 mb-4">Key Information</h3>
              
              <h4 className="font-bold text-parchment-200 mt-6 mb-2">Key Features</h4>
              <ul className="list-disc list-inside text-parchment-300 space-y-1">
                {project.features.map(feature => <li key={feature}>{feature}</li>)}
              </ul>

              <div className="hidden lg:block">
                <h4 className="font-bold text-parchment-200 mt-6 mb-2">Technologies Used</h4>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map(tech => (
                    <span key={tech} className="bg-ink-700 text-parchment-200 text-sm font-medium px-2.5 py-1 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
} 