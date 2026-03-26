"use client";

import { useState } from "react";
import GraphViewer from "@/components/graph/GraphViewer";
import ChatPanel from "@/components/chat/ChatPanel";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { NodeType } from "@/types";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [highlightedEntities, setHighlightedEntities] = useState<
    { type: NodeType; id: string }[]
  >([]);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <header
        className={`flex items-center justify-between px-4 py-2 border-b flex-shrink-0 ${
          theme === "light"
            ? "border-zinc-200 bg-white"
            : "border-zinc-800 bg-zinc-900/80 backdrop-blur-sm"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              SAP O2C Graph Explorer
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Order-to-Cash Data Visualization &amp; Query
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
                <path strokeWidth="1.8" strokeLinecap="round" d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" />
              </svg>
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={() => setChatCollapsed(!chatCollapsed)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              theme === "light"
                ? "bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            {chatCollapsed ? "Show Chat" : "Hide Chat"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <div
          className={`flex-1 min-w-0 ${
            chatCollapsed
              ? ""
              : theme === "light"
                ? "border-r border-zinc-200"
                : "border-r border-zinc-800"
          }`}
        >
          <GraphViewer
            highlightedEntities={highlightedEntities}
            onClearHighlights={() => setHighlightedEntities([])}
          />
        </div>

        {!chatCollapsed && (
          <div className="w-[400px] flex-shrink-0 h-full overflow-hidden">
            <ChatPanel onEntitiesHighlighted={setHighlightedEntities} />
          </div>
        )}
      </div>
    </div>
  );
}
