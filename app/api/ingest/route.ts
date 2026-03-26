import { NextResponse } from "next/server";
import path from "path";
import { ingestAll } from "@/lib/ingest";

export const maxDuration = 300;

export async function POST() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
  }

  try {
    const dataDir = path.join(process.cwd(), "sap-o2c-data");
    const results = await ingestAll(dbUrl, dataDir);
    const totalRows = Object.values(results).reduce((a, b) => a + b, 0);
    return NextResponse.json({ success: true, totalRows, details: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
