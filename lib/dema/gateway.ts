// lib/dema/gateway.ts
// Thin client for bizra-cognition-gateway (localhost Axum service).
// NO_SHADOW_STATE: this module must not invent fallback data. If the gateway
// is unreachable, surface that failure honestly.

const DEFAULT_GATEWAY_URL = "http://127.0.0.1:7421";

export function gatewayBaseUrl(): string {
  return process.env.BIZRA_COGNITION_GATEWAY_URL || DEFAULT_GATEWAY_URL;
}

export type GatewayError = {
  code: "GATEWAY_UNREACHABLE" | "GATEWAY_HTTP" | "GATEWAY_DECODE";
  status: number;
  message: string;
  upstream?: unknown;
};

export async function gatewayFetch<T>(path: string): Promise<
  { ok: true; data: T } | { ok: false; error: GatewayError }
> {
  const url = `${gatewayBaseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "GATEWAY_UNREACHABLE",
        status: 503,
        message: `Cannot reach bizra-cognition-gateway at ${url}`,
        upstream: e instanceof Error ? e.message : String(e),
      },
    };
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore — keep raw status
    }
    return {
      ok: false,
      error: {
        code: "GATEWAY_HTTP",
        status: res.status,
        message: `Gateway returned ${res.status} for ${path}`,
        upstream: body,
      },
    };
  }

  try {
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "GATEWAY_DECODE",
        status: 502,
        message: `Gateway response for ${path} was not valid JSON`,
        upstream: e instanceof Error ? e.message : String(e),
      },
    };
  }
}
