"use client";

import { useState } from "react";
import type { ChatMessage, NodeType } from "@/types";
import { NODE_COLORS, NODE_LABELS } from "@/types";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const [showSql, setShowSql] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-200 border border-zinc-700"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          <FormattedContent content={message.content} />
        </div>

        {message.sql && (
          <div className="mt-2 pt-2 border-t border-zinc-600/50">
            <button
              onClick={() => setShowSql(!showSql)}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
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
              <pre className="mt-2 p-2 bg-zinc-900 rounded-md text-xs text-emerald-400 overflow-x-auto font-mono">
                {message.sql}
              </pre>
            )}
          </div>
        )}

        {message.entities && message.entities.length > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-600/50">
            <div className="text-xs text-zinc-400 mb-1.5 font-medium">Referenced entities</div>
            <div className="flex flex-wrap gap-1.5">
              {message.entities.slice(0, 12).map((e, i) => {
                const color = NODE_COLORS[e.type as NodeType] || "#6b7280";
                const label = NODE_LABELS[e.type as NodeType] || e.type;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                    style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span style={{ color }}>{label}</span>
                    <span className="text-zinc-400">{e.id}</span>
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

function FormattedContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```|\|.*\|)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const code = part.replace(/```\w*\n?/g, "").replace(/```$/g, "");
          return (
            <pre
              key={i}
              className="my-2 p-2 bg-zinc-900 rounded-md text-xs overflow-x-auto font-mono text-emerald-400"
            >
              {code}
            </pre>
          );
        }

        const formatted = part
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/`(.*?)`/g, '<code class="bg-zinc-700 px-1 rounded text-xs">$1</code>');

        return (
          <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      })}
    </>
  );
}
