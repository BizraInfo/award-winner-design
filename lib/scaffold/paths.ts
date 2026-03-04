import path from "path";

const SCAFFOLD_RELATIVE_PATH = ["external", "bizra_scaffold"];

export function getScaffoldRoot(): string {
  return path.join(process.cwd(), ...SCAFFOLD_RELATIVE_PATH);
}

export function resolveScaffoldPath(...segments: string[]): string {
  return path.join(getScaffoldRoot(), ...segments);
}
