# Contributing to BIZRA Node0 Genesis

Thank you for your interest in contributing to BIZRA Node0 Genesis! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- **Rust** 1.75+ (for backend development)
- **Node.js** 20+ (for frontend development)
- **Docker** and **Docker Compose** (for local services)
- **Git** 2.40+

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bizra-node0-genesis.git
   cd bizra-node0-genesis
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/bizra-io/bizra-node0-genesis.git
   ```

## Development Setup

### 1. Install Dependencies

```bash
# Backend dependencies
cd backend
cargo build

# Frontend dependencies
cd ../apps/dashboard
pnpm install

# Root monorepo
cd ../..
pnpm install
```

### 2. Set Up Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install
pre-commit install --hook-type commit-msg
```

### 3. Start Local Services

```bash
# Start databases and LLM backends
docker-compose up -d postgres redis neo4j qdrant ollama

# Wait for services
./scripts/wait-for-databases.sh
```

### 4. Run Migrations

```bash
cd backend
cargo sqlx migrate run
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
cargo watch -x run

# Terminal 2: Frontend
cd apps/dashboard
pnpm dev
```

## Making Changes

### Branch Naming

Use the following prefixes:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Build/tooling changes

Examples:
- `feat/add-streaming-support`
- `fix/memory-leak-in-cache`
- `docs/update-api-reference`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(api): add streaming response support for LLM queries

Implement Server-Sent Events for real-time token streaming.
Supports both Ollama and LM Studio backends.

Closes #123
```

```
fix(cache): resolve memory leak in Redis connection pool

The connection pool was not properly releasing connections after timeout.
Added explicit cleanup in the drop handler.
```

## Coding Standards

### Rust (Backend)

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` before committing
- Run `cargo clippy` and fix all warnings
- Document all public APIs with `///` comments

```rust
/// Generates a response from the LLM backend.
///
/// # Arguments
///
/// * `request` - The generation request containing prompt and parameters
///
/// # Returns
///
/// A `Result` containing the generated response or an error
///
/// # Examples
///
/// ```
/// let request = GenerateRequest::new("Hello, world!");
/// let response = backend.generate(request).await?;
/// ```
pub async fn generate(&self, request: GenerateRequest) -> Result<GenerateResponse, Error> {
    // Implementation
}
```

### TypeScript (Frontend)

- Follow [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- Use `pnpm lint` before committing
- Prefer functional components with hooks
- Use TypeScript strict mode

```typescript
interface QueryInputProps {
  /** Callback when query is submitted */
  onSubmit: (query: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Input component for submitting AI queries.
 */
export function QueryInput({ 
  onSubmit, 
  disabled = false, 
  placeholder = "Enter your query..." 
}: QueryInputProps): JSX.Element {
  // Implementation
}
```

### SQL

- Use uppercase for keywords
- Use snake_case for identifiers
- Add comments for complex queries
- Always include migration rollback

```sql
-- Add user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user lookup
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Rollback
-- DROP TABLE IF EXISTS user_preferences;
```

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Backend unit tests
cd backend && cargo test

# Frontend unit tests
cd apps/dashboard && pnpm test

# Integration tests
cd apps/dashboard && pnpm test:integration

# E2E tests
cd apps/dashboard && pnpm test:e2e

# With coverage
pnpm test:coverage
```

### Test Requirements

- **Unit Tests**: Required for all new functions/methods
- **Integration Tests**: Required for API endpoints
- **E2E Tests**: Required for critical user flows

### Test Coverage

- Minimum 80% coverage for new code
- No reduction in overall coverage

## Pull Request Process

### Before Submitting

1. ✅ Update documentation if needed
2. ✅ Add/update tests for changes
3. ✅ Run linting and fix issues
4. ✅ Run all tests locally
5. ✅ Rebase on latest main
6. ✅ Squash related commits

### PR Template

```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if applicable)
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] All tests pass
- [ ] Conventional commit messages used

## Related Issues

Closes #(issue number)
```

### Review Process

1. At least 1 approval required
2. All CI checks must pass
3. No unresolved comments
4. Branch must be up-to-date with main

### After Merge

- Delete your branch
- Close related issues
- Update project board if applicable

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. Update CHANGELOG.md
2. Update version in Cargo.toml and package.json
3. Create release PR
4. After merge, tag the release:
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```
5. Create GitHub release with notes

## Getting Help

- 📖 [Documentation](./docs/)
- 💬 [Discord Community](https://discord.gg/bizra)
- 🐛 [Issue Tracker](https://github.com/bizra-io/bizra-node0-genesis/issues)
- 📧 Email: engineering@bizra.io

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to BIZRA Node0 Genesis! 🚀
