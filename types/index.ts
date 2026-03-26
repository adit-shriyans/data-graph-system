export type NodeType =
  | "SalesOrder"
  | "Delivery"
  | "BillingDocument"
  | "Customer"
  | "Product"
  | "Plant"
  | "JournalEntry"
  | "Payment";

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface OverviewNode {
  id: NodeType;
  type: "overview";
  label: string;
  count: number;
}

export interface OverviewEdge {
  source: NodeType;
  target: NodeType;
  relationship: string;
  count: number;
}

export interface OverviewGraphData {
  nodes: OverviewNode[];
  links: OverviewEdge[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  entities?: { type: NodeType; id: string }[];
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
}

export interface ChatResponse {
  answer: string;
  sql?: string;
  entities?: { type: NodeType; id: string }[];
  error?: string;
}

export const NODE_COLORS: Record<NodeType, string> = {
  SalesOrder: "#3b82f6",
  Delivery: "#10b981",
  BillingDocument: "#f59e0b",
  Customer: "#8b5cf6",
  Product: "#ec4899",
  Plant: "#06b6d4",
  JournalEntry: "#f97316",
  Payment: "#14b8a6",
};

export const NODE_LABELS: Record<NodeType, string> = {
  SalesOrder: "Sales Order",
  Delivery: "Delivery",
  BillingDocument: "Billing Doc",
  Customer: "Customer",
  Product: "Product",
  Plant: "Plant",
  JournalEntry: "Journal Entry",
  Payment: "Payment",
};
