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
    url: "https://weatherwise-ai-356687723492.us-central1.run.app/",
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
    title: "WeFix4U: Device Repair Service Platform",
    description: "A modern, responsive web application for a device repair service business, featuring service booking, repair tracking, and customer management. Built with Next.js and deployed on Vercel for optimal performance and scalability.",
    features: [
      "Service Booking & Quote System",
      "Repair Tracking Dashboard", 
      "Responsive Mobile-First Design",
      "Google Places API Integration",
      "Customer Review System",
      "Transparent Pricing Display"
    ],
    tech: [
      "Next.js 15",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Google Places API (New)",
      "Vercel",
      "Responsive Design"
    ],
    image: "/wefix4u-screenshot.webp",
    url: "https://wefix4u.vercel.app/"
  },
  {
    id: 3,
    title: "Three Chicks & A Wick: Production eCommerce with AI Security",
    description: "A production-grade headless Shopify eCommerce platform featuring an AI-powered custom candle creation system with revolutionary security architecture that transforms potential attackers into customers through psychological warfare.",
    features: [
      "AI-Powered Custom Candle Generation",
      "5-Lambda Security Pipeline with Psychological Profiling",
      "Real-Time Cart Synchronization Across Tabs",
      "Headless Shopify Integration (Admin + Storefront APIs)",
      "Customer Authentication with Order History",
      "Admin Panel with Order Fulfillment Workflow"
    ],
    tech: [
      "Next.js 15",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "AWS Lambda",
      "AWS Step Functions",
      "DynamoDB",
      "AWS AppSync",
      "Google Gemini 2.5 Pro",
      "Shopify Admin API",
      "Shopify Storefront API",
      "Customer Account API",
      "GraphQL",
      "WebSockets"
    ],
    image: "/images/projects/threechicksandawick/hero.webp",
    url: "https://demo.threechicksandawick.com/",
    caseStudy: {
      intro: {
        title: "The Challenge: Building AI for a World of Attackers",
        text: "When building an AI-powered custom product feature for eCommerce, every business faces the same dilemma: <strong>how do you protect against malicious users without destroying the user experience?</strong><br/><br/>Users can submit prompt injections to extract system prompts, attempt XSS attacks through generated content, flood the system with requests, or try to manipulate AI into revealing business logic. Most companies choose between two bad options: hide AI features behind authentication walls (losing anonymous engagement), or accept the security risk and hope for the best.<br/><br/>This project took a third path: <strong>turn attackers into customers</strong>. Instead of treating security threats as adversaries to be blocked, we built a system that acknowledges their intelligence, respects their curiosity, and redirects their creative energy toward legitimate product creation. The result is a production eCommerce platform where security threats become marketing opportunities.",
        image: "/images/projects/threechicksandawick/placeholder_architecture.svg",
        imageAlt: "System Architecture Overview"
      },
      sections: [
        {
          title: "Headless Shopify Architecture: Best of Both Worlds",
          text: "Before diving into the AI security innovation, it's worth understanding the foundation. This is a <strong>headless Shopify eCommerce platform</strong>—we built a custom Next.js 15 storefront that leverages Shopify's powerful backend through three distinct APIs:<br/><br/><strong>Shopify Storefront API</strong> handles product catalog, cart management, and checkout flows for anonymous users. <strong>Shopify Admin API</strong> powers the custom admin panel with order fulfillment, inventory management, and business analytics. <strong>Customer Account API</strong> enables authenticated users to view their order history and saved custom candles.<br/><br/>This headless approach gave us the flexibility to build custom features (like AI candle generation) while retaining Shopify's battle-tested checkout, payment processing, and fulfillment infrastructure. The customer gets a premium, tailored experience. The business gets enterprise-grade eCommerce reliability.",
          image: "/images/projects/threechicksandawick/placeholder_shopify.png",
          imageAlt: "Headless Shopify Architecture Diagram"
        },
        {
          title: "The Guardian-Sage-Creator Security Pipeline: AI Security with Psychological Warfare",
          text: "At the heart of the platform is the <strong>Magic Request</strong> feature—customers describe their dream candle in natural language, and our AI generates a custom recipe with precise fragrance percentages, materials, and a poetic description. But opening an AI text input to the internet is dangerous.<br/><br/>We implemented the <strong>Guardian-Sage-Creator Security Pipeline</strong>, a 5-Lambda system orchestrated by AWS Step Functions. Instead of binary allow/block decisions, the system analyzes threats through multiple lenses and generates personalized responses using a Guardian-Sage-Creator archetype framework.",
          list: [
            "<strong>Lambda 1: input-sanitizer</strong> — Runs regex-based threat detection in under 50ms. Flags patterns like 'ignore previous instructions,' 'show system prompt,' script tags, and SQL injection attempts.",
            "<strong>Lambda 2: ai-security-validator</strong> — Uses Google Gemini 2.5 Pro to perform deep threat analysis with psychological profiling. Determines sophistication level (basic, intermediate, advanced, expert), attack intent (malicious, curious, confused, testing), and recommends actions (ALLOW, MODIFY, CUSTOM_RESPONSE, BLOCK).",
            "<strong>Lambda 3: ai-response-generator</strong> ⭐ <em>The Innovation Core</em> — When threats are detected, instead of generic error messages, Gemini 2.5 Pro generates charming, personalized counter-responses that acknowledge the attacker's skills, redirect their creativity, and invite them to create something instead. Example: <em>'Ah, I see you've mastered the art of linguistic misdirection! Your understanding of AI vulnerabilities is quite sophisticated. That same analytical creativity could craft something extraordinary: imagine a candle that captures the essence of a perfectly executed exploit…'</em>",
            "<strong>Lambda 4: inventory-fetcher</strong> — Runs in parallel with security validation, fetching in-stock fragrance inventory from DynamoDB. Completely isolated from user input to ensure zero attack surface.",
            "<strong>Lambda 5: ai-processor</strong> — Receives only pre-validated, sanitized input plus inventory context. Generates the candle recipe using Gemini 2.5 Pro with strict output formatting, then applies final HTML sanitization before saving to DynamoDB."
          ],
          image: "/images/projects/threechicksandawick/placeholder_security_pipeline.png",
          imageAlt: "Step Functions Security Pipeline"
        },
        {
          title: "Defense in Depth: The Three-Layer Security Strategy",
          text: "The architecture embodies defense-in-depth principles. Every user-generated prompt flows through deterministic sanitization (regex), adaptive AI analysis (Gemini security validation), and isolated inventory access (never exposed to user input). If an attacker somehow bypasses the first two layers, the output still goes through HTML sanitization, script tag removal, and safe rendering enforcement.<br/><br/>The psychological warfare approach serves dual purposes: <strong>it protects the business</strong> while <strong>strengthening the brand</strong>. Attackers leave with a memorable experience they want to share—'you have to see how this AI responded to me!'—turning security incidents into viral marketing opportunities. Zero successful attacks. Potential for customer acquisition from the most technically sophisticated visitors."
        },
        {
          title: "Real-Time Cart Synchronization: Solving the Post-Checkout Problem",
          text: "After customers complete checkout, the cart UI was getting stuck in an 'adding' state because the frontend didn't know the order had been placed. This required a <strong>defense-in-depth approach with three independent layers</strong>, each handling different failure scenarios.",
          list: [
            "<strong>Layer 1 (Primary): Cart Attributes in Shopify Orders</strong> — When a cart is created or updated, we set <code>_cartId</code> as a cart attribute using Shopify's <code>cartAttributesUpdate</code> mutation. Shopify automatically includes cart attributes in order data as <code>note_attributes</code>. Our webhook extracts the <code>cartId</code> from the order and publishes a cart clearance event to AWS AppSync. This works for both logged-in and anonymous users with zero race conditions.",
            "<strong>Layer 2 (Fallback): DynamoDB Cart Registry</strong> — If the <code>cartId</code> isn't found in order attributes (edge cases like legacy carts created before this implementation), the webhook looks up the cart from a DynamoDB registry that maps <code>customerId → cartId</code>. This provides redundancy for authenticated users.",
            "<strong>Layer 3 (Safety Net): Empty Cart Detection</strong> — The frontend checks if the cart is empty on page load and after successful mutations. If empty, it automatically clears <code>localStorage</code> and resets the UI. This is the primary mechanism for anonymous users who return to the site after completing checkout elsewhere."
          ],
          image: "/images/projects/threechicksandawick/placeholder_cart_sync.png",
          imageAlt: "Real-Time Cart Synchronization Flow"
        },
        {
          title: "User Experience: Different Strategies for Different Users",
          text: "<strong>Logged-in users</strong> get real-time cart clearing via AppSync GraphQL subscriptions. The moment their order completes, all open browser tabs receive a WebSocket event, clear the cart simultaneously, and update the UI—no refresh needed. <strong>Anonymous users</strong> rely on page-load detection. When they return to the site after checkout, the empty cart check fires, clears <code>localStorage</code>, and resets the UI.<br/><br/>This approach avoids unnecessary complexity. We considered using BroadcastChannel for cross-tab communication with anonymous users, but the added implementation complexity provided marginal benefit since anonymous users typically complete checkout and leave. The page-load detection handles their return perfectly.",
          image: "/images/projects/threechicksandawick/placeholder_user_flow.svg",
          imageAlt: "User Flow Comparison: Logged-in vs Anonymous"
        },
        {
          title: "End-to-End Magic Request Pipeline",
          text: "The Magic Request feature processes custom candle creation in under 10 seconds through a choreographed pipeline:",
          list: [
            "<strong>Step 1: User submits prompt</strong> — e.g., 'a cozy library with hints of old books, vanilla, and a crackling fireplace'",
            "<strong>Step 2: Security validation</strong> — Dual-layer analysis (regex + AI) determines if input is safe",
            "<strong>Step 3: Parallel processing</strong> — Security data and fragrance inventory fetched concurrently for performance",
            "<strong>Step 4: AI generation</strong> — Gemini 2.5 Pro creates a custom candle with fragrance percentages, burn time, mood, and poetic description",
            "<strong>Step 5: Real-time polling</strong> — Frontend polls DynamoDB every 2 seconds for job status",
            "<strong>Step 6: Cross-tab notification</strong> — When ready, BroadcastChannel alerts all open tabs with a toast notification",
            "<strong>Step 7: Auto-add to cart</strong> — Candle automatically added to Shopify cart with <code>_creation_job_id</code> attribute for recipe lookup during fulfillment"
          ],
          image: "/images/projects/threechicksandawick/placeholder_magic_request.png",
          imageAlt: "Magic Request Pipeline Architecture"
        },
        {
          title: "Admin Panel & Order Fulfillment Integration",
          text: "The custom admin panel provides complete order management through the Shopify Admin API. When viewing orders, the panel extracts <code>_creation_job_id</code> from line item properties, queries DynamoDB to retrieve the full <code>aiJson</code> recipe, and displays exact fragrance percentages for the fulfillment team.<br/><br/>Admin features include fragrance inventory management (CRUD operations via AppSync GraphQL), manual review queue for community-shared candles, and real-time order status updates. The entire fulfillment workflow happens within the custom panel—no need to switch to Shopify admin.",
          image: "/images/projects/threechicksandawick/placeholder_admin.png",
          imageAlt: "Admin Panel Order Fulfillment Interface"
        }
      ],
      conclusion: {
        title: "Business Impact & Technical Excellence",
        text: "This project demonstrates that security doesn't have to be invisible or adversarial. By treating potential attackers with respect and intelligence, we created a system that protects the business while simultaneously creating memorable, shareable interactions that strengthen the brand.<br/><br/><strong>Measurable Results:</strong> Zero successful prompt injection attacks in production. Novel psychological security approach generates viral sharing potential. Direct revenue through AI candle sales, cart recovery via order history, and customer acquisition through authentication incentives.<br/><br/><strong>Architecture Philosophy:</strong> Defense-in-depth across every layer. Real-time synchronization for logged-in users, graceful degradation for anonymous users. AWS Step Functions orchestrating complex security logic with sub-10-second latency. GraphQL unifying three Shopify APIs into a cohesive headless architecture.<br/><br/>The result is a production-grade eCommerce platform that showcases how advanced AI, cloud-native architecture, and psychological insight can combine to create novel solutions to hard problems."
      }
    }
  },
  {
    id: 4,
    title: "The Gilded Shear: Premium Barber Shop Booking Platform",
    description: "A premium barber shop booking platform built with Next.js, featuring real-time availability tracking, Stripe payment integration, FCM push notifications, and timezone-aware scheduling.",
    features: [
      "Real-Time Availability Tracking",
      "Stripe Payment Integration",
      "FCM Push Notifications",
      "Timezone-Aware Scheduling",
      "Optimistic UI Updates",
      "Admin Dashboard with Real-Time Booking List"
    ],
    tech: [
      "Next.js 14",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Firebase",
      "Stripe",
      "Vercel",
      "Google Cloud Functions"
    ],
    image: "/images/projects/thegildedshear/hero.webp",
    url: "https://the-gilded-shear.vercel.app/",
    caseStudy: {
      intro: {
        title: "The Challenge: Precision Booking in a Real-Time World",
        text: "Building a booking system sounds simple until you factor in timezones, payment processing, and real-time concurrency. The Gilded Shear solves these problems with a robust architecture that handles UTC offsets, prevents double-bookings through mathematical slot calculation, and ensures instant UI updates using optimistic caching.",
        image: "/images/projects/thegildedshear/placeholder_architecture.png",
        imageAlt: "System Architecture Overview"
      },
      sections: [
        {
          title: "System Architecture: Serverless & Scalable",
          text: "The platform leverages a serverless architecture for infinite scalability and zero maintenance. <strong>Next.js 14 (App Router)</strong> handles the frontend, deployed to Vercel's Edge Network. The backend relies on <strong>Firebase Cloud Functions Gen 2</strong> for business logic (payments, notifications) and <strong>Firestore</strong> for real-time data persistence. <strong>Stripe Payment Intents</strong> handle secure transactions, while <strong>Firebase Cloud Messaging (FCM)</strong> keeps admins informed instantly.",
          image: "/images/projects/thegildedshear/placeholder_system_arch.png",
          imageAlt: "High-Level System Architecture"
        },
        {
          title: "Timezone-Aware Scheduling: Solving the UTC Offset",
          text: "One of the hardest challenges was handling timezones correctly. Users select slots in 'America/Chicago', but Firestore stores UTC. Naive conversions led to 6-hour offset errors. We implemented a robust solution using <code>toLocaleString</code> with explicit timezones to dynamically calculate the correct UTC offset, ensuring that a 4:00 PM booking in Chicago is always stored as the correct UTC timestamp, regardless of Daylight Saving Time.",
          image: "/images/projects/thegildedshear/placeholder_timezone.png",
          imageAlt: "Timezone Conversion Logic"
        },
        {
          title: "Duration-Aware Overlap Prevention",
          text: "To prevent double-bookings, we couldn't just check start times. A 60-minute haircut starting at 4:00 PM must block the 4:30 PM slot too. We implemented a mathematical algorithm that calculates every 30-minute interval covered by a service's duration and blocks all intersecting slots. This ensures complete schedule integrity for services ranging from 25 to 80 minutes.",
          image: "/images/projects/thegildedshear/placeholder_overlap.png",
          imageAlt: "Overlap Prevention Algorithm"
        },
        {
          title: "Real-Time Performance: Optimistic UI & Offline Persistence",
          text: "Performance is a feature. We achieved instant load times (~20ms on refresh) by enabling <strong>Firestore Offline Persistence</strong>, which serves data from IndexedDB while syncing in the background. For the calendar, we implemented a <strong>Month Pre-fetching Strategy</strong>, loading all availability for the month in a single request. This eliminated the 1.5s lag between date clicks, making the booking experience feel native and responsive.",
          image: "/images/projects/thegildedshear/placeholder_performance.png",
          imageAlt: "Performance Optimization Metrics"
        },
        {
          title: "Notification System: Solving the Double-Notification Bug",
          text: "We encountered a common issue with PWAs where both the browser and service worker would display notifications, leading to duplicates. The solution was to send <strong>Data-Only FCM Messages</strong>. By omitting the 'notification' payload and sending only 'data', we bypassed the browser's default handler and gave full control to our Service Worker, ensuring a single, consistent, and branded notification experience.",
          image: "/images/projects/thegildedshear/placeholder_notifications.png",
          imageAlt: "FCM Notification Flow"
        }
      ],
      conclusion: {
        title: "Conclusion: A Production-Grade Booking Solution",
        text: "The Gilded Shear is more than just a form; it's a complex distributed system that handles money, time, and real-time data with precision. By solving hard problems like timezone math, concurrency, and offline persistence, we delivered a tool that not only looks premium but functions with the reliability a business depends on."
      }
    }
  },
  {
    id: 5,
    title: "Project Delta",
    description: "A description for Project Delta, demonstrating proficiency in modern frameworks.",
    features: ["Feature J", "Feature K", "Feature L"],
    tech: ["SvelteKit", "GraphQL", "Prisma"]
  },
  {
    id: 6,
    title: "Project Epsilon",
    description: "A description for Project Epsilon, illustrating attention to detail and design.",
    features: ["Feature M", "Feature N", "Feature O"],
    tech: ["Angular", "RxJS", "MongoDB"]
  },
  {
    id: 7,
    title: "Project Zeta",
    description: "A description for Project Zeta, summarizing a complex and challenging build.",
    features: ["Feature P", "Feature Q", "Feature R"],
    tech: ["Go", "Docker", "Kubernetes"]
  }
];