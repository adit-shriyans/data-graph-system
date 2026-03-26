"use client";

import { NODE_COLORS, NODE_LABELS } from "@/types";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { GraphNode, NodeType } from "@/types";

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NodeDetail({
  node,
  onClose,
}: {
  node: GraphNode;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const color = NODE_COLORS[node.type];
  const entries = Object.entries(node.metadata || {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  return (
    <div
      className={`absolute top-14 right-0 bottom-0 w-80 border-l overflow-auto z-20 shadow-xl ${
        isLight ? "bg-white border-zinc-200" : "bg-zinc-900 border-zinc-800"
      }`}
    >
      <div
        className={`sticky top-0 border-b p-3 flex items-center justify-between ${
          isLight ? "bg-white border-zinc-200" : "bg-zinc-900/95 border-zinc-800"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className={`text-sm font-medium ${isLight ? "text-zinc-800" : "text-zinc-200"}`}>
            {NODE_LABELS[node.type]}
          </span>
        </div>
        <button
          onClick={onClose}
          className={`transition-colors text-lg leading-none ${
            isLight ? "text-zinc-400 hover:text-zinc-700" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          &times;
        </button>
      </div>
      <div className="p-3">
        <h3 className={`text-base font-semibold mb-3 break-all ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>
          {node.label}
        </h3>
        {entries.length > 0 ? (
          <dl className="space-y-2">
            {entries.map(([key, val]) => (
              <div key={key}>
                <dt className="text-xs text-zinc-500">{formatKey(key)}</dt>
                <dd className={`text-sm break-all ${isLight ? "text-zinc-800" : "text-zinc-200"}`}>
                  {formatValue(val)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">
            Click to expand this node for full details.
          </p>
        )}
      </div>
    </div>
  );
}
