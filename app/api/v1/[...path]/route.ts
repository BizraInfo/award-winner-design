/**
 * Sovereign API Proxy — Phase 75.02
 *
 * Proxies /api/v1/* requests to the Python sovereign backend.
 * Runs as a Next.js serverless function (not Edge — needs longer timeout).
 *
 * Auth: Forwards Authorization header as-is.
 * Error: Returns structured JSON on upstream failure.
 * Cache: No caching — sovereign API manages its own cache.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SOVEREIGN_URL =
  process.env.SOVEREIGN_API_URL ||
  process.env.SCAFFOLD_API_URL ||
  "http://localhost:9740";

const UPSTREAM_TIMEOUT_MS = 30_000;

// Routes that are publicly accessible (no auth required)
// Public paths that don't require auth — matches api_exposure_policy.py
const PUBLIC_V1_PATHS = new Set([
  "health",
  "health/live",
  "health/ready",
  "health/deep",
  "status",
  "metrics",
  "cognitive/status",
  "verify/genesis",
  "verify/envelope",
  "verify/receipt",
  "verify/audit-log",
  "verify/ledger",
  "verify/poi",
  "verify/signature",
  "verify/genesis/header",
  "token/supply",
  "token/verify",
]);

function isPublicV1Path(path: string): boolean {
  return PUBLIC_V1_PATHS.has(path);
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  const pathStr = path.join("/");
  const targetUrl = new URL(`/v1/${pathStr}`, SOVEREIGN_URL);

  // Forward query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  // Build forwarded headers (strip host, add tracing)
  const headers = new Headers();
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  headers.set("X-Forwarded-For", request.headers.get("x-forwarded-for") ?? "unknown");
  headers.set("X-Bizra-Proxy", "vercel-nextjs");

  // Forward user ID from middleware JWT verification
  const userId = request.headers.get("x-bizra-user-id");
  if (userId) {
    headers.set("X-Bizra-User-Id", userId);
  }

  // Forward terminal session ID for state machine isolation
  const sessionId = request.headers.get("x-session-id");
  if (sessionId) {
    headers.set("X-Session-ID", sessionId);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined,
      signal: controller.signal,
      // @ts-expect-error -- Next.js fetch extension
      duplex: "half",
    });

    const contentType = upstreamResponse.headers.get("content-type") ?? "application/json";
    const body = await upstreamResponse.arrayBuffer();

    return new NextResponse(body, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Sovereign-Status": String(upstreamResponse.status),
      },
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    const status = isAbort ? 504 : 502;
    const message = isAbort
      ? "Sovereign API timeout"
      : "Sovereign API unreachable";

    return NextResponse.json(
      {
        error: message,
        path: `/v1/${pathStr}`,
        upstream: SOVEREIGN_URL.replace(/\/\/.*@/, "//***@"), // Redact credentials
      },
      { status }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
