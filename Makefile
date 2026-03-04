# =============================================================================
# BIZRA Node0 Genesis - Frontend Makefile
# =============================================================================
# Automation for development, testing, building, and deployment
# This is a Next.js frontend-only project (no backend/ or apps/dashboard/)
# =============================================================================

.PHONY: all help setup dev test build clean lint format verify

# Default target
all: help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# Project info
PROJECT_NAME := bizra-node0-genesis
VERSION := $(shell cat VERSION 2>/dev/null || echo "1.0.0")
GIT_SHA := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# Environment
ENV ?= development
NODE_ENV ?= development

# =============================================================================
# HELP
# =============================================================================

help: ## Show this help message
	@echo "$(CYAN)╔════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║         BIZRA Node0 Genesis - Development Commands             ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(GREEN)Usage:$(RESET) make [target]"
	@echo ""
	@echo "$(YELLOW)Development:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^(dev|setup|install)" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Testing:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^test" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Building:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^build" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Quality:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^(lint|format|security|verify)" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Performance:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E "^(lighthouse|k6|analyze|budgets)" | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Project:$(RESET) $(PROJECT_NAME) v$(VERSION) ($(GIT_SHA))"

# =============================================================================
# DEVELOPMENT SETUP
# =============================================================================

setup: install setup-hooks ## Full development environment setup
	@echo "$(GREEN)✓ Development environment ready!$(RESET)"

install: ## Install project dependencies
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	pnpm install
	@echo "$(GREEN)✓ Dependencies installed$(RESET)"

setup-hooks: ## Setup Git hooks
	@echo "$(CYAN)Setting up Git hooks...$(RESET)"
	@if command -v pre-commit &> /dev/null; then \
		pre-commit install; \
		pre-commit install --hook-type commit-msg; \
		echo "$(GREEN)✓ Git hooks installed$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ pre-commit not installed, skipping hooks$(RESET)"; \
	fi

# =============================================================================
# DEVELOPMENT
# =============================================================================

dev: ## Start development server
	@echo "$(CYAN)Starting development server...$(RESET)"
	pnpm dev

start: ## Start production server
	@echo "$(CYAN)Starting production server...$(RESET)"
	pnpm start

# =============================================================================
# TESTING
# =============================================================================

test: test-unit test-e2e ## Run all tests
	@echo "$(GREEN)✓ All tests passed$(RESET)"

test-unit: ## Run unit tests
	@echo "$(CYAN)Running unit tests...$(RESET)"
	pnpm test:unit

test-e2e: ## Run E2E tests with Playwright
	@echo "$(CYAN)Running E2E tests...$(RESET)"
	pnpm test:e2e

test-coverage: ## Run tests with coverage
	@echo "$(CYAN)Running tests with coverage...$(RESET)"
	pnpm test:unit --coverage

test-watch: ## Run tests in watch mode
	pnpm test:unit --watch

# =============================================================================
# BUILDING
# =============================================================================

build: ## Build for production
	@echo "$(CYAN)Building for production...$(RESET)"
	pnpm build
	@echo "$(GREEN)✓ Build complete$(RESET)"

build-analyze: ## Build with bundle analysis
	@echo "$(CYAN)Building with bundle analysis...$(RESET)"
	ANALYZE=true pnpm build

# =============================================================================
# CODE QUALITY
# =============================================================================

lint: ## Run ESLint
	@echo "$(CYAN)Running linter...$(RESET)"
	pnpm lint
	@echo "$(GREEN)✓ Linting passed$(RESET)"

lint-fix: ## Fix linting issues
	@echo "$(CYAN)Fixing lint issues...$(RESET)"
	pnpm lint --fix

format: ## Format code with Prettier
	@echo "$(CYAN)Formatting code...$(RESET)"
	pnpm format
	@echo "$(GREEN)✓ Code formatted$(RESET)"

format-check: ## Check code formatting
	@echo "$(CYAN)Checking code format...$(RESET)"
	pnpm format:check

typecheck: ## Run TypeScript type checking
	@echo "$(CYAN)Running type check...$(RESET)"
	pnpm typecheck

security: ## Run security vulnerability scan
	@echo "$(CYAN)Running security scan...$(RESET)"
	@if command -v trivy &> /dev/null; then \
		trivy fs --severity HIGH,CRITICAL .; \
	else \
		echo "$(YELLOW)⚠ trivy not installed, running pnpm audit only$(RESET)"; \
	fi
	pnpm audit || true
	@echo "$(GREEN)✓ Security scan complete$(RESET)"

# =============================================================================
# PERFORMANCE (A+ Roadmap)
# =============================================================================

lighthouse: ## Run Lighthouse CI performance audit
	@echo "$(CYAN)Running Lighthouse CI...$(RESET)"
	pnpm build
	npx @lhci/cli autorun
	@echo "$(GREEN)✓ Lighthouse audit complete$(RESET)"

k6-smoke: ## Run k6 smoke test with thresholds
	@echo "$(CYAN)Running k6 smoke test...$(RESET)"
	@if [ -f tests/k6/smoke.js ]; then \
		pnpm start & sleep 5 && k6 run tests/k6/smoke.js && kill %1; \
	else \
		echo "$(YELLOW)⚠ No k6 smoke test found$(RESET)"; \
	fi

analyze-bundle: ## Analyze bundle size
	@echo "$(CYAN)Analyzing bundle size...$(RESET)"
	ANALYZE=true pnpm build

budgets: ## Show performance budgets
	@echo "$(CYAN)╔════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║       Performance Budgets (A+)         ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(YELLOW)Core Web Vitals:$(RESET)"
	@echo "  LCP:  < 2.5s (mobile)"
	@echo "  TTI:  < 3.0s"
	@echo "  CLS:  < 0.1"
	@echo "  FCP:  < 2.0s"
	@echo ""
	@echo "$(YELLOW)Bundle Sizes:$(RESET)"
	@echo "  Main bundle (gzip): < 300kb"
	@echo "  Total JS (gzip):    < 500kb"
	@echo ""
	@echo "$(YELLOW)API Response (p95):$(RESET)"
	@echo "  Pages: < 250ms"
	@echo "  API:   < 250ms"

# =============================================================================
# VERIFICATION
# =============================================================================

verify: lint format-check typecheck test-unit security ## Run full verification suite
	@echo "$(GREEN)✓ All verification checks passed$(RESET)"

ci: verify build ## Run CI pipeline locally
	@echo "$(GREEN)✓ CI pipeline passed$(RESET)"

ci-full: verify test-e2e lighthouse build ## Run full CI with performance tests
	@echo "$(GREEN)✓ Full CI pipeline with performance tests passed$(RESET)"

# =============================================================================
# CLEANUP
# =============================================================================

clean: ## Clean build artifacts
	@echo "$(CYAN)Cleaning build artifacts...$(RESET)"
	rm -rf .next out coverage playwright-report .lighthouseci
	rm -rf node_modules/.cache
	@echo "$(GREEN)✓ Cleaned$(RESET)"

clean-all: clean ## Clean everything including node_modules
	@echo "$(CYAN)Cleaning all including dependencies...$(RESET)"
	rm -rf node_modules
	@echo "$(GREEN)✓ Full cleanup complete$(RESET)"

# =============================================================================
# VERSION & INFO
# =============================================================================

version: ## Show current version
	@echo "$(PROJECT_NAME) v$(VERSION) ($(GIT_SHA))"

info: ## Show project info
	@echo "$(CYAN)╔════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║       BIZRA Node0 Genesis Info         ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(YELLOW)Project:$(RESET) $(PROJECT_NAME)"
	@echo "$(YELLOW)Version:$(RESET) $(VERSION)"
	@echo "$(YELLOW)Git SHA:$(RESET) $(GIT_SHA)"
	@echo "$(YELLOW)Build Date:$(RESET) $(BUILD_DATE)"
	@echo "$(YELLOW)Node Env:$(RESET) $(NODE_ENV)"
	@echo ""
	@echo "$(YELLOW)Stack:$(RESET)"
	@echo "  - Next.js 16 (App Router)"
	@echo "  - React 19"
	@echo "  - Three.js + React Three Fiber"
	@echo "  - Zustand (state management)"
	@echo "  - Tailwind CSS"

