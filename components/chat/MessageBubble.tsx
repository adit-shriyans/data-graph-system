"use client";

import { useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { ChatMessage, NodeType } from "@/types";
import { NODE_COLORS, NODE_LABELS } from "@/types";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [showSql, setShowSql] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : isLight
              ? "bg-white text-zinc-800 border border-zinc-200"
              : "bg-zinc-800 text-zinc-200 border border-zinc-700"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          <FormattedContent content={message.content} isLight={isLight} />
        </div>

        {message.sql && (
          <div className={`mt-2 pt-2 border-t ${isLight ? "border-zinc-300/80" : "border-zinc-600/50"}`}>
            <button
              onClick={() => setShowSql(!showSql)}
              className={`text-xs transition-colors flex items-center gap-1 ${
                isLight ? "text-zinc-500 hover:text-zinc-800" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <svg
                className={`w-3 h-3 transition-transform ${showSql ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              SQL Query
            </button>
            {showSql && (
              <pre
                className={`mt-2 p-2 border rounded-md text-xs overflow-x-auto font-mono ${
                  isLight
                    ? "bg-white border-zinc-200 text-emerald-700"
                    : "bg-zinc-900 border-transparent text-emerald-400"
                }`}
              >
                {message.sql}
              </pre>
            )}
          </div>
        )}

        {message.entities && message.entities.length > 0 && (
          <div className={`mt-2 pt-2 border-t ${isLight ? "border-zinc-300/80" : "border-zinc-600/50"}`}>
            <div className={`text-xs mb-1.5 font-medium ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>Referenced entities</div>
            <div className="flex flex-wrap gap-1.5">
              {message.entities.slice(0, 12).map((e, i) => {
                const color = NODE_COLORS[e.type as NodeType] || "#6b7280";
                const label = NODE_LABELS[e.type as NodeType] || e.type;
                const scopeOnly = e.id === "__query_scope__";
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                    style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span style={{ color }}>{label}</span>
                    {!scopeOnly && <span className={isLight ? "text-zinc-500" : "text-zinc-400"}>{e.id}</span>}
                    {scopeOnly && (
                      <span className={`${isLight ? "text-zinc-500" : "text-zinc-400"} italic`}>(in query)</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormattedContent({ content, isLight }: { content: string; isLight: boolean }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const code = part.replace(/```\w*\n?/g, "").replace(/```$/g, "");
          return (
            <pre
              key={i}
              className={`my-2 p-2 border rounded-md text-xs overflow-x-auto font-mono ${
                isLight
                  ? "bg-white border-zinc-200 text-emerald-700"
                  : "bg-zinc-900 border-transparent text-emerald-400"
              }`}
            >
              {code}
            </pre>
          );
        }

        return (
          <MarkdownText key={i} text={part} isLight={isLight} />
        );
      })}
    </>
  );
}

function MarkdownText({ text, isLight }: { text: string; isLight: boolean }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];
    const isTableHeader = isTableRow(line) && isSeparatorRow(next);

    if (isTableHeader) {
      const tableLines = [line];
      i += 2; // Skip header + separator
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      blocks.push(
        <MarkdownTable
          key={`table-${i}-${tableLines.length}`}
          lines={tableLines}
          isLight={isLight}
        />,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i];
      const upcoming = lines[i + 1];
      if (isTableRow(current) && isSeparatorRow(upcoming)) break;
      paragraphLines.push(current);
      i += 1;
    }

    const paragraph = paragraphLines.join("\n");
    if (paragraph.trim().length > 0) {
      const formatted = paragraph
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(
          /`(.*?)`/g,
          `<code class="${isLight ? "bg-zinc-200" : "bg-zinc-700"} px-1 rounded text-xs">$1</code>`,
        )
        .replace(/\n/g, "<br/>");

      blocks.push(
        <span
          key={`text-${i}-${paragraph.length}`}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />,
      );
    }
  }

  return <>{blocks}</>;
}

function MarkdownTable({ lines, isLight }: { lines: string[]; isLight: boolean }) {
  const rows = lines.map(parseTableRow).filter((row) => row.length > 0);
  if (rows.length === 0) return null;

  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div className="my-2 overflow-x-auto">
      <table className={`min-w-full text-xs border rounded-md ${isLight ? "border-zinc-200" : "border-zinc-700"}`}>
        <thead>
          <tr className={isLight ? "bg-zinc-50" : "bg-zinc-900"}>
            {header.map((cell, idx) => (
              <th
                key={`h-${idx}`}
                className={`px-2 py-1.5 text-left font-semibold border-b whitespace-nowrap ${
                  isLight ? "text-zinc-700 border-zinc-200" : "text-zinc-200 border-zinc-700"
                }`}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIdx) => (
            <tr key={`r-${rowIdx}`} className={isLight ? "odd:bg-white even:bg-zinc-50/60" : "odd:bg-zinc-800 even:bg-zinc-800/70"}>
              {row.map((cell, cellIdx) => (
                <td
                  key={`c-${rowIdx}-${cellIdx}`}
                  className={`px-2 py-1.5 border-t align-top ${
                    isLight ? "text-zinc-700 border-zinc-200" : "text-zinc-300 border-zinc-700"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isTableRow(line?: string) {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isSeparatorRow(line?: string) {
  if (!line) return false;
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}
