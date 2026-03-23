import crypto from "crypto";
import fs from "fs/promises";

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
  const sourcePath = resolveScaffoldPath("evidence", "metrics", "latest.json");
  const contents = await fs.readFile(sourcePath, "utf-8");
  return {
    sourcePath,
    sourceHash: sha256(contents),
    payload: JSON.parse(contents),
  };
}
