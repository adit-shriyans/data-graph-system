import type { NodeType } from "@/types";

/** Map physical tables to overview graph node types for query-path highlighting. */
const TABLE_TO_GRAPH_TYPE: Record<string, NodeType> = {
  business_partners: "Customer",
  business_partner_addresses: "Customer",
  customer_company_assignments: "Customer",
  customer_sales_area_assignments: "Customer",
  plants: "Plant",
  products: "Product",
  product_descriptions: "Product",
  product_plants: "Product",
  product_storage_locations: "Product",
  sales_order_headers: "SalesOrder",
  sales_order_items: "SalesOrder",
  sales_order_schedule_lines: "SalesOrder",
  outbound_delivery_headers: "Delivery",
  outbound_delivery_items: "Delivery",
  billing_document_headers: "BillingDocument",
  billing_document_items: "BillingDocument",
  billing_document_cancellations: "BillingDocument",
  journal_entry_items_ar: "JournalEntry",
  payments_ar: "Payment",
};

/**
 * Infer which overview entity types a SELECT touches from table names in SQL.
 * Merges with LLM "entities" so joins (e.g. deliveries + plants) highlight both nodes and their edge.
 */
export function inferGraphTypesFromSql(sql: string): NodeType[] {
  const types = new Set<NodeType>();
  const lower = sql.toLowerCase();
  for (const table of Object.keys(TABLE_TO_GRAPH_TYPE)) {
    if (new RegExp(`\\b${table}\\b`, "i").test(lower)) {
      types.add(TABLE_TO_GRAPH_TYPE[table]!);
    }
  }
  return Array.from(types);
}

const FORBIDDEN_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i,
  /\b(EXEC|EXECUTE|CALL)\b/i,
  /;\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)/i,
  /--/,
  /\/\*/,
];

export function validateSql(sql: string): { valid: boolean; reason?: string } {
  const trimmed = sql.trim();

  if (!trimmed.toUpperCase().startsWith("SELECT") && !trimmed.toUpperCase().startsWith("WITH")) {
    return { valid: false, reason: "Only SELECT queries are allowed" };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: `Forbidden SQL pattern detected: ${pattern}` };
    }
  }

  const semicolonCount = (trimmed.match(/;/g) || []).length;
  if (semicolonCount > 1) {
    return { valid: false, reason: "Multiple statements not allowed" };
  }

  return { valid: true };
}

export function isOffTopic(response: { relevant: boolean }): boolean {
  return !response.relevant;
}
