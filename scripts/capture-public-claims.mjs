#!/usr/bin/env node
/* global AbortController, Buffer, DOMException, URL, clearTimeout, fetch, process, setTimeout */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REQUEST_TIMEOUT_MS = 5_000;
const MAX_PUBLIC_TEXT_LENGTH = 16_384;
const REQUIRED_ARGUMENTS = new Set([
  'base-url',
  'captured-at',
  'output',
  'source-commit',
]);
const PUBLIC_EVIDENCE_JSON_KEYS = new Set([
  'claim_id',
  'evidence_commit',
  'evidence_href',
]);
const SENSITIVE_JSON_KEY =
  /(?:^|_)(?:address|authorization|cookie|credential|email|hash|host|id|invite|key|member|nonce|password|path|secret|signature|source|token|user)(?:_|$)/i;

function usage() {
  return [
    'Usage:',
    '  node scripts/capture-public-claims.mjs \\',
    '    --base-url https://bizra.ai \\',
    '    --output artifacts/public-claims/capture.json \\',
    '    --captured-at 2026-07-24T00:00:00.000Z \\',
    '    --source-commit 0123456789abcdef0123456789abcdef01234567',
  ].join('\n');
}

export function parseArguments(argv) {
  const values = new Map();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error(`Invalid argument sequence.\n${usage()}`);
    }

    const name = flag.slice(2);
    if (!REQUIRED_ARGUMENTS.has(name)) {
      throw new Error(`Unknown argument: ${flag}\n${usage()}`);
    }
    if (values.has(name)) {
      throw new Error(`Duplicate argument: ${flag}`);
    }
    values.set(name, value);
  }

  const missing = [...REQUIRED_ARGUMENTS].filter((name) => !values.has(name));
  if (missing.length > 0) {
    throw new Error(`Missing required arguments: ${missing.join(', ')}\n${usage()}`);
  }

  const parsedBaseUrl = new URL(values.get('base-url'));
  if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
    throw new Error('--base-url must use http or https');
  }
  if (parsedBaseUrl.username || parsedBaseUrl.password) {
    throw new Error('--base-url must not contain credentials');
  }
  if (
    parsedBaseUrl.pathname !== '/' ||
    parsedBaseUrl.search ||
    parsedBaseUrl.hash
  ) {
    throw new Error('--base-url must be an origin without path, query, or fragment');
  }

  const capturedAt = values.get('captured-at');
  const parsedCapturedAt = new Date(capturedAt);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(capturedAt) ||
    Number.isNaN(parsedCapturedAt.getTime()) ||
    parsedCapturedAt.toISOString() !== capturedAt
  ) {
    throw new Error('--captured-at must be an exact UTC ISO timestamp');
  }

  const sourceCommit = values.get('source-commit').toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error('--source-commit must be a 40-character Git commit SHA');
  }

  const output = values.get('output');
  if (output.trim().length === 0) {
    throw new Error('--output must not be empty');
  }

  return {
    baseUrl: parsedBaseUrl.origin,
    capturedAt,
    declaredSourceReviewCommit: sourceCommit,
    output: resolve(output),
  };
}

async function loadInventory() {
  const inventoryPath = fileURLToPath(
    new URL('../lib/public-claims/surfaces.ts', import.meta.url)
  );
  const inventorySource = await readFile(inventoryPath, 'utf8');

  // surfaces.ts deliberately contains JavaScript syntax only. A data URL lets
  // this CLI consume that single source of truth on Node versions that do not
  // natively strip TypeScript.
  const inventoryModuleUrl = `data:text/javascript;base64,${Buffer.from(
    inventorySource
  ).toString('base64')}`;
  const inventoryModule = await import(inventoryModuleUrl);
  return inventoryModule.PUBLIC_CAPTURE_SURFACES;
}

function sha256Hex(body) {
  return createHash('sha256').update(body).digest('hex');
}

function decodeHtmlEntities(text) {
  const namedEntities = new Map([
    ['amp', '&'],
    ['apos', "'"],
    ['gt', '>'],
    ['lt', '<'],
    ['nbsp', ' '],
    ['quot', '"'],
  ]);

  return text.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (entity, decimal, hexadecimal, named) => {
      if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
      if (hexadecimal) {
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      }
      return namedEntities.get(named.toLowerCase()) ?? entity;
    }
  );
}

function redactSensitiveText(text) {
  return text
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      '[redacted-email]'
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi, 'Bearer [redacted-token]')
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      '[redacted-token]'
    )
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      '[redacted-id]'
    )
    .replace(
      /(?:file:\/\/)?\/(?:home|Users|data|root|var\/lib)\/[^\s"'<>]+/g,
      '[redacted-path]'
    );
}

function normalizeWhitespace(text) {
  const normalized = redactSensitiveText(text)
    .normalize('NFKC')
    .replaceAll(String.fromCharCode(0), '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= MAX_PUBLIC_TEXT_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_PUBLIC_TEXT_LENGTH)} …[truncated]`;
}

function normalizeHtml(html) {
  const visibleText = decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(
        /<(?:script|style|noscript|template)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template)>/gi,
        ' '
      )
      .replace(/<[^>]+>/g, ' ')
  );
  return normalizeWhitespace(visibleText);
}

function sanitizeJsonValue(value, key = '') {
  if (
    !PUBLIC_EVIDENCE_JSON_KEYS.has(key) &&
    SENSITIVE_JSON_KEY.test(key)
  ) {
    return '[redacted]';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJsonValue(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((childKey) => [
          childKey,
          sanitizeJsonValue(value[childKey], childKey),
        ])
    );
  }
  if (typeof value === 'string') return redactSensitiveText(value);
  return value;
}

export function normalizePublicText(body, contentType) {
  const mimeType = (contentType ?? '').split(';', 1)[0].trim().toLowerCase();
  const decodedBody = body.toString('utf8');

  if (mimeType === 'application/json' || mimeType.endsWith('+json')) {
    try {
      return normalizeWhitespace(
        JSON.stringify(sanitizeJsonValue(JSON.parse(decodedBody)))
      );
    } catch {
      return normalizeWhitespace(decodedBody);
    }
  }

  if (
    mimeType === 'text/html' ||
    mimeType === 'application/xhtml+xml' ||
    mimeType.endsWith('+xml') ||
    mimeType === 'application/xml' ||
    mimeType === 'text/xml'
  ) {
    return normalizeHtml(decodedBody);
  }

  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('javascript') ||
    mimeType === 'application/xml'
  ) {
    return normalizeWhitespace(decodedBody);
  }

  return null;
}

export function sanitizeLocation(location, requestUrl) {
  if (!location) return null;

  try {
    const parsed = new URL(location, requestUrl);
    parsed.username = '';
    parsed.password = '';
    parsed.hash = '';

    const parameterNames = [...new Set(parsed.searchParams.keys())].sort();
    parsed.search = '';
    for (const name of parameterNames) {
      parsed.searchParams.set(name, '[redacted]');
    }

    const safeLocation = `${parsed.pathname}${parsed.search}`;
    return parsed.origin === requestUrl.origin
      ? safeLocation
      : `${parsed.origin}${safeLocation}`;
  } catch {
    return '[redacted-location]';
  }
}

async function captureSurface(surface, baseUrl) {
  const requestUrl = new URL(surface.route, `${baseUrl}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl, {
      credentials: 'omit',
      headers: {
        Accept: 'text/html,application/json,text/plain;q=0.9,*/*;q=0.1',
        'User-Agent': 'BIZRA-Public-Claim-Capture/1.0',
      },
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    });
    const body = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type');
    const retainPublicText = surface.retainPublicText !== false;
    const publicText = retainPublicText
      ? normalizePublicText(body, contentType)
      : null;

    return {
      id: surface.id,
      kind: surface.kind,
      requestMethod: 'GET',
      requestPath: surface.route,
      sourcePath: surface.sourcePath,
      inventoryDisposition: surface.disposition,
      status: response.status,
      location: sanitizeLocation(
        response.headers.get('location'),
        requestUrl
      ),
      contentType,
      bodyByteLength: body.byteLength,
      bodySha256: sha256Hex(body),
      textRetention: retainPublicText ? 'redacted-public-text' : 'hash-only',
      publicText,
      publicTextTruncated:
        retainPublicText && publicText !== null
          ? publicText.endsWith(' …[truncated]')
          : null,
    };
  } catch (error) {
    return {
      id: surface.id,
      kind: surface.kind,
      requestMethod: 'GET',
      requestPath: surface.route,
      sourcePath: surface.sourcePath,
      inventoryDisposition: surface.disposition,
      status: 0,
      location: null,
      contentType: null,
      bodyByteLength: null,
      bodySha256: null,
      textRetention:
        surface.retainPublicText === false
          ? 'hash-only'
          : 'redacted-public-text',
      publicText: null,
      publicTextTruncated: null,
      error:
        error instanceof DOMException && error.name === 'AbortError'
          ? 'request_timeout'
          : 'request_failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runCapture(options) {
  const inventory = await loadInventory();
  const surfaces = await Promise.all(
    inventory.map((surface) => captureSurface(surface, options.baseUrl))
  );

  const output = {
    schemaVersion: 2,
    capturedAt: options.capturedAt,
    declaredSourceReviewCommit: options.declaredSourceReviewCommit,
    deploymentCommit: null,
    deploymentSourceBinding: 'UNVERIFIED',
    baseUrl: options.baseUrl,
    requestPolicy: {
      credentials: 'omit',
      redirects: 'manual',
      timeoutMs: REQUEST_TIMEOUT_MS,
      responseHeadersRetained: ['content-type', 'location'],
      rawBodiesRetained: false,
      maxPublicTextCharacters: MAX_PUBLIC_TEXT_LENGTH,
      expectedPrivateResponses: 'status-and-body-hash-only',
    },
    surfaces,
  };

  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  return output;
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    await runCapture(options);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Capture failed'}\n`
    );
    process.exitCode = 1;
  }
}

const invokedAsScript =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsScript) {
  await main();
}
