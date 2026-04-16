# =============================================================================
# PRODUCTION DOCKERFILE - BIZRA Node0 Genesis
# =============================================================================
# Multi-stage build implementing elite containerization practices:
# - Minimal attack surface with distroless/alpine base
# - Layer caching optimization
# - Non-root user execution
# - Health checks for orchestration
# - Build-time security scanning compatible
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile --prod=false

# -----------------------------------------------------------------------------
# STAGE 2: Builder
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_BUILD_ID
ENV NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION:-0.0.0}
ENV NEXT_PUBLIC_BUILD_ID=${NEXT_PUBLIC_BUILD_ID:-local}

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# -----------------------------------------------------------------------------
# STAGE 3: Production Runner
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security: Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]

# =============================================================================
# BUILD INSTRUCTIONS
# =============================================================================
# Build:
#   docker build -t bizra-genesis:latest .
#   docker build --build-arg NEXT_PUBLIC_APP_VERSION=1.0.0 -t bizra-genesis:1.0.0 .
#
# Run:
#   docker run -p 3000:3000 bizra-genesis:latest
#
# With environment variables:
#   docker run -p 3000:3000 \
#     -e NODE_ENV=production \
#     bizra-genesis:latest
# =============================================================================
