# WeatherWise AI

A smart weather forecasting application providing on-demand reports and witty, AI-generated summaries for any location. This project is built with a modern, monolithic, service-oriented architecture using TypeScript and Node.js, and is designed for automated deployment on Google Cloud Run.

This repository serves as a case study in architectural refactoring, demonstrating a journey from a complex microservice proof-of-concept to a robust, tested, and maintainable production-grade service.

## Core Features

-   **On-Demand Weather:** Get current temperature, conditions, and high/low forecasts for any location.
-   **AI-Powered Summaries:** Receives a unique, witty weather summary generated directly from the Google Gemini API.
-   **Dynamic Weather Icons:** The interface displays custom icons based on the current weather conditions.
-   **Serverless Architecture:** A highly scalable backend built with Fastify, running on Google Cloud Run.
-   **Intelligent Caching:** Implements an in-memory caching layer to provide near-instant results for recent searches.

## Architecture

This project is a **service-oriented monolith**. The codebase is organized into a clean, testable service layer that handles all external API interactions. This design was a deliberate architectural decision to improve performance, reduce complexity, and simplify deployments compared to its original microservice design.

For a deep dive into the architectural decisions, refactoring process, and design patterns used, please see the **[Architectural Refactoring Case Study](./docs/refactoring_summary.md)**.

## Technologies Used

-   **Backend:** Node.js, Fastify, TypeScript
-   **Frontend:** Nunjucks Templating, TailwindCSS
-   **AI:** Google Gemini
-   **External Services:** Open-Meteo (Weather), Geocode.maps.co (Geocoding)
-   **Testing:** Jest, Axios Mock Adapter
-   **Deployment:** Docker, Google Cloud Run, Google Cloud Build

## Local Development

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YourUsername/weatherwise-ai.git
    cd weatherwise-ai
    ```

2.  **Install dependencies:**
    This project uses `pnpm` for package management.
    ```bash
    pnpm install
    ```

3.  **Authenticate with Google Cloud:**
    The application uses Application Default Credentials (ADC) to call the Gemini API locally. Make sure you have the `gcloud` CLI installed and authenticated.
    ```bash
    gcloud auth application-default login
    ```

4.  **Create an environment file:**
    Create a `.env` file in the root of the project. The only required variable is an API key for the geocoding service.
    ```
    # Get a free key from https://geocode.maps.co/
    GEOCODE_API_KEY=your_geocode_maps_co_api_key_here
    ```

5.  **Run the development server:**
    This command starts the backend server and the TailwindCSS watcher in parallel.
    ```bash
    pnpm dev:all
    ```
    The application will be available at `http://127.0.0.1:8089`.

## Testing

A comprehensive unit test suite has been developed for the service layer. To run the tests:
```bash
pnpm test
```
This command will execute all `*.test.ts` files.

## Deployment

This project is configured for continuous deployment to Google Cloud Run via Google Cloud Build. The entire process is defined in the `cloudbuild.yaml` file.

**Deployment Trigger:** A push to the `main` branch will automatically trigger the Cloud Build pipeline, which will:
1.  Build the application's Docker container.
2.  Push the container to Google Artifact Registry.
3.  Deploy the new container version to the Cloud Run service.

All secrets and API keys for the production environment should be managed securely using Google Secret Manager. 