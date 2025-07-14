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