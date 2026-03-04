# BIZRA Genesis

> The Sovereign AI Platform - Node 0 Implementation

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## 🗺️ Architecture Atlas

Interactive system architecture documentation available at `/atlas`:

- **8 Canonical Diagrams**: Ecosystem, Layers, Node Identity, Agent Hierarchy, SAT-49, Governance, Runtime, CI/CD
- **Keyboard Navigation**: Press 0-7 to switch diagrams, +/- to zoom
- **SVG Export**: Download diagrams for presentations
- **Responsive**: Works on desktop and mobile

Also available as standalone HTML: `public/architecture-atlas.html`

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm test:unit` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm lighthouse` | Run Lighthouse CI audit |
| `pnpm k6:smoke` | Run k6 performance tests |
| `pnpm analyze` | Analyze bundle size |
| `pnpm ci` | Run full CI pipeline locally |
| `pnpm docker:build` | Build Docker image |
| `pnpm docker:run` | Run Docker container |

## 🌌 Unified System Activation (Home Base)

To activate the complete BIZRA Home Base system (integrating Genesis Node + HERMES Finance):

```powershell
# Run the unified orchestrator
.\scripts\activate-unified-system.ps1
```

This script:
1. Validates HERMES v1.1 sovereignty evidence
2. Activates the 12-agent PAT/SAT system
3. Launches HERMES Finance Service (Port 8080)
4. Launches Genesis Node Backend (Port 3000)
5. Establishes the local sovereignty bridge

## 🎯 Performance Budgets

This project enforces strict performance budgets:

### Core Web Vitals
| Metric | Budget | Description |
|--------|--------|-------------|
| **LCP** | < 2.5s | Largest Contentful Paint (mobile) |
| **TTI** | < 3.0s | Time to Interactive |
| **CLS** | < 0.1 | Cumulative Layout Shift |
| **FCP** | < 2.0s | First Contentful Paint |

### Bundle Sizes
| Type | Budget |
|------|--------|
| Main bundle (gzip) | < 300kb |
| Total JS (gzip) | < 500kb |
| Total page size | < 2MB |

### API Response Times
| Metric | Budget |
|--------|--------|
| p95 response | < 250ms |
| p99 response | < 500ms |

## 🔄 CI/CD Pipeline

The CI pipeline runs on every push and PR:

1. **Lint** - ESLint checks
2. **TypeScript** - Type checking (`tsc --noEmit`)
3. **Unit Tests** - Vitest/Jest (when configured)
4. **E2E Tests** - Playwright smoke tests
5. **Lighthouse** - Performance audit with budgets
6. **k6** - Load testing with thresholds
7. **Build** - Production build + bundle analysis
8. **Security** - npm audit, Trivy scan, SBOM generation

### Running CI Locally

```bash
# Quick CI (lint + typecheck + build)
make ci

# Full CI with all tests
make ci-full

# Or using npm
pnpm ci
```

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main lifecycle page (lean)
│   └── showcase/          # 3D showcase (heavy, route-split)
├── components/            # React components
│   ├── lifecycle/         # User journey components
│   ├── settings/          # Settings & data privacy
│   └── ...
├── store/                 # Zustand state management
├── tests/
│   ├── e2e/              # Playwright E2E tests
│   └── k6/               # k6 performance tests
├── lighthouserc.js        # Lighthouse CI config
├── playwright.config.ts   # Playwright config
└── next.config.mjs        # Next.js config (security headers)
```

## 🔒 Security

### Headers
The app ships with comprehensive security headers:
- **CSP** - Content Security Policy
- **HSTS** - HTTP Strict Transport Security
- **X-Frame-Options** - Clickjacking protection
- **X-Content-Type-Options** - MIME sniffing prevention
- **Referrer-Policy** - Referrer information control
- **Permissions-Policy** - Feature restrictions

### Data Privacy
- All user data is stored locally (localStorage)
- No personal data sent to external servers
- "Clear local data" button in the footer allows users to wipe all saved data
- Sensitive fields (`primaryStressor`) are automatically excluded from persistence via `partialize`

## 🛠️ Development

### Route Splitting
Heavy 3D components are route-split to `/showcase`:
- Main lifecycle path (`/`) is kept lean (< 300kb gz)
- 3D showcase uses dynamic imports
- WebGL fallback for unsupported devices

### Make Commands

```bash
make help          # Show all commands
make dev           # Start development
make test          # Run all tests
make lighthouse    # Performance audit
make k6-smoke      # Load testing
make budgets       # Show performance budgets
make ci            # Run CI locally
```

## dY"+ Local Verification (A+ Gate)

Run the same gates CI enforces before you push:

```bash
pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build
```

Requires Node 20+ and pnpm 8+ (matches CI/runtime).

## 📊 Monitoring

### Local Development
- React DevTools for component inspection
- Zustand DevTools for state debugging
- Bundle analyzer: `pnpm analyze`

### Production
- Lighthouse CI reports in CI artifacts
- k6 results with threshold validation
- Security scan results (SBOM, vulnerabilities)

## 🧪 Testing

### E2E Tests
```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui
```

### Performance Tests
```bash
# Run k6 smoke test
pnpm k6:smoke

# Or with make
make k6-smoke
```

## 📖 Documentation

- [Architecture](./ARCHITECTURE.md)
- [Golden Principles](./GOLDEN_PRINCIPLES_APPLICATION_PLAN.md)
- [Anti-Fragility](./COMPREHENSIVE_ANTI_FRAGILITY_SUMMARY.md)
- [Node 0 Blueprint](./BIZRA_NODE_0_BLUEPRINT.md)

---

Built with 💜 for sovereign AI

