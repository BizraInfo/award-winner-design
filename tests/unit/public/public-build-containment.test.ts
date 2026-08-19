import { execFile } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
const CHECKER_PATH = resolve(
  PROJECT_ROOT,
  'scripts/check-public-build-assets.mjs'
);
const temporaryPaths: string[] = [];

const CONTAINMENT_HELPER = `import { redirect } from 'next/navigation';

export function containUnreviewedPublicRoute(): never {
  redirect('/?containment=public-claim-review');
}
`;

const CONTAINMENT_WRAPPER = `import { containUnreviewedPublicRoute } from '@/lib/public-claims/containment';

export default function ContainedPublicRoutePage() {
  return containUnreviewedPublicRoute();
}
`;

const FORBIDDEN_GENERATED_PHRASES = [
  'Live Receipt Chain',
  'Live Network Data',
  '12,680',
  '84,795',
  '0 vulnerabilities',
  '22 SEED',
  'The seed is planted',
  'The proof is sealed',
  'demo@bizra.ai',
  'demo123',
] as const;

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

async function createBuildFixture(): Promise<string> {
  const fixtureRoot = await mkdtemp(
    join(tmpdir(), 'bizra-public-build-containment-')
  );
  temporaryPaths.push(fixtureRoot);

  const buildDirectory = join(fixtureRoot, '.next');
  await Promise.all([
    mkdir(join(buildDirectory, 'static'), { recursive: true }),
    mkdir(join(buildDirectory, 'server', 'app'), { recursive: true }),
  ]);
  return buildDirectory;
}

async function runChecker(buildDirectory: string) {
  try {
    const result = await execFileAsync(
      process.execPath,
      [CHECKER_PATH, '--build-dir', buildDirectory],
      { cwd: PROJECT_ROOT }
    );
    return { ...result, exitCode: 0 };
  } catch (error) {
    const result = error as Error & {
      code?: number;
      stderr?: string;
      stdout?: string;
    };
    return {
      exitCode: result.code ?? -1,
      stderr: result.stderr ?? '',
      stdout: result.stdout ?? '',
    };
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((path) =>
      rm(path, { force: true, recursive: true })
    )
  );
});

describe('public build containment', () => {
  it('redirects contained routes to the reviewed public root', async () => {
    await expect(
      readFile(
        resolve(PROJECT_ROOT, 'lib/public-claims/containment.ts'),
        'utf8'
      )
    ).resolves.toBe(CONTAINMENT_HELPER);
  });

  it('keeps every non-root page as the minimal server containment wrapper', async () => {
    const pageFiles = (await walkFiles(resolve(PROJECT_ROOT, 'app')))
      .map((file) => toPosix(relative(PROJECT_ROOT, file)))
      .filter(
        (file) => file.endsWith('/page.tsx') && file !== 'app/page.tsx'
      );

    expect(pageFiles.length).toBeGreaterThan(0);
    for (const pageFile of pageFiles) {
      await expect(
        readFile(resolve(PROJECT_ROOT, pageFile), 'utf8'),
        pageFile
      ).resolves.toBe(CONTAINMENT_WRAPPER);
    }
  });

  it('does not redirect short routes through legacy public files', async () => {
    const nextConfigSource = await readFile(
      resolve(PROJECT_ROOT, 'next.config.mjs'),
      'utf8'
    );

    expect(nextConfigSource).not.toMatch(
      /destination:\s*['"]\/(?:films|install)\/index\.html['"]/
    );
  });

  it('fails with every forbidden phrase found in generated public assets', async () => {
    const buildDirectory = await createBuildFixture();
    await Promise.all([
      writeFile(
        join(buildDirectory, 'static', 'legacy.js'),
        FORBIDDEN_GENERATED_PHRASES.slice(0, 5).join('\n')
      ),
      writeFile(
        join(buildDirectory, 'server', 'app', 'legacy.rsc'),
        FORBIDDEN_GENERATED_PHRASES.slice(5).join('\n')
      ),
    ]);

    const result = await runChecker(buildDirectory);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      'Forbidden public build phrases detected:'
    );
    for (const phrase of FORBIDDEN_GENERATED_PHRASES) {
      expect(result.stderr).toContain(phrase);
    }
  });

  it('fails closed when the build directory is absent', async () => {
    const fixtureRoot = await mkdtemp(
      join(tmpdir(), 'bizra-public-build-absent-')
    );
    temporaryPaths.push(fixtureRoot);

    const result = await runChecker(join(fixtureRoot, '.next'));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Build directory is absent:');
  });

  it('rejects symlinks instead of following them outside the build', async () => {
    const buildDirectory = await createBuildFixture();
    const externalFile = join(buildDirectory, '..', 'external.js');
    await writeFile(externalFile, 'Live Network Data');
    await symlink(externalFile, join(buildDirectory, 'static', 'linked.js'));

    const result = await runChecker(buildDirectory);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Symbolic link is not allowed:');
    expect(result.stderr).toContain('static/linked.js');
  });
});
