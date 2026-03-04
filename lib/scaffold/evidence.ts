import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { resolveScaffoldPath } from "./paths";

const INDEX_FILE = "EVIDENCE_INDEX.md";

export interface EvidenceEntry {
  id: string;
  claim: string;
  source: string;
  artifact: string;
  status: string;
  notes: string;
}

export interface EvidenceVerification {
  resolvedPath: string | null;
  exists: boolean;
  fileHash?: string;
  snippetHash?: string;
  snippetRange?: { start: number; end: number };
}

export interface EvidenceIndex {
  indexPath: string;
  indexHash: string;
  entries: EvidenceEntry[];
}

export interface GenesisSealInfo {
  url: string;
  exists: boolean;
  sizeBytes?: number;
  modifiedAt?: string;
}

const ROW_PATTERN =
  /^\|\s*(EVID-\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/;

const FILE_PATTERN =
  /([A-Za-z0-9_./@-]+\.(?:md|py|rs|yml|yaml|toml|json|xml|txt))/;

function sha256(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeCell(value: string): string {
  return value.trim().replace(/^`|`$/g, "");
}

function extractLineRange(text: string): { start: number; end: number } | null {
  const match = text.match(/#L(\d+)(?:-L(\d+))?/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start, end };
}

function extractFileReference(text: string): string | null {
  const cleaned = normalizeCell(text);
  const match = cleaned.match(FILE_PATTERN);
  if (!match) return null;
  let fileRef = match[1].replace(/\\/g, "/");
  const atIndex = fileRef.indexOf("@");
  if (atIndex !== -1) {
    const slashIndex = fileRef.indexOf("/", atIndex);
    if (slashIndex !== -1) {
      fileRef = fileRef.slice(slashIndex + 1);
    }
  }
  return fileRef;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadEvidenceIndex(): Promise<EvidenceIndex> {
  const indexPath = resolveScaffoldPath(INDEX_FILE);
  const contents = await fs.readFile(indexPath, "utf-8");
  const entries: EvidenceEntry[] = [];

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("| EVID-")) continue;
    const match = trimmed.match(ROW_PATTERN);
    if (!match) continue;

    entries.push({
      id: normalizeCell(match[1]),
      claim: normalizeCell(match[2]),
      source: normalizeCell(match[3]),
      artifact: normalizeCell(match[4]),
      status: normalizeCell(match[5]),
      notes: normalizeCell(match[6]),
    });
  }

  return {
    indexPath,
    indexHash: sha256(contents),
    entries,
  };
}

export async function verifyEvidenceEntries(
  entries: EvidenceEntry[],
): Promise<EvidenceVerification[]> {
  const scaffoldRoot = resolveScaffoldPath();
  const results: EvidenceVerification[] = [];

  for (const entry of entries) {
    const sourcePath = extractFileReference(entry.source);
    const artifactPath = extractFileReference(entry.artifact);
    const candidate = sourcePath || artifactPath;
    const lineRange = extractLineRange(entry.artifact) || extractLineRange(entry.source);

    if (!candidate) {
      results.push({ resolvedPath: null, exists: false });
      continue;
    }

    const resolvedPath = path.join(scaffoldRoot, candidate);
    const fileExists = await exists(resolvedPath);
    if (!fileExists) {
      results.push({ resolvedPath, exists: false });
      continue;
    }

    const fileContents = await fs.readFile(resolvedPath, "utf-8");
    const fileHash = sha256(fileContents);
    let snippetHash: string | undefined;
    let snippetRange: EvidenceVerification["snippetRange"];

    if (lineRange) {
      const lines = fileContents.split(/\r?\n/);
      const startIndex = Math.max(0, lineRange.start - 1);
      const endIndex = Math.min(lines.length - 1, lineRange.end - 1);
      const snippet = lines.slice(startIndex, endIndex + 1).join("\n");
      snippetHash = sha256(snippet);
      snippetRange = { start: lineRange.start, end: lineRange.end };
    }

    results.push({
      resolvedPath,
      exists: true,
      fileHash,
      snippetHash,
      snippetRange,
    });
  }

  return results;
}

export async function getGenesisSealInfo(): Promise<GenesisSealInfo> {
  const filePath = resolveScaffoldPath("BIZRA_Genesis_Seal.ipynb");
  const fileExists = await exists(filePath);

  if (!fileExists) {
    return { url: "/api/scaffold/genesis-seal", exists: false };
  }

  const stats = await fs.stat(filePath);
  return {
    url: "/api/scaffold/genesis-seal",
    exists: true,
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}
