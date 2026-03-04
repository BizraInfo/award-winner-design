import fs from "fs/promises";

import { resolveScaffoldPath } from "@/lib/scaffold/paths";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = resolveScaffoldPath("BIZRA_Genesis_Seal.ipynb");
    const contents = await fs.readFile(filePath);

    return new Response(contents, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ipynb+json; charset=utf-8",
        "Content-Disposition": 'inline; filename="BIZRA_Genesis_Seal.ipynb"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to load Genesis Seal notebook:", error);
    return new Response("Not found", { status: 404 });
  }
}
