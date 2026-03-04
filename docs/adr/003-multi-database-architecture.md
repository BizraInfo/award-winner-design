# ADR 003: Multi-Database Architecture

## Status

Accepted

## Date

2024-01-15

## Context

BIZRA Node0 Genesis requires diverse data storage capabilities:
- **Relational Data**: User accounts, sessions, audit logs
- **Caching**: Session tokens, API responses, rate limiting
- **Knowledge Graph**: Entity relationships, semantic links
- **Vector Search**: Embedding storage, similarity search

### Requirements

1. ACID transactions for critical data
2. Sub-millisecond cache lookups
3. Graph traversal for knowledge queries
4. Semantic similarity search for RAG

## Decision

Adopt a polyglot persistence architecture with:

| Database | Purpose | Port |
|----------|---------|------|
| PostgreSQL 16 | Primary relational store | 5432 |
| Redis 7 | Caching and sessions | 6379 |
| Neo4j 5.15 | Knowledge graph | 7474/7687 |
| Qdrant | Vector embeddings | 6333/6334 |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│          │          │          │          │                 │
│  SQLx    │  Redis   │  Neo4j   │  Qdrant  │   Unified       │
│  Client  │  Client  │  Driver  │  Client  │   Repository    │
│          │          │          │          │   Pattern       │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                     Connection Pool Layer                    │
├──────────┬──────────┬──────────┬──────────────────────────────┤
│          │          │          │                             │
│ Postgres │  Redis   │  Neo4j   │         Qdrant             │
│ :5432    │  :6379   │  :7687   │         :6333              │
└──────────┴──────────┴──────────┴─────────────────────────────┘
```

### Data Distribution

```yaml
postgresql:
  schemas:
    - public: Core application data
    - audit: Audit logs and compliance
    - analytics: Usage metrics
  tables:
    - users
    - sessions
    - api_keys
    - query_logs
    - settings

redis:
  prefixes:
    session: User sessions (TTL: 24h)
    cache: API response cache (TTL: 5m)
    rate: Rate limiting counters (TTL: 1m)
    lock: Distributed locks (TTL: 30s)

neo4j:
  labels:
    - Entity
    - Concept
    - Document
    - User
  relationships:
    - RELATES_TO
    - MENTIONS
    - AUTHORED_BY
    - BELONGS_TO

qdrant:
  collections:
    - documents: Document embeddings (dim: 384)
    - queries: Query embeddings for caching
    - entities: Entity embeddings for linking
```

## Consequences

### Positive

- **Right Tool for the Job**: Each database optimized for its use case
- **Scalability**: Independent scaling of each component
- **Performance**: Specialized indexing and query optimization
- **Flexibility**: Easy to add new storage backends

### Negative

- **Complexity**: Multiple systems to operate and maintain
- **Consistency**: Eventual consistency between stores
- **Learning Curve**: Team needs expertise in multiple databases
- **Operations**: More infrastructure to monitor

### Mitigations

1. **Unified Repository Pattern**: Abstract database access
2. **Saga Pattern**: Manage cross-database transactions
3. **Health Monitoring**: Comprehensive observability
4. **Docker Compose**: Simplified local development

### Connection Pool Configuration

```rust
// PostgreSQL
let pg_pool = PgPoolOptions::new()
    .max_connections(32)
    .min_connections(5)
    .acquire_timeout(Duration::from_secs(3))
    .idle_timeout(Duration::from_secs(600))
    .connect(&database_url).await?;

// Redis
let redis_client = redis::Client::open(&redis_url)?;
let redis_pool = redis_client.get_multiplexed_async_connection().await?;

// Neo4j
let neo4j = Graph::new(&neo4j_url, user, password).await?;

// Qdrant
let qdrant = QdrantClient::from_url(&qdrant_url).build()?;
```

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Neo4j Documentation](https://neo4j.com/docs/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Polyglot Persistence Pattern](https://martinfowler.com/bliki/PolyglotPersistence.html)
