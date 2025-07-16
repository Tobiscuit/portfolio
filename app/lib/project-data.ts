export const projects = [
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
    image: "/weatherwise-screenshot.png",
    caseStudy: {
      intro: {
        title: "The Initial Spark: Questioning the 'As-Is' Architecture",
        text: "My involvement began with a simple request: to understand the application's architecture. The initial diagrams revealed a system composed of two distinct microservices: a main application backend and a separate Gemini service for generating AI summaries.<br/><br/>While functional, I immediately questioned the validity of this approach. My architectural intuition suggested that for the scale and scope of this project, the added complexity of a microservice architecture was not providing value. It introduced network latency, operational overhead, and a deployment dependency between two services that were, in reality, tightly coupled. I concluded that the architecture was unnecessarily complicated and that a simpler, more direct approach would yield a better result.",
        image: "/images/projects/weatherwise/arch_diagram_1.png",
        imageAlt: "Initial As-Is Architecture Diagram"
      },
      sections: [
        {
          title: "The Strategic Pivot: A Case for a Well-Structured Monolith",
          text: "Based on this analysis, I charted a new course: a significant architectural pivot to refactor the application into a single monolithic service. This decision was driven by first-principles of software design: reducing complexity, improving performance, and lowering costs. The goal was to create a 'to-be' architecture that was lean, efficient, and easier to reason about.",
          image: "/images/projects/weatherwise/arch_diagram_2.png",
          imageAlt: "Proposed Monolith Architecture Diagram"
        },
        {
          title: "The Execution: A Disciplined, Multi-Stage Refactoring",
          text: "With a clear architectural goal, I executed a methodical refactoring process, applying senior engineering best practices at each stage.",
          list: [
            "<strong>Service-Oriented Design & The Facade Pattern:</strong> I untangled the business logic from the web server by designing and implementing a dedicated service layer, encapsulating all external API interactions (<code>LocationService</code>, <code>WeatherService</code>, <code>GeminiService</code>). These services act as <strong>Facades</strong>, providing a simple, clean interface to the application while hiding the complex machinery of authentication, network requests, and error handling.",
            "<strong>Dependency Injection for Testability:</strong> Crucially, the new services were designed to be testable. Instead of creating their own dependencies, dependencies like the HTTP client were injected into their constructors. This decoupling was the key that unlocked the ability to perform comprehensive unit testing.",
            "<strong>Test-Driven Cleanup & Verification:</strong> With a testable architecture in place, I developed a full suite of unit tests using <strong>Jest</strong> and <code>axios-mock-adapter</code>. This wasn't just about validation; the testing process itself acted as a quality gate, revealing dead code, unused dependencies, and subtle bugs in the implementation. This iterative cycle of testing and fixing was instrumental in achieving a clean, reliable codebase.",
            "<strong>Process Automation & Cleanup:</strong> The final touch was to professionalize the deployment process. I analyzed the existing manual PowerShell scripts and the <code>cloudbuild.yaml</code> file. I identified the automated Cloud Build pipeline as the superior, repeatable solution. I updated the Cloud Build configuration to match the new monolithic architecture, and decisively removed the now-obsolete manual scripts, ensuring a clean and unambiguous path to production."
          ]
        },
        {
          title: "The Final Software Architecture",
          text: "The result of this process is a codebase with a clear, logical, and maintainable internal structure. It is a monolith, but it is not a 'big ball of mud.' It is a well-structured system with clear boundaries and responsibilities.",
          image: "/images/projects/weatherwise/arch_diagram_3.png",
          imageAlt: "Final Software Architecture Diagram"
        }
      ],
      conclusion: {
        title: "Conclusion: More Than Code, A Mindset",
        text: "This project is a showcase of an engineering mindset that values clarity, simplicity, and robustness over unnecessary complexity. It demonstrates the ability to critically analyze an existing architecture, propose a bold but reasoned alternative, and execute that vision through disciplined, test-driven development and the application of established design patterns."
      },
      futureWork: {
        title: "Architectural Limitations and Future Work",
        intro: "A key principle of senior-level architecture is understanding the trade-offs and limitations of any design. While this application is now robust, tested, and maintainable, it is optimized for clarity and cost-effectiveness as a portfolio piece, not for high-traffic production loads. The following points represent the next logical iteration to make it a truly production-grade system.",
        points: [
          {
            title: "The Scalability Trap of In-Memory Caching",
            text: "In a serverless environment like Google Cloud Run, which scales by creating multiple, independent container instances, each instance would have its own isolated cache. This leads to inconsistent performance and low cache-hit ratios under load.<br/><strong>The Solution:</strong> Implement the <strong>Strategy Pattern</strong> for caching. I would define a <code>CacheStrategy</code> interface and create two implementations: an <code>InMemoryCacheStrategy</code> for local development, and a <code>RedisCacheStrategy</code> for production. The production strategy would connect to a managed, distributed cache like <strong>Google Cloud Memorystore for Redis</strong>, ensuring all container instances share a single, consistent cache."
          },
          {
            title: "Brittleness to External Service Failure",
            text: "The current service layer is optimistic and does not explicitly handle scenarios where a downstream dependency (like the Geocoding or Weather API) becomes slow or unresponsive. This can lead to blocked request threads and cascading failures.<br/><strong>The Solution:</strong> Implement the <strong>Circuit Breaker Pattern</strong>. By wrapping external API calls in a circuit breaker (e.g., using a library like <code>opossum</code>), the application could detect when a downstream service is failing. It would 'trip the breaker,' failing fast on subsequent requests for a period of time, allowing the dependency to recover and protecting my own application from being dragged down."
          },
          {
            title: "Undefined Production Secret Management",
            text: "While the app uses <code>.env</code> files for local development, the process for injecting production secrets (like the <code>GEOCODE_API_KEY</code>) is not codified. This relies on manual configuration in the Cloud Console, which is error-prone and not repeatable.<br/><strong>The Solution:</strong> Use <strong>Google Secret Manager</strong>. The API key would be stored securely in Secret Manager. The Cloud Run service's identity would be granted the 'Secret Manager Secret Accessor' role, and the <code>cloudbuild.yaml</code> would be updated to securely mount this secret as an environment variable at deployment time. This makes the entire process automated, secure, and defined as code."
          }
        ]
      },
      finalArchitecture: {
        title: "The Final Deployed Cloud Architecture",
        text: "The final artifact is not just a working application; it is a clean, well-documented, fully-tested codebase with a professional, automated deployment pipeline, and a clear, forward-looking roadmap for future enhancement.",
        image: "/images/projects/weatherwise/arch_diagram_4.png",
        imageAlt: "Final Cloud Architecture Diagram"
      }
    }
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
]; 