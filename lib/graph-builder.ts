import type { Sql } from "./db";
import type { GraphNode, GraphEdge, NodeType } from "@/types";

export async function getOverview(sql: Sql) {
  const counts = await sql`
    SELECT 'SalesOrder' AS type, COUNT(*)::int AS count FROM sales_order_headers
    UNION ALL SELECT 'Delivery', COUNT(*)::int FROM outbound_delivery_headers
    UNION ALL SELECT 'BillingDocument', COUNT(*)::int FROM billing_document_headers
    UNION ALL SELECT 'Customer', COUNT(*)::int FROM business_partners
    UNION ALL SELECT 'Product', COUNT(*)::int FROM products
    UNION ALL SELECT 'Plant', COUNT(*)::int FROM plants
    UNION ALL SELECT 'JournalEntry', COUNT(*)::int FROM journal_entry_items_ar
    UNION ALL SELECT 'Payment', COUNT(*)::int FROM payments_ar
  `;

  const edgeCounts = await sql`
    SELECT 'SalesOrder' AS source, 'Customer' AS target, 'sold_to' AS rel, COUNT(DISTINCT sold_to_party)::int AS count FROM sales_order_headers WHERE sold_to_party IS NOT NULL
    UNION ALL SELECT 'SalesOrder', 'Product', 'contains', COUNT(DISTINCT material)::int FROM sales_order_items WHERE material IS NOT NULL
    UNION ALL SELECT 'Delivery', 'SalesOrder', 'fulfills', COUNT(DISTINCT reference_sd_document)::int FROM outbound_delivery_items WHERE reference_sd_document IS NOT NULL
    UNION ALL SELECT 'BillingDocument', 'Customer', 'billed_to', COUNT(DISTINCT sold_to_party)::int FROM billing_document_headers WHERE sold_to_party IS NOT NULL
    UNION ALL SELECT 'BillingDocument', 'SalesOrder', 'bills', COUNT(DISTINCT reference_sd_document)::int FROM billing_document_items WHERE reference_sd_document IS NOT NULL
    UNION ALL SELECT 'JournalEntry', 'BillingDocument', 'records', COUNT(DISTINCT reference_document)::int FROM journal_entry_items_ar WHERE reference_document IS NOT NULL
    UNION ALL SELECT 'JournalEntry', 'Customer', 'for_customer', COUNT(DISTINCT customer)::int FROM journal_entry_items_ar WHERE customer IS NOT NULL
    UNION ALL SELECT 'Payment', 'Customer', 'from_customer', COUNT(DISTINCT customer)::int FROM payments_ar WHERE customer IS NOT NULL
    UNION ALL SELECT 'SalesOrder', 'Plant', 'produced_at', COUNT(DISTINCT production_plant)::int FROM sales_order_items WHERE production_plant IS NOT NULL
    UNION ALL SELECT 'Delivery', 'Plant', 'ships_from', COUNT(DISTINCT plant)::int FROM outbound_delivery_items WHERE plant IS NOT NULL
  `;

  return {
    nodes: counts.map((r) => ({
      id: r.type as string,
      type: "overview" as const,
      label: r.type as string,
      count: r.count as number,
    })),
    links: edgeCounts
      .filter((r) => (r.count as number) > 0)
      .map((r) => ({
        source: r.source as string,
        target: r.target as string,
        relationship: r.rel as string,
        count: r.count as number,
      })),
  };
}

export async function exploreNode(
  sql: Sql,
  nodeType: NodeType,
  nodeId: string,
  depth: number = 1,
): Promise<{ nodes: GraphNode[]; links: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const links: GraphEdge[] = [];
  const seen = new Set<string>();

  function addNode(n: GraphNode) {
    const key = `${n.type}:${n.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      nodes.push(n);
    }
  }

  function addLink(l: GraphEdge) {
    links.push(l);
  }

  const explorers: Record<NodeType, (id: string) => Promise<void>> = {
    SalesOrder: async (id) => {
      const [header] = await sql`SELECT * FROM sales_order_headers WHERE sales_order = ${id} LIMIT 1`;
      if (!header) return;
      addNode({ id, type: "SalesOrder", label: `SO ${id}`, metadata: header });

      if (header.sold_to_party) {
        const [bp] = await sql`SELECT * FROM business_partners WHERE business_partner = ${header.sold_to_party} OR customer = ${header.sold_to_party} LIMIT 1`;
        if (bp) {
          addNode({ id: bp.business_partner as string, type: "Customer", label: (bp.business_partner_full_name || bp.business_partner_name || bp.business_partner) as string, metadata: bp });
          addLink({ source: id, target: bp.business_partner as string, relationship: "sold_to" });
        }
      }

      const items = await sql`SELECT DISTINCT material, production_plant FROM sales_order_items WHERE sales_order = ${id} AND material IS NOT NULL`;
      for (const item of items) {
        if (item.material) {
          const [desc] = await sql`SELECT product_description FROM product_descriptions WHERE product = ${item.material} AND language = 'EN' LIMIT 1`;
          addNode({ id: item.material as string, type: "Product", label: (desc?.product_description || item.material) as string, metadata: { product: item.material } });
          addLink({ source: id, target: item.material as string, relationship: "contains" });
        }
        if (item.production_plant) {
          const [pl] = await sql`SELECT * FROM plants WHERE plant = ${item.production_plant} LIMIT 1`;
          addNode({ id: item.production_plant as string, type: "Plant", label: (pl?.plant_name || item.production_plant) as string, metadata: pl || { plant: item.production_plant } });
          addLink({ source: id, target: item.production_plant as string, relationship: "produced_at" });
        }
      }

      const deliveries = await sql`SELECT DISTINCT odi.delivery_document FROM outbound_delivery_items odi WHERE odi.reference_sd_document = ${id}`;
      for (const d of deliveries) {
        const [dh] = await sql`SELECT * FROM outbound_delivery_headers WHERE delivery_document = ${d.delivery_document} LIMIT 1`;
        addNode({ id: d.delivery_document as string, type: "Delivery", label: `DL ${d.delivery_document}`, metadata: dh || {} });
        addLink({ source: d.delivery_document as string, target: id, relationship: "fulfills" });
      }

      const billings = await sql`SELECT DISTINCT bdi.billing_document FROM billing_document_items bdi WHERE bdi.reference_sd_document = ${id}`;
      for (const b of billings) {
        const [bh] = await sql`SELECT * FROM billing_document_headers WHERE billing_document = ${b.billing_document} LIMIT 1`;
        addNode({ id: b.billing_document as string, type: "BillingDocument", label: `BD ${b.billing_document}`, metadata: bh || {} });
        addLink({ source: b.billing_document as string, target: id, relationship: "bills" });
      }
    },

    Customer: async (id) => {
      const [bp] = await sql`SELECT * FROM business_partners WHERE business_partner = ${id} OR customer = ${id} LIMIT 1`;
      if (!bp) return;
      const bpId = bp.business_partner as string;
      addNode({ id: bpId, type: "Customer", label: (bp.business_partner_full_name || bp.business_partner_name || bpId) as string, metadata: bp });

      const custId = (bp.customer || bpId) as string;
      const orders = await sql`SELECT sales_order FROM sales_order_headers WHERE sold_to_party = ${custId} OR sold_to_party = ${bpId} LIMIT 20`;
      for (const o of orders) {
        addNode({ id: o.sales_order as string, type: "SalesOrder", label: `SO ${o.sales_order}`, metadata: {} });
        addLink({ source: o.sales_order as string, target: bpId, relationship: "sold_to" });
      }

      const bills = await sql`SELECT billing_document, total_net_amount, transaction_currency FROM billing_document_headers WHERE sold_to_party = ${custId} OR sold_to_party = ${bpId} LIMIT 20`;
      for (const b of bills) {
        addNode({ id: b.billing_document as string, type: "BillingDocument", label: `BD ${b.billing_document}`, metadata: b });
        addLink({ source: b.billing_document as string, target: bpId, relationship: "billed_to" });
      }
    },

    Delivery: async (id) => {
      const [dh] = await sql`SELECT * FROM outbound_delivery_headers WHERE delivery_document = ${id} LIMIT 1`;
      if (!dh) return;
      addNode({ id, type: "Delivery", label: `DL ${id}`, metadata: dh });

      const items = await sql`SELECT * FROM outbound_delivery_items WHERE delivery_document = ${id}`;
      for (const item of items) {
        if (item.reference_sd_document) {
          addNode({ id: item.reference_sd_document as string, type: "SalesOrder", label: `SO ${item.reference_sd_document}`, metadata: {} });
          addLink({ source: id, target: item.reference_sd_document as string, relationship: "fulfills" });
        }
        if (item.plant) {
          const [pl] = await sql`SELECT * FROM plants WHERE plant = ${item.plant} LIMIT 1`;
          addNode({ id: item.plant as string, type: "Plant", label: (pl?.plant_name || item.plant) as string, metadata: pl || {} });
          addLink({ source: id, target: item.plant as string, relationship: "ships_from" });
        }
      }
    },

    BillingDocument: async (id) => {
      const [bh] = await sql`SELECT * FROM billing_document_headers WHERE billing_document = ${id} LIMIT 1`;
      if (!bh) return;
      addNode({ id, type: "BillingDocument", label: `BD ${id}`, metadata: bh });

      if (bh.sold_to_party) {
        const [bp] = await sql`SELECT * FROM business_partners WHERE business_partner = ${bh.sold_to_party} OR customer = ${bh.sold_to_party} LIMIT 1`;
        if (bp) {
          addNode({ id: bp.business_partner as string, type: "Customer", label: (bp.business_partner_full_name || bp.business_partner_name || bp.business_partner) as string, metadata: bp });
          addLink({ source: id, target: bp.business_partner as string, relationship: "billed_to" });
        }
      }

      const items = await sql`SELECT * FROM billing_document_items WHERE billing_document = ${id}`;
      for (const item of items) {
        if (item.reference_sd_document) {
          addNode({ id: item.reference_sd_document as string, type: "SalesOrder", label: `SO ${item.reference_sd_document}`, metadata: {} });
          addLink({ source: id, target: item.reference_sd_document as string, relationship: "bills" });
        }
        if (item.material) {
          const [desc] = await sql`SELECT product_description FROM product_descriptions WHERE product = ${item.material} AND language = 'EN' LIMIT 1`;
          addNode({ id: item.material as string, type: "Product", label: (desc?.product_description || item.material) as string, metadata: { product: item.material } });
          addLink({ source: id, target: item.material as string, relationship: "includes" });
        }
      }

      if (bh.accounting_document && bh.company_code && bh.fiscal_year) {
        const journals = await sql`SELECT * FROM journal_entry_items_ar WHERE company_code = ${bh.company_code} AND fiscal_year = ${bh.fiscal_year} AND accounting_document = ${bh.accounting_document} LIMIT 5`;
        for (const j of journals) {
          const jId = `${j.company_code}-${j.fiscal_year}-${j.accounting_document}-${j.accounting_document_item}`;
          addNode({ id: jId, type: "JournalEntry", label: `JE ${j.accounting_document}`, metadata: j });
          addLink({ source: jId, target: id, relationship: "records" });
        }
      }
    },

    Product: async (id) => {
      const [prod] = await sql`SELECT * FROM products WHERE product = ${id} LIMIT 1`;
      if (!prod) return;
      const [desc] = await sql`SELECT product_description FROM product_descriptions WHERE product = ${id} AND language = 'EN' LIMIT 1`;
      addNode({ id, type: "Product", label: (desc?.product_description || id) as string, metadata: { ...prod, description: desc?.product_description } });

      const orders = await sql`SELECT DISTINCT sales_order FROM sales_order_items WHERE material = ${id} LIMIT 20`;
      for (const o of orders) {
        addNode({ id: o.sales_order as string, type: "SalesOrder", label: `SO ${o.sales_order}`, metadata: {} });
        addLink({ source: o.sales_order as string, target: id, relationship: "contains" });
      }

      const billings = await sql`SELECT DISTINCT billing_document FROM billing_document_items WHERE material = ${id} LIMIT 20`;
      for (const b of billings) {
        addNode({ id: b.billing_document as string, type: "BillingDocument", label: `BD ${b.billing_document}`, metadata: {} });
        addLink({ source: b.billing_document as string, target: id, relationship: "includes" });
      }
    },

    Plant: async (id) => {
      const [pl] = await sql`SELECT * FROM plants WHERE plant = ${id} LIMIT 1`;
      if (!pl) return;
      addNode({ id, type: "Plant", label: (pl.plant_name || id) as string, metadata: pl });

      const orders = await sql`SELECT DISTINCT sales_order FROM sales_order_items WHERE production_plant = ${id} LIMIT 20`;
      for (const o of orders) {
        addNode({ id: o.sales_order as string, type: "SalesOrder", label: `SO ${o.sales_order}`, metadata: {} });
        addLink({ source: o.sales_order as string, target: id, relationship: "produced_at" });
      }

      const deliveries = await sql`SELECT DISTINCT delivery_document FROM outbound_delivery_items WHERE plant = ${id} LIMIT 20`;
      for (const d of deliveries) {
        addNode({ id: d.delivery_document as string, type: "Delivery", label: `DL ${d.delivery_document}`, metadata: {} });
        addLink({ source: d.delivery_document as string, target: id, relationship: "ships_from" });
      }
    },

    JournalEntry: async (id) => {
      const parts = id.split("-");
      if (parts.length < 4) return;
      const [cc, fy, ad, adi] = parts;
      const [je] = await sql`SELECT * FROM journal_entry_items_ar WHERE company_code = ${cc} AND fiscal_year = ${fy} AND accounting_document = ${ad} AND accounting_document_item = ${adi} LIMIT 1`;
      if (!je) return;
      addNode({ id, type: "JournalEntry", label: `JE ${ad}`, metadata: je });

      if (je.reference_document) {
        const [bh] = await sql`SELECT * FROM billing_document_headers WHERE billing_document = ${je.reference_document} LIMIT 1`;
        if (bh) {
          addNode({ id: je.reference_document as string, type: "BillingDocument", label: `BD ${je.reference_document}`, metadata: bh });
          addLink({ source: id, target: je.reference_document as string, relationship: "records" });
        }
      }

      if (je.customer) {
        const [bp] = await sql`SELECT * FROM business_partners WHERE customer = ${je.customer} OR business_partner = ${je.customer} LIMIT 1`;
        if (bp) {
          addNode({ id: bp.business_partner as string, type: "Customer", label: (bp.business_partner_full_name || bp.business_partner) as string, metadata: bp });
          addLink({ source: id, target: bp.business_partner as string, relationship: "for_customer" });
        }
      }
    },

    Payment: async (id) => {
      const parts = id.split("-");
      if (parts.length < 4) return;
      const [cc, fy, ad, adi] = parts;
      const [pay] = await sql`SELECT * FROM payments_ar WHERE company_code = ${cc} AND fiscal_year = ${fy} AND accounting_document = ${ad} AND accounting_document_item = ${adi} LIMIT 1`;
      if (!pay) return;
      addNode({ id, type: "Payment", label: `PAY ${ad}`, metadata: pay });

      if (pay.customer) {
        const [bp] = await sql`SELECT * FROM business_partners WHERE customer = ${pay.customer} OR business_partner = ${pay.customer} LIMIT 1`;
        if (bp) {
          addNode({ id: bp.business_partner as string, type: "Customer", label: (bp.business_partner_full_name || bp.business_partner) as string, metadata: bp });
          addLink({ source: id, target: bp.business_partner as string, relationship: "from_customer" });
        }
      }

      if (pay.clearing_accounting_document) {
        addLink({ source: id, target: `${cc}-${pay.clearing_doc_fiscal_year || fy}-${pay.clearing_accounting_document}-001`, relationship: "clears" });
      }
    },
  };

  const explorer = explorers[nodeType];
  if (explorer) await explorer(nodeId);

  return { nodes, links };
}

export async function searchNodes(
  sql: Sql,
  query: string,
  limit: number = 20,
): Promise<GraphNode[]> {
  const pattern = `%${query}%`;
  const results: GraphNode[] = [];

  const orders = await sql`SELECT sales_order, sold_to_party, total_net_amount FROM sales_order_headers WHERE sales_order LIKE ${pattern} LIMIT ${limit}`;
  for (const o of orders) results.push({ id: o.sales_order as string, type: "SalesOrder", label: `SO ${o.sales_order}`, metadata: o });

  const deliveries = await sql`SELECT delivery_document FROM outbound_delivery_headers WHERE delivery_document LIKE ${pattern} LIMIT ${limit}`;
  for (const d of deliveries) results.push({ id: d.delivery_document as string, type: "Delivery", label: `DL ${d.delivery_document}`, metadata: d });

  const billings = await sql`SELECT billing_document, sold_to_party, total_net_amount FROM billing_document_headers WHERE billing_document LIKE ${pattern} LIMIT ${limit}`;
  for (const b of billings) results.push({ id: b.billing_document as string, type: "BillingDocument", label: `BD ${b.billing_document}`, metadata: b });

  const customers = await sql`SELECT business_partner, customer, business_partner_full_name, business_partner_name FROM business_partners WHERE business_partner LIKE ${pattern} OR customer LIKE ${pattern} OR business_partner_full_name ILIKE ${pattern} OR business_partner_name ILIKE ${pattern} LIMIT ${limit}`;
  for (const c of customers) results.push({ id: c.business_partner as string, type: "Customer", label: (c.business_partner_full_name || c.business_partner_name || c.business_partner) as string, metadata: c });

  const prods = await sql`SELECT p.product, pd.product_description FROM products p LEFT JOIN product_descriptions pd ON p.product = pd.product AND pd.language = 'EN' WHERE p.product LIKE ${pattern} OR pd.product_description ILIKE ${pattern} LIMIT ${limit}`;
  for (const p of prods) results.push({ id: p.product as string, type: "Product", label: (p.product_description || p.product) as string, metadata: p });

  const plants = await sql`SELECT plant, plant_name FROM plants WHERE plant LIKE ${pattern} OR plant_name ILIKE ${pattern} LIMIT ${limit}`;
  for (const pl of plants) results.push({ id: pl.plant as string, type: "Plant", label: (pl.plant_name || pl.plant) as string, metadata: pl });

  return results.slice(0, limit);
}

export async function getSamplesByType(
  sql: Sql,
  nodeType: NodeType,
  limit: number = 10,
): Promise<GraphNode[]> {
  const results: GraphNode[] = [];

  switch (nodeType) {
    case "SalesOrder": {
      const rows = await sql`SELECT sales_order, sold_to_party, total_net_amount, transaction_currency FROM sales_order_headers ORDER BY creation_date DESC NULLS LAST LIMIT ${limit}`;
      for (const r of rows) results.push({ id: r.sales_order as string, type: "SalesOrder", label: `SO ${r.sales_order}`, metadata: r });
      break;
    }
    case "Delivery": {
      const rows = await sql`SELECT delivery_document, shipping_point, overall_goods_movement_status FROM outbound_delivery_headers ORDER BY creation_date DESC NULLS LAST LIMIT ${limit}`;
      for (const r of rows) results.push({ id: r.delivery_document as string, type: "Delivery", label: `DL ${r.delivery_document}`, metadata: r });
      break;
    }
    case "BillingDocument": {
      const rows = await sql`SELECT billing_document, sold_to_party, total_net_amount, transaction_currency FROM billing_document_headers ORDER BY creation_date DESC NULLS LAST LIMIT ${limit}`;
      for (const r of rows) results.push({ id: r.billing_document as string, type: "BillingDocument", label: `BD ${r.billing_document}`, metadata: r });
      break;
    }
    case "Customer": {
      const rows = await sql`SELECT business_partner, customer, business_partner_full_name, business_partner_name FROM business_partners LIMIT ${limit}`;
      for (const r of rows) results.push({ id: r.business_partner as string, type: "Customer", label: (r.business_partner_full_name || r.business_partner_name || r.business_partner) as string, metadata: r });
      break;
    }
    case "Product": {
      const rows = await sql`SELECT p.product, pd.product_description FROM products p LEFT JOIN product_descriptions pd ON p.product = pd.product AND pd.language = 'EN' LIMIT ${limit}`;
      for (const r of rows) results.push({ id: r.product as string, type: "Product", label: (r.product_description || r.product) as string, metadata: r });
      break;
    }
    case "Plant": {
      const rows = await sql`SELECT plant, plant_name FROM plants LIMIT ${limit}`;
      for (const r of rows) results.push({ id: r.plant as string, type: "Plant", label: (r.plant_name || r.plant) as string, metadata: r });
      break;
    }
    case "JournalEntry": {
      const rows = await sql`SELECT company_code, fiscal_year, accounting_document, accounting_document_item, reference_document, customer FROM journal_entry_items_ar LIMIT ${limit}`;
      for (const r of rows) results.push({ id: `${r.company_code}-${r.fiscal_year}-${r.accounting_document}-${r.accounting_document_item}` as string, type: "JournalEntry", label: `JE ${r.accounting_document}`, metadata: r });
      break;
    }
    case "Payment": {
      const rows = await sql`SELECT company_code, fiscal_year, accounting_document, accounting_document_item, customer FROM payments_ar LIMIT ${limit}`;
      for (const r of rows) results.push({ id: `${r.company_code}-${r.fiscal_year}-${r.accounting_document}-${r.accounting_document_item}` as string, type: "Payment", label: `PAY ${r.accounting_document}`, metadata: r });
      break;
    }
  }

  return results;
}
