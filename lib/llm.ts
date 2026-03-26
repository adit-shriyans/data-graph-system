import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT, FORMAT_PROMPT } from "./prompts";
import { validateSql, isOffTopic, inferGraphTypesFromSql } from "./guardrails";
import { rawQuery } from "./db";
import type { ChatResponse, NodeType } from "@/types";

function getModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

export async function processQuery(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<ChatResponse> {
  const model = getModel();

  const historyContext = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const sqlGenPrompt = `${SYSTEM_PROMPT}

${historyContext ? `CONVERSATION HISTORY:\n${historyContext}\n` : ""}
USER QUESTION: ${message}`;

  const sqlResult = await model.generateContent(sqlGenPrompt);
  const sqlResponseText = cleanJsonResponse(sqlResult.response.text());

  let sqlResponse: { relevant: boolean; sql?: string; explanation?: string; answer?: string };
  try {
    sqlResponse = JSON.parse(sqlResponseText);
  } catch {
    return {
      answer: "I had trouble understanding that request. Could you rephrase your question about the SAP O2C data?",
      error: "Failed to parse LLM response",
    };
  }

  if (isOffTopic(sqlResponse)) {
    return {
      answer: sqlResponse.answer || "This system is designed to answer questions related to the SAP Order-to-Cash dataset only.",
    };
  }

  if (!sqlResponse.sql) {
    return {
      answer: sqlResponse.answer || "I couldn't generate a query for that question. Please try rephrasing.",
    };
  }

  const validation = validateSql(sqlResponse.sql);
  if (!validation.valid) {
    return {
      answer: "I generated an unsafe query and blocked it for security. Please try a different question.",
      error: validation.reason,
    };
  }

  let queryResults: Record<string, unknown>[];
  try {
    queryResults = await rawQuery(sqlResponse.sql);
  } catch (dbErr) {
    const dbMessage = dbErr instanceof Error ? dbErr.message : "Unknown DB error";
    return {
      answer: `I generated a query but it failed to execute. Let me try to help differently. Error: ${dbMessage}`,
      sql: sqlResponse.sql,
      error: dbMessage,
    };
  }

  const formatPrompt = `${FORMAT_PROMPT}

USER QUESTION: ${message}
SQL QUERY: ${sqlResponse.sql}
QUERY EXPLANATION: ${sqlResponse.explanation || ""}
RESULTS (${queryResults.length} rows):
${JSON.stringify(queryResults.slice(0, 50), null, 2)}`;

  const formatResult = await model.generateContent(formatPrompt);
  const formatText = cleanJsonResponse(formatResult.response.text());

  let formatted: { answer: string; entities?: { type: NodeType; id: string }[] };
  try {
    formatted = JSON.parse(formatText);
  } catch {
    formatted = {
      answer: `Query returned ${queryResults.length} row(s). Here are the results:\n\n\`\`\`json\n${JSON.stringify(queryResults.slice(0, 10), null, 2)}\n\`\`\``,
    };
  }

  const fromSql = inferGraphTypesFromSql(sqlResponse.sql);
  const merged: { type: NodeType; id: string }[] = [...(formatted.entities || [])];
  const seenTypes = new Set(merged.map((e) => e.type));
  for (const t of fromSql) {
    if (!seenTypes.has(t)) {
      merged.push({ type: t, id: "__query_scope__" });
      seenTypes.add(t);
    }
  }

  return {
    answer: formatted.answer,
    sql: sqlResponse.sql,
    entities: merged.length > 0 ? merged : undefined,
  };
}
