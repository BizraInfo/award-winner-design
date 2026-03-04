"use strict";

/**
 * Playwright helper to run the Next.js standalone output on a custom port
 * while ensuring static/public assets are available.
 */
const { cpSync, existsSync, mkdirSync, rmSync } = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const port = process.env.E2E_PORT || process.env.PORT || "3100";

// Make static assets available to the standalone server
const sourceStatic = path.join(root, ".next", "static");
const targetStatic = path.join(root, ".next", "standalone", ".next", "static");

if (existsSync(sourceStatic)) {
  rmSync(targetStatic, { recursive: true, force: true });
  mkdirSync(targetStatic, { recursive: true });
  cpSync(sourceStatic, targetStatic, { recursive: true });
}

// Make public assets available (e.g., icons, SVGs)
const sourcePublic = path.join(root, "public");
const targetPublic = path.join(root, ".next", "standalone", "public");
if (existsSync(sourcePublic)) {
  rmSync(targetPublic, { recursive: true, force: true });
  mkdirSync(targetPublic, { recursive: true });
  cpSync(sourcePublic, targetPublic, { recursive: true });
}

process.env.PORT = port;
process.env.HOSTNAME = process.env.HOSTNAME || "localhost";

require(path.join(root, ".next", "standalone", "server.js"));
