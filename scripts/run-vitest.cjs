/* eslint-disable @typescript-eslint/no-require-imports */
/* global require, process, __dirname */
const { spawn } = require('child_process');
const path = require('path');

process.env.VITE_CJS_IGNORE_WARNING =
  process.env.VITE_CJS_IGNORE_WARNING || '1';

const vitestBin = path.join(
  __dirname,
  '..',
  'node_modules',
  'vitest',
  'vitest.mjs'
);

const child = spawn(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
