import { NextRequest, NextResponse } from "next/server";
import { processQuery } from "@/lib/llm";
import type { ChatRequest } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 },
    );
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 500 },
    );
  }

  try {
    const body: ChatRequest = await req.json();
    const { message, history } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const result = await processQuery(message, history || []);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
