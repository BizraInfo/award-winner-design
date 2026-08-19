import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

import { afterAll, describe, expect, it } from 'vitest';

import {
  NON_GET_API_METHOD_SURFACES,
  PUBLIC_API_METHOD_SURFACES,
  PUBLIC_CAPTURE_SURFACES,
  PUBLIC_GET_API_SURFACES,
  PUBLIC_METADATA_SURFACES,
  PUBLIC_PAGE_SURFACES,
  PUBLIC_STATIC_TEXT_SURFACES,
  PUBLIC_SURFACES,
} from '../../../lib/public-claims/surfaces';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
const temporaryPaths: string[] = [];

const PUBLIC_TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.svg',
  '.txt',
  '.xml',
]);

const APP_METADATA_FILE_PATTERN =
  /(?:^|\/)(?:manifest|robots|sitemap)\.(?:js|jsx|ts|tsx)$/;
const APP_PAGE_FILE_PATTERN = /(?:^|\/)page\.(?:js|jsx|ts|tsx)$/;
const API_ROUTE_FILE_PATTERN = /(?:^|\/)route\.(?:js|ts)$/;
const EXPORTED_HTTP_METHOD_PATTERN =
  /export\s+(?:(?:async\s+)?function\s+(GET|HEAD|POST|PUT|PATCH|DELETE)\b|const\s+(GET|HEAD|POST|PUT|PATCH|DELETE)\s*=)/g;

function toPosix(pathname: string): string {
  return pathname.split(sep).join('/');
}

async function walkFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) return walkFiles(absolutePath);
      if (entry.isFile()) return [absolutePath];
      return [];
    })
  );

  return nested.flat().sort();
}

async function discoverExportedApiMethodPairs(): Promise<
  Array<{ method: string; sourcePath: string }>
> {
  const apiRoot = resolve(PROJECT_ROOT, 'app/api');
  const routeFiles = (await walkFiles(apiRoot)).filter((file) =>
    API_ROUTE_FILE_PATTERN.test(toPosix(relative(PROJECT_ROOT, file)))
  );
  const exportedMethods: Array<{ method: string; sourcePath: string }> = [];

  for (const file of routeFiles) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(EXPORTED_HTTP_METHOD_PATTERN)) {
      exportedMethods.push({
        method: match[1] ?? match[2],
        sourcePath: toPosix(relative(PROJECT_ROOT, file)),
      });
    }
  }

  return exportedMethods.sort((left, right) =>
    `${left.sourcePath}:${left.method}`.localeCompare(
      `${right.sourcePath}:${right.method}`
    )
  );
}

afterAll(async () => {
  await Promise.all(
    temporaryPaths.map((path) => rm(path, { force: true, recursive: true }))
  );
});

describe('public surface inventory', () => {
  it('enumerates every App Router page source, including dynamic routes', async () => {
    const discovered = (await walkFiles(resolve(PROJECT_ROOT, 'app')))
      .map((file) => toPosix(relative(PROJECT_ROOT, file)))
      .filter((file) => APP_PAGE_FILE_PATTERN.test(file))
      .sort();

    expect(PUBLIC_PAGE_SURFACES.map(({ sourcePath }) => sourcePath).sort()).toEqual(
      discovered
    );
    for (const surface of PUBLIC_PAGE_SURFACES) {
      const derivedRoute = surface.sourcePath
        .replace(/^app/, '')
        .replace(/\/page\.(?:js|jsx|ts|tsx)$/, '');
      expect(surface.route).toBe(derivedRoute || '/');
    }
    expect(PUBLIC_PAGE_SURFACES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: '/invites/[token]',
          sourcePath: 'app/invites/[token]/page.tsx',
          capture: false,
        }),
        expect.objectContaining({
          route: '/showcase/maestro',
          sourcePath: 'app/showcase/maestro/page.tsx',
        }),
      ])
    );
  });

  it('enumerates every claim-capable textual file under public', async () => {
    const discovered = (await walkFiles(resolve(PROJECT_ROOT, 'public')))
      .map((file) => toPosix(relative(PROJECT_ROOT, file)))
      .filter((file) => {
        const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
        return PUBLIC_TEXT_EXTENSIONS.has(extension);
      })
      .sort();

    expect(
      PUBLIC_STATIC_TEXT_SURFACES.map(({ sourcePath }) => sourcePath).sort()
    ).toEqual(discovered);
    for (const surface of PUBLIC_STATIC_TEXT_SURFACES) {
      expect(surface.route).toBe(
        encodeURI(surface.sourcePath.replace(/^public/, ''))
      );
    }
  });

  it('enumerates every public metadata source and every exported GET API source', async () => {
    const appFiles = (await walkFiles(resolve(PROJECT_ROOT, 'app'))).map((file) =>
      toPosix(relative(PROJECT_ROOT, file))
    );
    const metadataSources = appFiles
      .filter((file) => APP_METADATA_FILE_PATTERN.test(file))
      .sort();

    expect(
      PUBLIC_METADATA_SURFACES.map(({ sourcePath }) => sourcePath).sort()
    ).toEqual(metadataSources);
    expect([
      ...new Set(PUBLIC_GET_API_SURFACES.map(({ sourcePath }) => sourcePath)),
    ].sort()).toEqual(
      [
        ...new Set(
          (await discoverExportedApiMethodPairs())
            .filter(({ method }) => method === 'GET')
            .map(({ sourcePath }) => sourcePath)
        ),
      ].sort()
    );

    for (const surface of PUBLIC_GET_API_SURFACES.filter(
      ({ sourcePath }) => sourcePath !== 'app/api/v1/[...path]/route.ts'
    )) {
      expect(surface.route).toBe(
        surface.sourcePath
          .replace(/^app/, '')
          .replace(/\/route\.(?:js|ts)$/, '')
      );
    }
  });

  it('classifies every exported API method and source pair', async () => {
    const discovered = await discoverExportedApiMethodPairs();
    const inventoried = [
      ...new Map(
        PUBLIC_API_METHOD_SURFACES.map((surface) => [
          `${surface.sourcePath}:${surface.method}`,
          {
            method: surface.method,
            sourcePath: surface.sourcePath,
          },
        ])
      ).values(),
    ].sort((left, right) =>
      `${left.sourcePath}:${left.method}`.localeCompare(
        `${right.sourcePath}:${right.method}`
      )
    );

    expect(inventoried).toEqual(discovered);
    expect(
      PUBLIC_API_METHOD_SURFACES.every(
        ({ access, disposition, method, rationale }) =>
          /^(?:GET|HEAD|POST|PUT|PATCH|DELETE)$/.test(method) &&
          /public|beta|authenticated|secret/.test(access) &&
          disposition.length > 0 &&
          rationale.length > 0
      )
    ).toBe(true);
    expect(
      NON_GET_API_METHOD_SURFACES.every(({ capture, method }) => {
        return method !== 'GET' && capture === false;
      })
    ).toBe(true);
  });

  it('records the auth integrity hold and beta-before-public ordering', async () => {
    const loginSource = await readFile(
      resolve(PROJECT_ROOT, 'app/api/auth/login/route.ts'),
      'utf8'
    );
    expect(loginSource).toMatch(/AUTH_INTEGRITY_HOLD/);
    expect(loginSource).toMatch(/status:\s*503/);

    for (const method of ['POST', 'PUT']) {
      expect(
        NON_GET_API_METHOD_SURFACES.find(
          (surface) =>
            surface.sourcePath === 'app/api/auth/login/route.ts' &&
            surface.method === method
        )
      ).toMatchObject({
        access: 'public-integrity-hold',
        disposition: 'hold-auth-integrity',
        capture: false,
      });
    }
    expect(
      NON_GET_API_METHOD_SURFACES.find(
        (surface) =>
          surface.sourcePath === 'app/api/auth/login/route.ts' &&
          surface.method === 'DELETE'
      )
    ).toMatchObject({
      access: 'authenticated',
      disposition: 'allow-authenticated-logout',
      capture: false,
    });

    const middlewareSource = await readFile(
      resolve(PROJECT_ROOT, 'middleware.ts'),
      'utf8'
    );
    const betaGateIndex = middlewareSource.indexOf(
      '// Beta invite-only: block sovereign onboarding APIs'
    );
    const publicPassIndex = middlewareSource.indexOf(
      'if (isPublicRequest(req))',
      betaGateIndex
    );
    expect(betaGateIndex).toBeGreaterThan(-1);
    expect(publicPassIndex).toBeGreaterThan(betaGateIndex);

    for (const route of ['/api/genesis', '/api/node/activate']) {
      expect(
        NON_GET_API_METHOD_SURFACES.find((surface) => surface.route === route)
      ).toMatchObject({
        access: 'beta-gated-authenticated-mutation',
        disposition: 'beta-before-public',
        capture: false,
      });
    }
  });

  it('binds the explicit upstream v1 proxy allowlist without gaps', async () => {
    const source = await readFile(
      resolve(PROJECT_ROOT, 'app/api/v1/[...path]/route.ts'),
      'utf8'
    );
    const allowlistBlock = source.match(
      /const PUBLIC_V1_PATHS = new Set\(\[([\s\S]*?)\]\)/
    )?.[1];
    expect(allowlistBlock).toBeDefined();

    const publicPaths = [
      ...(allowlistBlock ?? '').matchAll(/["']([^"']+)["']/g),
    ]
      .map((match) => `/api/v1/${match[1]}`)
      .sort();
    const inventoriedPaths = PUBLIC_GET_API_SURFACES.filter(
      ({ sourcePath }) => sourcePath === 'app/api/v1/[...path]/route.ts'
    )
      .map(({ route }) => route)
      .sort();

    expect(inventoriedPaths).toEqual(publicPaths);
  });

  it('tracks the middleware public API and metadata boundary', async () => {
    const middlewareSource = await readFile(
      resolve(PROJECT_ROOT, 'middleware.ts'),
      'utf8'
    );
    const fixedPublicApiBlock = middlewareSource.match(
      /const PUBLIC_API_PATHS = new Set(?:<string>)?\(\[([\s\S]*?)\]\);/
    )?.[1];
    expect(fixedPublicApiBlock).toBeDefined();

    const inventoriedRoutes = new Set(
      PUBLIC_GET_API_SURFACES.map(({ route }) => route)
    );
    const fixedPublicGetRoutes = [
      ...(fixedPublicApiBlock ?? '').matchAll(/["']([^"']+)["']/g),
    ]
      .map((match) => match[1])
      .filter((route) => inventoriedRoutes.has(route));
    const fixedPublicRoutes = new Set(
      [...(fixedPublicApiBlock ?? '').matchAll(/["']([^"']+)["']/g)].map(
        (match) => match[1]
      )
    );
    const nonAuthenticatedGetRoutes = PUBLIC_GET_API_SURFACES.filter(
      ({ access }) => !access.startsWith('authenticated')
    ).map(({ route }) => route);
    const conditionalPublicHealthRoutes = middlewareSource.includes(
      "req.nextUrl.pathname === '/api/health' && !isVerboseHealthRequest(req)"
    )
      ? ['/api/health']
      : [];

    expect(nonAuthenticatedGetRoutes.sort()).toEqual(
      [
        ...fixedPublicGetRoutes,
        ...conditionalPublicHealthRoutes,
        '/api/invites/[token]',
      ].sort()
    );

    const expectedNonAuthenticatedMethodPairs = PUBLIC_API_METHOD_SURFACES.filter(
      ({ method, route }) =>
        fixedPublicRoutes.has(route) ||
        (route === '/api/health' && ['GET', 'HEAD'].includes(method)) ||
        (route === '/api/auth/login' && ['POST', 'PUT'].includes(method)) ||
        (route === '/api/invites/[token]' && method === 'GET')
    ).map(({ method, route }) => `${method}:${route}`);
    const inventoriedNonAuthenticatedMethodPairs =
      PUBLIC_API_METHOD_SURFACES.filter(
        ({ access }) =>
          !access.startsWith('authenticated') &&
          !access.includes('authenticated')
      ).map(({ method, route }) => `${method}:${route}`);
    expect(inventoriedNonAuthenticatedMethodPairs.sort()).toEqual(
      expectedNonAuthenticatedMethodPairs.sort()
    );
    expect(
      PUBLIC_GET_API_SURFACES.find(
        ({ route }) => route === '/api/csrf-token'
      )?.capture
    ).toBe(false);
    expect(
      PUBLIC_GET_API_SURFACES.find(
        ({ route }) => route === '/api/invites/[token]'
      )?.capture
    ).toBe(false);
    expect(middlewareSource).toContain(
      "req.method === 'GET' && /^\\/api\\/invites\\/"
    );

    expect(middlewareSource).toMatch(/robots\.txt\|sitemap\.xml/);
    expect(
      PUBLIC_METADATA_SURFACES.find(
        ({ route }) => route === '/sitemap.xml'
      )?.disposition
    ).toBe('reviewed');
    expect(
      PUBLIC_STATIC_TEXT_SURFACES.find(
        ({ route }) => route === '/robots.txt'
      )?.disposition
    ).toBe('reviewed');
  });

  it('gives every source an explicit disposition and captures no secret route', () => {
    expect(new Set(PUBLIC_SURFACES.map(({ id }) => id)).size).toBe(
      PUBLIC_SURFACES.length
    );
    expect(
      PUBLIC_SURFACES.every(
        ({ disposition, rationale, sourcePath }) =>
          disposition.length > 0 &&
          rationale.length > 0 &&
          sourcePath.length > 0
      )
    ).toBe(true);

    for (const surface of PUBLIC_CAPTURE_SURFACES) {
      expect(surface.route).not.toMatch(/\[[^\]]+\]/);
      if (surface.access.startsWith('authenticated')) {
        expect(surface.kind).toBe('api');
        expect(surface.retainPublicText).toBe(false);
      } else {
        expect(surface.access).toBe('public');
        expect(surface.disposition).not.toMatch(/authenticated|private|secret/);
      }
    }
  });

  it('credential-free probes every fixed GET API without retaining expected-private text', () => {
    const probeableApis = PUBLIC_GET_API_SURFACES.filter(
      ({ route }) => !route.includes('[') && route !== '/api/csrf-token'
    );

    expect(
      PUBLIC_CAPTURE_SURFACES.filter(({ kind }) => kind === 'api')
        .map(({ route }) => route)
        .sort()
    ).toEqual(probeableApis.map(({ route }) => route).sort());

    for (const surface of probeableApis) {
      if (surface.access.startsWith('authenticated')) {
        expect(surface).toMatchObject({
          capture: true,
          retainPublicText: false,
        });
      }
    }
  });

  it(
    'captures deterministic, redacted evidence without sending ambient credentials',
    async () => {
      const receivedHeaders: Array<{
        authorization?: string;
        cookie?: string;
        method?: string;
      }> = [];
      const server = createServer((request, response) => {
        receivedHeaders.push({
          authorization: request.headers.authorization,
          cookie: request.headers.cookie,
          method: request.method,
        });

        if (request.url === '/wallet') {
          response.writeHead(307, {
            Location: '/review?token=private-token',
          });
          response.end();
          return;
        }

        if (request.url === '/api/beta/status') {
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(
            JSON.stringify({
              claim_id: 'BIZRA-PUBLIC-005',
              evidence_commit: 'a'.repeat(40),
              evidence_href: 'https://example.test/evidence',
              email: 'private@example.com',
              status: 'healthy',
              token: 'private-token',
            })
          );
          return;
        }

        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(
          '<html><style>.hidden{}</style><body>Public claim ' +
            'private@example.com<script>private-token</script></body></html>'
        );
      });

      await new Promise<void>((resolveListen) => {
        server.listen(0, '127.0.0.1', resolveListen);
      });

      try {
        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Expected a TCP test server address');
        }

        const temporaryPath = await mkdtemp(
          join(tmpdir(), 'bizra-public-capture-test-')
        );
        temporaryPaths.push(temporaryPath);
        const firstOutput = join(temporaryPath, 'first.json');
        const secondOutput = join(temporaryPath, 'second.json');
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const commonArguments = [
          '--base-url',
          baseUrl,
          '--captured-at',
          '2026-07-24T00:00:00.000Z',
          '--source-commit',
          '568ab0b41c32f812b8ce4d20e7f4ffdf1ebffd6e',
        ];

        await execFileAsync(process.execPath, [
          resolve(PROJECT_ROOT, 'scripts/capture-public-claims.mjs'),
          ...commonArguments,
          '--output',
          firstOutput,
        ]);
        await execFileAsync(process.execPath, [
          resolve(PROJECT_ROOT, 'scripts/capture-public-claims.mjs'),
          ...commonArguments,
          '--output',
          secondOutput,
        ]);

        const first = await readFile(firstOutput, 'utf8');
        expect(await readFile(secondOutput, 'utf8')).toBe(first);

        const capture = JSON.parse(first) as {
          baseUrl: string;
          capturedAt: string;
          declaredSourceReviewCommit: string;
          deploymentCommit: null;
          deploymentSourceBinding: string;
          schemaVersion: number;
          sourceCommit?: string;
          surfaces: Array<{
            bodyByteLength: number | null;
            bodySha256: string | null;
            contentType: string | null;
            disposition?: string;
            inventoryDisposition: string;
            location: string | null;
            publicText: string | null;
            publicTextTruncated: boolean | null;
            requestMethod: string;
            requestPath: string;
            status: number;
            textRetention: string;
          }>;
        };
        expect(capture).toMatchObject({
          schemaVersion: 2,
          baseUrl,
          capturedAt: '2026-07-24T00:00:00.000Z',
          declaredSourceReviewCommit:
            '568ab0b41c32f812b8ce4d20e7f4ffdf1ebffd6e',
          deploymentCommit: null,
          deploymentSourceBinding: 'UNVERIFIED',
        });
        expect(capture).not.toHaveProperty('sourceCommit');
        expect(capture.surfaces).toHaveLength(PUBLIC_CAPTURE_SURFACES.length);
        expect(
          capture.surfaces.every(
            ({ disposition, inventoryDisposition, requestMethod }) =>
              disposition === undefined &&
              inventoryDisposition.length > 0 &&
              requestMethod === 'GET'
          )
        ).toBe(true);
        expect(
          capture.surfaces.every(({ bodySha256 }) =>
            bodySha256 === null ? false : /^[0-9a-f]{64}$/.test(bodySha256)
          )
        ).toBe(true);
        expect(
          capture.surfaces.every(
            ({ bodyByteLength }) =>
              typeof bodyByteLength === 'number' && bodyByteLength >= 0
          )
        ).toBe(true);

        const betaStatus = capture.surfaces.find(
          ({ requestPath }) => requestPath === '/api/beta/status'
        );
        expect(betaStatus?.publicText).toContain('healthy');
        expect(betaStatus?.publicText).toContain('BIZRA-PUBLIC-005');
        expect(betaStatus?.publicText).toContain('https://example.test/evidence');
        expect(betaStatus?.textRetention).toBe('redacted-public-text');
        expect(betaStatus?.publicTextTruncated).toBe(false);
        expect(betaStatus?.publicText).not.toMatch(
          /private@example\.com|private-token/
        );

        const authenticatedStatusProbe = capture.surfaces.find(
          ({ requestPath }) => requestPath === '/api/auth/me'
        );
        expect(authenticatedStatusProbe).toMatchObject({
          publicText: null,
          publicTextTruncated: null,
          textRetention: 'hash-only',
        });

        const wallet = capture.surfaces.find(
          ({ requestPath }) => requestPath === '/wallet'
        );
        expect(wallet).toMatchObject({
          status: 307,
          location: '/review?token=%5Bredacted%5D',
        });

        expect(first).not.toMatch(/private@example\.com|private-token/);
        expect(
          receivedHeaders.every(
            ({ authorization, cookie, method }) =>
              !authorization && !cookie && method === 'GET'
          )
        ).toBe(true);
      } finally {
        await new Promise<void>((resolveClose, rejectClose) => {
          server.close((error) => {
            if (error) rejectClose(error);
            else resolveClose();
          });
        });
      }
    },
    20_000
  );
});
