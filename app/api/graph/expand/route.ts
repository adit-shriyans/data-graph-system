import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { exploreNode } from "@/lib/graph-builder";
import type { NodeType } from "@/types";

const VALID_TYPES: NodeType[] = [
  "SalesOrder", "Delivery", "BillingDocument", "Customer",
  "Product", "Plant", "JournalEntry", "Payment",
];

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as NodeType;
  const id = searchParams.get("id");

  if (!type || !id || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Provide valid type and id query params" },
      { status: 400 },
    );
  }

  try {
    const data = await exploreNode(sql, type, id);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
