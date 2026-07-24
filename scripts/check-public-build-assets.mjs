#!/usr/bin/env node
/* eslint-disable no-console */
/* global Buffer, console, process */

import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

const FORBIDDEN_PHRASES = [
  'Live Receipt Chain',
  'Live Network Data',
  '12,680',
  '84,795',
  '0 vulnerabilities',
  '22 SEED',
  'The seed is planted',
  'The proof is sealed',
  'Demo Credentials',
  'demo credentials',
  'demo@bizra.ai',
  'demo123',
];

function parseBuildDirectory(argumentsList) {
  if (argumentsList.length === 0) {
    return resolve(process.cwd(), '.next');
  }

  if (
    argumentsList.length === 2 &&
    argumentsList[0] === '--build-dir' &&
    argumentsList[1].length > 0
  ) {
    return resolve(process.cwd(), argumentsList[1]);
  }

  throw new Error(
    'Usage: node scripts/check-public-build-assets.mjs [--build-dir <path>]'
  );
}

function toPosix(pathname) {
  return pathname.split(sep).join('/');
}

function displayPath(buildDirectory, targetPath) {
  return toPosix(relative(buildDirectory, targetPath)) || '.';
}

function assertContained(buildDirectory, targetPath) {
  const relativePath = relative(buildDirectory, targetPath);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Scan target escapes build directory: ${targetPath}`);
  }
}

async function requireDirectory(pathname, absentMessage) {
  let stats;
  try {
    stats = await lstat(pathname);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`${absentMessage}: ${pathname}`);
    }
    throw error;
  }

  if (stats.isSymbolicLink()) {
    throw new Error(`Symbolic link is not allowed: ${pathname}`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`Expected directory: ${pathname}`);
  }
}

async function walkFiles(buildDirectory, directory) {
  assertContained(buildDirectory, directory);
  await requireDirectory(
    directory,
    'Required build scan directory is absent'
  );

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    const targetPath = join(directory, entry.name);
    assertContained(buildDirectory, targetPath);
    const stats = await lstat(targetPath);

    if (stats.isSymbolicLink()) {
      throw new Error(
        `Symbolic link is not allowed: ${displayPath(
          buildDirectory,
          targetPath
        )}`
      );
    }
    if (stats.isDirectory()) {
      files.push(...(await walkFiles(buildDirectory, targetPath)));
      continue;
    }
    if (stats.isFile()) {
      files.push(targetPath);
      continue;
    }

    throw new Error(
      `Unsupported build entry: ${displayPath(buildDirectory, targetPath)}`
    );
  }

  return files;
}

async function checkPublicBuildAssets(buildDirectory) {
  await requireDirectory(buildDirectory, 'Build directory is absent');

  const resolvedBuildDirectory = await realpath(buildDirectory);
  if (resolvedBuildDirectory !== buildDirectory) {
    throw new Error(
      `Build directory resolves through a symbolic link: ${buildDirectory}`
    );
  }

  const scanDirectories = [
    join(buildDirectory, 'static'),
    join(buildDirectory, 'server', 'app'),
  ];
  const files = (
    await Promise.all(
      scanDirectories.map((directory) =>
        walkFiles(buildDirectory, directory)
      )
    )
  )
    .flat()
    .sort((left, right) => left.localeCompare(right));
  const hits = [];

  for (const file of files) {
    const contents = await readFile(file);
    for (const phrase of FORBIDDEN_PHRASES) {
      if (contents.includes(Buffer.from(phrase))) {
        hits.push({
          file: displayPath(buildDirectory, file),
          phrase,
        });
      }
    }
  }

  if (hits.length > 0) {
    throw new Error(
      `Forbidden public build phrases detected:\n${hits
        .map(({ file, phrase }) => `- ${file}: ${JSON.stringify(phrase)}`)
        .join('\n')}`
    );
  }

  return files.length;
}

try {
  const buildDirectory = parseBuildDirectory(process.argv.slice(2));
  const scannedFileCount = await checkPublicBuildAssets(buildDirectory);
  console.log(
    `Public build asset check passed (${scannedFileCount} files scanned).`
  );
} catch (error) {
  console.error(`Public build asset check failed: ${error.message}`);
  process.exitCode = 1;
}
