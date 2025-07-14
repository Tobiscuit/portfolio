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