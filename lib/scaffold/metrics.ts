import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { resolveScaffoldPath } from "./paths";

export interface ScaffoldMetricsPayload {
  sourcePath: string;
  sourceHash: string;
  payload: unknown;
}

function sha256(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function loadScaffoldMetrics(): Promise<ScaffoldMetricsPayload> {
  const publicPath = path.join(process.cwd(), "public", "data", "metrics.json");
  const scaffoldPath = resolveScaffoldPath("evidence", "metrics", "latest.json");

  let sourcePath = scaffoldPath;
  let contents: string;

  try {
    contents = await fs.readFile(publicPath, "utf-8");
    sourcePath = publicPath;
  } catch {
    contents = await fs.readFile(scaffoldPath, "utf-8");
  }

  return {
    sourcePath,
    sourceHash: sha256(contents),
    payload: JSON.parse(contents),
  };
}
