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