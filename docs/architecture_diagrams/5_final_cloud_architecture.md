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