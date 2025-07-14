graph TD
    subgraph "Context"
        A["Application<br>(server.ts)"]
        A -- "uses" --> I{CacheStrategy Interface}
    end

    subgraph "Concrete Strategies"
        C1["InMemoryCacheStrategy<br>(implements CacheStrategy)"]
        C2["RedisCacheStrategy<br>(implements CacheStrategy)"]
    end

    I -- "implemented by" --> C1
    I -- "implemented by" --> C2
    
    style C1 fill:#ccf,stroke:#333,stroke-width:2px
    style C2 fill:#ccf,stroke:#333,stroke-width:2px 