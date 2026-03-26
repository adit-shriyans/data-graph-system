"use client";

import { useState } from "react";
import GraphViewer from "@/components/graph/GraphViewer";
import ChatPanel from "@/components/chat/ChatPanel";
import type { NodeType } from "@/types";

export default function Home() {
  const [highlightedEntities, setHighlightedEntities] = useState<
    { type: NodeType; id: string }[]
  >([]);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex-shrink-0">
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
            <h1 className="text-sm font-semibold text-zinc-100">
              SAP O2C Graph Explorer
            </h1>
            <p className="text-xs text-zinc-500">
              Order-to-Cash Data Visualization &amp; Query
            </p>
          </div>
        </div>
        <button
          onClick={() => setChatCollapsed(!chatCollapsed)}
          className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 transition-colors"
        >
          {chatCollapsed ? "Show Chat" : "Hide Chat"}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <div
          className={`flex-1 min-w-0 ${chatCollapsed ? "" : "border-r border-zinc-800"}`}
        >
          <GraphViewer highlightedEntities={highlightedEntities} />
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
