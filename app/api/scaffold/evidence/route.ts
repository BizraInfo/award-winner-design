import { NextResponse } from "next/server";

import {
  getGenesisSealInfo,
  loadEvidenceIndex,
  verifyEvidenceEntries,
} from "@/lib/scaffold/evidence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const verify = url.searchParams.get("verify") === "true";

    const { indexPath, indexHash, entries } = await loadEvidenceIndex();
    const genesisSeal = await getGenesisSealInfo();

    if (!verify) {
      return NextResponse.json({
        source: indexPath,
        indexHash,
        count: entries.length,
        entries,
        genesisSeal,
      });
    }

    const verification = await verifyEvidenceEntries(entries);
    const verifiedAt = new Date().toISOString();

    const entriesWithVerification = entries.map((entry, index) => ({
      ...entry,
      verification: verification[index],
    }));

    return NextResponse.json({
      source: indexPath,
      indexHash,
      count: entries.length,
      entries: entriesWithVerification,
      genesisSeal,
      verifiedAt,
    });
  } catch (error) {
    console.error("Failed to load scaffold evidence:", error);
    return NextResponse.json(
      { error: "Unable to load scaffold evidence index" },
      { status: 500 },
    );
  }
}
