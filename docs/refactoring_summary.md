# Case Study: Architectural Refactoring of a Cloud-Native Web Application

## Executive Summary
This document outlines the strategic refactoring of a cloud-native web application. The project began as a proof-of-concept with a complex microservice architecture. Through a process of critical analysis, applying established software design patterns, and a rigorous testing discipline, I led the transformation of the application into a robust, maintainable, and performant monolithic service, ready for automated, production-grade deployment.

---

### The Initial Spark: Questioning the "As-Is" Architecture

My involvement began with a simple request: to understand the application's architecture. The initial diagrams revealed a system composed of two distinct microservices: a main application backend and a separate Gemini service for generating AI summaries.

```mermaid
graph TD
    subgraph User
        Client[Browser]
    end

    subgraph "Main Application (server.ts)"
        MainApp["Fastify Server"]
    end

    subgraph "External Services"
        GeocodeAPI["Geocode API<br>(geocode.maps.co)"]
        WeatherAPI["Weather API<br>(api.open-meteo.com)"]
        CloudRunService["Gemini Cloud Run Service"]
    end
    
    subgraph "Google Cloud"
        GeminiAPI["Google Gemini API"]
    end

    Client -- "1. GET /?location=city" --> MainApp;
    MainApp -- "2. Geocode location to lat/lon" --> GeocodeAPI;
    GeocodeAPI -- "3. Returns lat/lon" --> MainApp;
    MainApp -- "4. Fetch weather for lat/lon" --> WeatherAPI;
    WeatherAPI -- "5. Returns weather data" --> MainApp;
    MainApp -- "6. POST weather data to Cloud Run" --> CloudRunService;
    CloudRunService -- "7. Generate prompt and call Gemini" --> GeminiAPI;
    GeminiAPI -- "8. Returns witty summary" --> CloudRunService;
    CloudRunService -- "9. Returns witty summary" --> MainApp;
    MainApp -- "10. Renders HTML with all data" --> Client; 
```

While functional, I immediately questioned the validity of this approach. My architectural intuition suggested that for the scale and scope of this project, the added complexity of a microservice architecture was not providing value. It introduced network latency, operational overhead, and a deployment dependency between two services that were, in reality, tightly coupled. I concluded that the architecture was unnecessarily complicated and that a simpler, more direct approach would yield a better result.

### The Strategic Pivot: A Case for a Well-Structured Monolith

Based on this analysis, I proposed a significant architectural pivot: we would refactor the application into a single **monolithic service**. This decision was driven by first-principles of software design:
- **Reduce Complexity:** A single codebase, build process, and deployment target is inherently simpler to manage.
- **Improve Performance:** Eliminating the internal network call between services directly reduces request latency.
- **Lower Costs:** One service is cheaper to run and monitor than two.

The goal was to create a "to-be" architecture that was lean, efficient, and easier to reason about.

```mermaid
graph TD
    subgraph User
        Client[Browser]
    end

    subgraph "Google Cloud"
        MainApp["Main App Service<br>(Cloud Run / server.ts)"]
        GeminiAPI["Google Gemini API"]
    end

    subgraph "External Services"
        GeocodeAPI["Geocode API<br>(geocode.maps.co)"]
        WeatherAPI["Weather API<br>(api.open-meteo.com)"]
    end

    Client -- "1. GET /?location=city" --> MainApp;
    MainApp -- "2. Geocode location" --> GeocodeAPI;
    GeocodeAPI -- "3. Returns lat/lon" --> MainApp;
    MainApp -- "4. Fetch weather" --> WeatherAPI;
    WeatherAPI -- "5. Returns weather data" --> MainApp;
    MainApp -- "6. Authenticate & call Gemini API" --> GeminiAPI;
    GeminiAPI -- "7. Returns witty summary" --> MainApp;
    MainApp -- "8. Renders HTML" --> Client; 
```

### The Execution: A Disciplined, Multi-Stage Refactoring

With a clear architectural goal, I executed a methodical refactoring process, applying senior engineering best practices at each stage.

**1. Service-Oriented Design & The Facade Pattern:**
The first step was to untangle the business logic from the web server. I designed and implemented a dedicated **service layer**, encapsulating all external API interactions (`LocationService`, `WeatherService`, `GeminiService`). These services act as **Facades**, providing a simple, clean interface to the application while hiding the complex machinery of authentication, network requests, and error handling.

**2. Dependency Injection for Testability:**
Crucially, the new services were designed to be testable. Instead of creating their own dependencies, dependencies like the HTTP client were **injected** into their constructors. This decoupling was the key that unlocked our ability to perform comprehensive unit testing.

**3. Test-Driven Cleanup & Verification:**
With a testable architecture in place, I developed a full suite of unit tests using **Jest** and **axios-mock-adapter**. This wasn't just about validation; the testing process itself acted as a quality gate, revealing dead code, unused dependencies, and subtle bugs in the implementation. This iterative cycle of testing and fixing was instrumental in achieving a clean, reliable codebase.

**4. The Final Software Architecture:**
The result of this process is a codebase with a clear, logical, and maintainable internal structure. It is a monolith, but it is not a "big ball of mud." It is a well-structured system with clear boundaries and responsibilities.

```mermaid
graph TD
    subgraph "Application Code (Inside the Container)"
        A["Controller<br>(server.ts)"]
        
        subgraph "Service Layer"
            B["LocationService"]
            C["WeatherService"]
            D["GeminiService"]
        end

        subgraph "Data Models / Utilities"
            E["Weather Models<br>(weatherapi.ts)"]
            F["Location Models<br>(location.ts)"]
            G["Error Classes<br>(errors.ts)"]
            H["Config<br>(config.ts)"]
        end

        A -- "Uses" --> B
        A -- "Uses" --> C
        A -- "Uses" --> D

        C -- "Uses" --> E
        B -- "Uses" --> F
        
        B -- "Throws" --> G
        C -- "Throws" --> G
        D -- "Throws" --> G

        A -- "Uses" --> H
        B -- "Uses" --> H
        C -- "Uses" --> H
    end 
```

**5. Process Automation & Cleanup:**
The final touch was to professionalize the deployment process. I analyzed the existing manual PowerShell scripts and the `cloudbuild.yaml` file. I identified the automated Cloud Build pipeline as the superior, repeatable solution. I updated the Cloud Build configuration to match our new monolithic architecture, and decisively removed the now-obsolete manual scripts, ensuring a clean and unambiguous path to production.

### Conclusion: More Than Code, A Mindset

This project is a showcase of an engineering mindset that values clarity, simplicity, and robustness over unnecessary complexity. It demonstrates the ability to critically analyze an existing architecture, propose a bold but reasoned alternative, and execute that vision through disciplined, test-driven development and the application of established design patterns.

### Architectural Limitations and Future Work

A key principle of senior-level architecture is understanding the trade-offs and limitations of any design. While this application is now robust, tested, and maintainable, it is optimized for clarity and cost-effectiveness as a portfolio piece, not for high-traffic production loads. The following points represent the next logical iteration to make it a truly production-grade system.

**1. The Scalability Trap of In-Memory Caching:**
The most significant limitation is the use of a simple `Map` object for caching. In a serverless environment like Google Cloud Run, which scales by creating multiple, independent container instances, each instance would have its own isolated cache. This leads to inconsistent performance and low cache-hit ratios under load.
- **The Solution:** Implement the **Strategy Pattern** for caching. We would define a `CacheStrategy` interface and create two implementations: an `InMemoryCacheStrategy` for local development, and a `RedisCacheStrategy` for production. The production strategy would connect to a managed, distributed cache like **Google Cloud Memorystore for Redis**, ensuring all container instances share a single, consistent cache.

**2. Brittleness to External Service Failure:**
The current service layer is optimistic and does not explicitly handle scenarios where a downstream dependency (like the Geocoding or Weather API) becomes slow or unresponsive. This can lead to blocked request threads and cascading failures.
- **The Solution:** Implement the **Circuit Breaker Pattern**. By wrapping external API calls in a circuit breaker (e.g., using a library like `opossum`), the application could detect when a downstream service is failing. It would "trip the breaker," failing fast on subsequent requests for a period of time, allowing the dependency to recover and protecting our own application from being dragged down.

**3. Undefined Production Secret Management:**
While we use `.env` files for local development, the process for injecting production secrets (like the `GEOCODE_API_KEY`) is not codified. This relies on manual configuration in the Cloud Console, which is error-prone and not repeatable.
- **The Solution:** Use **Google Secret Manager**. The API key would be stored securely in Secret Manager. The Cloud Run service's identity would be granted the "Secret Manager Secret Accessor" role, and the `cloudbuild.yaml` would be updated to securely mount this secret as an environment variable at deployment time. This makes the entire process automated, secure, and defined as code.

The final artifact is not just a working application; it is a clean, well-documented, fully-tested codebase with a professional, automated deployment pipeline—and a clear, forward-looking roadmap for future enhancement.

The final cloud architecture we deployed is as follows:

```mermaid
graph TD
    subgraph "End User"
        User[Browser]
    end

    subgraph "Google Cloud Platform"
        subgraph "Our Project"
            CloudRun["Monolithic Service<br>(Google Cloud Run)"]
        end
        
        subgraph "Google APIs"
            GeminiAPI["Google Gemini API"]
        end
    end

    subgraph "Third-Party Services"
        GeocodeAPI["Geocode Maps API"]
        WeatherAPI["Open-Meteo API"]
    end

    User -- "HTTPS Request" --> CloudRun
    CloudRun -- "API Call" --> GeocodeAPI
    CloudRun -- "API Call" --> WeatherAPI
    CloudRun -- "API Call via Google Auth" --> GeminiAPI
    
    GeocodeAPI -- "Returns Lat/Lon" --> CloudRun
    WeatherAPI -- "Returns Weather Data" --> CloudRun
    GeminiAPI -- "Returns Witty Summary" --> CloudRun

    CloudRun -- "HTML Response" --> User 
``` 