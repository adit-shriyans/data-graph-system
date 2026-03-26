"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useOverviewGraph, useExpandNode, useSearchNodes } from "@/hooks/useGraph";
import NodeDetail from "./NodeDetail";
import { NODE_COLORS, NODE_LABELS } from "@/types";
import type { NodeType, GraphNode } from "@/types";
import type { ForceGraphMethods } from "react-force-graph-2d";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface InternalNode {
  id: string;
  type: string;
  label: string;
  count?: number;
  metadata?: Record<string, unknown>;
  x?: number;
  y?: number;
  color?: string;
  val?: number;
}

interface InternalLink {
  source: string | InternalNode;
  target: string | InternalNode;
  relationship: string;
  count?: number;
}

const BASE_R = { overview: 5, explore: 4 };

export default function GraphViewer({
  highlightedEntities,
}: {
  highlightedEntities?: { type: NodeType; id: string }[];
}) {
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const needsZoomFitRef = useRef(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [mode, setMode] = useState<"overview" | "explore">("overview");
  const [selectedNode, setSelectedNode] = useState<InternalNode | null>(null);
  const hoveredNodeRef = useRef<InternalNode | null>(null);
  const [expandType, setExpandType] = useState<string | null>(null);
  const [expandId, setExpandId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [detailNode, setDetailNode] = useState<GraphNode | null>(null);

  const [exploreNodes, setExploreNodes] = useState<InternalNode[]>([]);
  const [exploreLinks, setExploreLinks] = useState<InternalLink[]>([]);

  const { data: overview, isLoading: overviewLoading } = useOverviewGraph();
  const { data: expanded } = useExpandNode(expandType, expandId);
  const { data: searchResults } = useSearchNodes(searchQuery);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(mode === "overview" ? -4500 : -40);
    fg.d3Force("link")?.distance(mode === "overview" ? 525 : 80);
    fg.d3ReheatSimulation();
    needsZoomFitRef.current = true;
  }, [mode, overviewLoading]);

  const highlightSet = useMemo(() => {
    const s = new Set<string>();
    highlightedEntities?.forEach((e) => s.add(e.id));
    return s;
  }, [highlightedEntities]);

  useEffect(() => {
    if (!highlightedEntities || highlightedEntities.length === 0) return;
    const first = highlightedEntities[0];
    setMode("explore");
    setExploreNodes([]);
    setExploreLinks([]);
    setExpandType(first.type);
    setExpandId(first.id);
    needsZoomFitRef.current = true;
  }, [highlightedEntities]);

  useEffect(() => {
    if (!expanded) return;
    setExploreNodes((prev) => {
      const existing = new Set(prev.map((n) => n.id));
      const newNodes = expanded.nodes
        .filter((n) => !existing.has(`${n.type}:${n.id}`))
        .map((n) => ({
          id: `${n.type}:${n.id}`,
          type: n.type,
          label: n.label,
          metadata: n.metadata,
          color: NODE_COLORS[n.type as NodeType],
          val: 1,
        }));
      return [...prev, ...newNodes];
    });
    setExploreLinks((prev) => {
      const existingLinks = new Set(prev.map((l) => {
        const s = typeof l.source === "string" ? l.source : l.source.id;
        const t = typeof l.target === "string" ? l.target : l.target.id;
        return `${s}->${t}:${l.relationship}`;
      }));
      const newLinks = expanded.links
        .map((l) => ({
          source: `${findNodeType(l.source, expanded.nodes)}:${l.source}`,
          target: `${findNodeType(l.target, expanded.nodes)}:${l.target}`,
          relationship: l.relationship,
        }))
        .filter((l) => !existingLinks.has(`${l.source}->${l.target}:${l.relationship}`));
      return [...prev, ...newLinks];
    });
    needsZoomFitRef.current = true;
  }, [expanded]);

  function findNodeType(id: string, nodes: GraphNode[]): string {
    const found = nodes.find((n) => n.id === id);
    return found?.type || "SalesOrder";
  }

  const overviewGraphData = useMemo(() => {
    if (!overview) return { nodes: [], links: [] };
    return {
      nodes: overview.nodes.map((n) => ({
        id: n.id,
        type: n.id,
        label: `${NODE_LABELS[n.id as NodeType] || n.id}\n(${n.count})`,
        count: n.count,
        color: NODE_COLORS[n.id as NodeType],
        val: 1,
      })),
      links: overview.links.map((l) => ({
        source: l.source,
        target: l.target,
        relationship: l.relationship,
        count: l.count,
      })),
    };
  }, [overview]);

  const graphData =
    mode === "overview"
      ? overviewGraphData
      : { nodes: exploreNodes, links: exploreLinks };

  const handleNodeClick = useCallback(
    (node: any) => {
      if (mode === "overview") {
        const type = node.id as NodeType;
        setMode("explore");
        setExploreNodes([]);
        setExploreLinks([]);
        setExpandType(null);
        setExpandId(null);

        fetch(`/api/graph?mode=samples&type=${encodeURIComponent(type)}`)
          .then((res) => res.json())
          .then((data: { nodes: GraphNode[] }) => {
            if (!data.nodes?.length) return;
            const internal: InternalNode[] = data.nodes.map((n) => ({
              id: `${n.type}:${n.id}`,
              type: n.type,
              label: n.label,
              metadata: n.metadata,
              color: NODE_COLORS[n.type as NodeType],
              val: 1,
            }));
            setExploreNodes(internal);
            setExpandType(data.nodes[0].type);
            setExpandId(data.nodes[0].id);
          })
          .catch(() => {});
        return;
      }

      setSelectedNode(node);
      const parts = (node.id as string).split(":");
      if (parts.length === 2) {
        setDetailNode({
          id: parts[1],
          type: parts[0] as NodeType,
          label: node.label,
          metadata: node.metadata || {},
        });
        setExpandType(parts[0]);
        setExpandId(parts[1]);
      }
    },
    [mode],
  );

  const handleSearch = () => {
    if (!searchInput.trim()) return;
    setSearchQuery(searchInput.trim());
  };

  const handleSearchSelect = (node: GraphNode) => {
    setMode("explore");
    setExploreNodes([]);
    setExploreLinks([]);
    setExpandType(node.type);
    setExpandId(node.id);
    setSearchQuery("");
    setSearchInput("");
  };

  const handleBackToOverview = () => {
    setMode("overview");
    setExploreNodes([]);
    setExploreLinks([]);
    setSelectedNode(null);
    setDetailNode(null);
    setExpandType(null);
    setExpandId(null);
    needsZoomFitRef.current = true;
  };

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.label || "";
      const isHighlighted = highlightSet.has(
        node.id?.toString().split(":")?.[1] || "",
      );
      const isHovered = hoveredNodeRef.current?.id === node.id;
      const nodeColor = node.color || "#6b7280";
      const r = (mode === "overview" ? BASE_R.overview : BASE_R.explore) / globalScale;

      ctx.beginPath();
      ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? "#ffffff" : nodeColor;
      ctx.fill();

      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, r + 4 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, r + 6 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(250, 204, 21, 0.3)";
        ctx.lineWidth = 3 / globalScale;
        ctx.stroke();
      } else if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, r + 2 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 0.8 / globalScale;
        ctx.stroke();
      }

      const fontSize = mode === "overview"
        ? Math.max(3.5, 10 / globalScale)
        : Math.max(2.5, 9 / globalScale);
      ctx.font = `${mode === "overview" ? "600 " : ""}${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#d4d4d8";

      const lines = label.split("\n");
      lines.forEach((line: string, i: number) => {
        ctx.fillText(
          line,
          node.x!,
          node.y! + r + 2 / globalScale + i * (fontSize + 0.5),
        );
      });
    },
    [highlightSet, mode],
  );

  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const start = link.source;
      const end = link.target;
      if (!start?.x || !end?.x) return;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = "rgba(168, 185, 204, 0.7)";
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;
      const r = (mode === "overview" ? BASE_R.overview : BASE_R.explore) / globalScale;
      const arrowLen = Math.max(2, 4 / globalScale);
      const tipX = end.x - (dx / len) * (r + 1 / globalScale);
      const tipY = end.y - (dy / len) * (r + 1 / globalScale);
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        tipX - arrowLen * Math.cos(angle - Math.PI / 7),
        tipY - arrowLen * Math.sin(angle - Math.PI / 7),
      );
      ctx.lineTo(
        tipX - arrowLen * Math.cos(angle + Math.PI / 7),
        tipY - arrowLen * Math.sin(angle + Math.PI / 7),
      );
      ctx.closePath();
      ctx.fillStyle = "rgba(168, 185, 204, 0.8)";
      ctx.fill();

      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const fontSize = mode === "overview"
        ? Math.max(2.5, 8 / globalScale)
        : Math.max(2, 7 / globalScale);
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = mode === "overview"
        ? "rgba(168, 185, 204, 0.75)"
        : "rgba(168, 185, 204, 0.55)";
      ctx.fillText(link.relationship || "", midX, midY - 2 / globalScale);
    },
    [mode],
  );

  const handleEngineStop = useCallback(() => {
    if (needsZoomFitRef.current) {
      needsZoomFitRef.current = false;
      graphRef.current?.zoomToFit(400, 60);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative">
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm z-10">
        {mode === "explore" && (
          <button
            onClick={handleBackToOverview}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 transition-colors"
          >
            Back to Overview
          </button>
        )}
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search entities (ID, name)..."
            className="flex-1 px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors"
          >
            Search
          </button>
          <button
            onClick={() => {
              handleBackToOverview();
              needsZoomFitRef.current = true;
              graphRef.current?.d3ReheatSimulation();
            }}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 transition-colors"
            title="Reset graph to overview"
          >
            Reset
          </button>
        </div>
        <span className="text-xs text-zinc-500">
          {mode === "overview" ? "Overview" : "Explore"} |{" "}
          {graphData.nodes.length} nodes
        </span>
      </div>

      {searchQuery &&
        searchResults?.nodes &&
        searchResults.nodes.length > 0 && (
          <div className="absolute top-14 left-3 right-3 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-auto">
            {searchResults.nodes.map((node) => (
              <button
                key={`${node.type}:${node.id}`}
                onClick={() => handleSearchSelect(node)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 text-left transition-colors"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: NODE_COLORS[node.type] }}
                />
                <span className="text-sm text-zinc-200 truncate">
                  {node.label}
                </span>
                <span className="text-xs text-zinc-500 ml-auto flex-shrink-0">
                  {NODE_LABELS[node.type]}
                </span>
              </button>
            ))}
          </div>
        )}

      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {overviewLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-zinc-400 text-sm">Loading graph...</div>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={(node: any, color, ctx, globalScale) => {
              const hitR = ((mode === "overview" ? BASE_R.overview : BASE_R.explore) + 2) / globalScale;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x!, node.y!, hitR, 0, 2 * Math.PI);
              ctx.fill();
            }}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={handleNodeClick}
            onNodeHover={(node: any) => { hoveredNodeRef.current = node || null; }}
            onEngineStop={handleEngineStop}
            nodeId="id"
            backgroundColor="#09090b"
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            cooldownTicks={200}
            warmupTicks={100}
            minZoom={0.3}
            maxZoom={12}
          />
        )}
      </div>

      {detailNode && (
        <NodeDetail node={detailNode} onClose={() => setDetailNode(null)} />
      )}

      {mode === "overview" && (
        <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-3">
          <div className="text-xs font-medium text-zinc-400 mb-2">
            Entity Types
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-zinc-400">
                  {NODE_LABELS[type as NodeType]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
