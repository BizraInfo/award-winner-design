# Changelog

All notable changes to BIZRA Node0 Genesis will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive performance testing suite with k6
- OpenAPI 3.1 documentation
- Kubernetes deployment manifests with Kustomize
- Prometheus alerting rules (40+ alerts)
- Grafana dashboards with auto-provisioning
- Pre-commit hooks for code quality
- Conventional commit enforcement

### Changed
- Upgraded to PostgreSQL 16
- Enhanced Docker multi-stage builds for smaller images
- Improved error handling in LLM backends

### Fixed
- Memory leak in Redis connection pool
- Race condition in concurrent query handling

### Security
- Added Trivy vulnerability scanning
- Implemented secret scanning in CI
- Added SECURITY.md policy

---

## [1.0.0] - 2024-01-15

### Added

#### Core Platform
- **Rust Backend** with Axum framework
  - High-performance async API server
  - WebSocket support for streaming LLM responses
  - Rate limiting and request validation
  - Structured logging with tracing

- **Dual LLM Backend Architecture**
  - Ollama integration (port 11434)
  - LM Studio integration (port 1234)
  - Automatic failover between backends
  - Streaming response support

- **Multi-Database Architecture**
  - PostgreSQL 16 for relational data
  - Redis 7 for caching and sessions
  - Neo4j 5.15 for knowledge graph
  - Qdrant for vector embeddings

#### Frontend
- **Next.js 14 Dashboard**
  - React 18 with Server Components
  - Tailwind CSS styling
  - Radix UI components
  - Real-time WebSocket updates

#### DevOps & Infrastructure
- **Docker Compose** development environment
- **GitHub Actions** CI/CD pipeline
- **Kubernetes** production manifests
- **Prometheus & Grafana** monitoring

#### Testing
- Jest unit tests for frontend
- Playwright E2E tests
- Rust integration tests
- k6 performance tests

### Security
- JWT-based authentication
- RBAC authorization
- API key management
- Audit logging

---

## [0.9.0] - 2024-01-01

### Added
- Initial project structure
- Basic API endpoints
- PostgreSQL integration
- Docker development setup

### Changed
- Migrated from Express to Axum

### Deprecated
- Node.js backend (replaced with Rust)

---

## Version History

| Version | Date | Status |
|---------|------|--------|
| 1.0.0 | 2024-01-15 | Current |
| 0.9.0 | 2024-01-01 | Deprecated |

---

## Upgrade Guides

### Upgrading to 1.0.0

1. **Database Migration Required**
   ```bash
   cargo sqlx migrate run
   ```

2. **Environment Variables**
   New required variables:
   - `OLLAMA_URL` (default: http://localhost:11434)
   - `LM_STUDIO_URL` (default: http://localhost:1234)

3. **Breaking API Changes**
   - `/api/query` → `/api/v1/query`
   - Response format now includes `usage` object

---

## Legend

- 🚀 **Added** - New features
- 🔄 **Changed** - Changes in existing functionality
- ⚠️ **Deprecated** - Features that will be removed
- 🗑️ **Removed** - Removed features
- 🐛 **Fixed** - Bug fixes
- 🔒 **Security** - Security improvements

[Unreleased]: https://github.com/bizra-io/bizra-node0-genesis/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/bizra-io/bizra-node0-genesis/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/bizra-io/bizra-node0-genesis/releases/tag/v0.9.0
