graph TD
    Client[External Client] -- "1. POST / with weather data, lat, and lon" --> CloudRun["Cloud Run Service (index.js)"];
    
    subgraph "Google Cloud"
        CloudRun -- "2. Authenticates via Service Account<br>and sends prompt to Gemini" --> GeminiAPI["Google Gemini API"];
        GeminiAPI -- "3. Returns witty summary" --> CloudRun;
    end

    CloudRun -- "4. Responds with the witty summary" --> Client;

    GCPOps["Google Cloud Operations<br>(e.g., Monitoring/Scheduler)"] -- "GET /health<br>GET /warmup" --> CloudRun; 