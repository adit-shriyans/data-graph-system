import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getOverview, searchNodes, getSamplesByType } from "@/lib/graph-builder";
import type { NodeType } from "@/types";

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "overview";

  try {
    if (mode === "overview") {
      const data = await getOverview(sql);
      return NextResponse.json(data);
    }

    if (mode === "search") {
      const q = searchParams.get("q") || "";
      if (!q) return NextResponse.json({ nodes: [] });
      const nodes = await searchNodes(sql, q);
      return NextResponse.json({ nodes });
    }

    if (mode === "samples") {
      const type = searchParams.get("type") as NodeType;
      if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
      const nodes = await getSamplesByType(sql, type);
      return NextResponse.json({ nodes });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
