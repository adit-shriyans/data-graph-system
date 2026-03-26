"use client";

import { useQuery } from "@tanstack/react-query";
import type { OverviewGraphData, GraphData, GraphNode } from "@/types";

export function useOverviewGraph() {
  return useQuery<OverviewGraphData>({
    queryKey: ["graph", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/graph?mode=overview");
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
  });
}

export function useSearchNodes(query: string) {
  return useQuery<{ nodes: GraphNode[] }>({
    queryKey: ["graph", "search", query],
    queryFn: async () => {
      const res = await fetch(
        `/api/graph?mode=search&q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.length >= 2,
  });
}

export function useExpandNode(type: string | null, id: string | null) {
  return useQuery<GraphData>({
    queryKey: ["graph", "expand", type, id],
    queryFn: async () => {
      const res = await fetch(
        `/api/graph/expand?type=${encodeURIComponent(type!)}&id=${encodeURIComponent(id!)}`,
      );
      if (!res.ok) throw new Error("Expand failed");
      return res.json();
    },
    enabled: !!type && !!id,
  });
}
