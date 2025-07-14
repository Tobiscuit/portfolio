graph TD
    subgraph "Abstraction"
        A["WeatherService"]
        A -- "has a" --> I{WeatherProvider Interface}
    end

    subgraph "Implementations"
        C1["OpenMeteoProvider<br>(implements WeatherProvider)"]
        C2["AccuWeatherProvider<br>(implements WeatherProvider)"]
    end

    I -- "implemented by" --> C1
    I -- "implemented by" --> C2
    
    Client["Application<br>(server.ts)"] --> A
    
    style C1 fill:#f9f,stroke:#333,stroke-width:2px
    style C2 fill:#f9f,stroke:#333,stroke-width:2px
``` 