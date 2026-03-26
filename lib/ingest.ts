import fs from "fs";
import path from "path";
import { neon, NeonQueryFunction } from "@neondatabase/serverless";

function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

interface TimeObj {
  hours: number;
  minutes: number;
  seconds: number;
}

function isTimeObject(val: unknown): val is TimeObj {
  return (
    typeof val === "object" &&
    val !== null &&
    "hours" in val &&
    "minutes" in val &&
    "seconds" in val
  );
}

function formatTime(t: TimeObj): string {
  return `${String(t.hours).padStart(2, "0")}:${String(t.minutes).padStart(2, "0")}:${String(t.seconds).padStart(2, "0")}`;
}

const FOLDER_TO_TABLE: Record<string, string> = {
  billing_document_cancellations: "billing_document_cancellations",
  billing_document_headers: "billing_document_headers",
  billing_document_items: "billing_document_items",
  business_partner_addresses: "business_partner_addresses",
  business_partners: "business_partners",
  customer_company_assignments: "customer_company_assignments",
  customer_sales_area_assignments: "customer_sales_area_assignments",
  journal_entry_items_accounts_receivable: "journal_entry_items_ar",
  outbound_delivery_headers: "outbound_delivery_headers",
  outbound_delivery_items: "outbound_delivery_items",
  payments_accounts_receivable: "payments_ar",
  plants: "plants",
  product_descriptions: "product_descriptions",
  product_plants: "product_plants",
  product_storage_locations: "product_storage_locations",
  products: "products",
  sales_order_headers: "sales_order_headers",
  sales_order_items: "sales_order_items",
  sales_order_schedule_lines: "sales_order_schedule_lines",
};

function transformValue(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (isTimeObject(val)) return formatTime(val);
  if (typeof val === "string" && val === "") return null;
  return val;
}

function transformRow(row: Record<string, unknown>): {
  columns: string[];
  values: unknown[];
} {
  const columns: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(row)) {
    columns.push(camelToSnake(key));
    values.push(transformValue(val));
  }
  return { columns, values };
}

export async function ingestFolder(
  sql: NeonQueryFunction<false, false>,
  dataDir: string,
  folder: string,
): Promise<number> {
  const table = FOLDER_TO_TABLE[folder];
  if (!table) throw new Error(`Unknown folder: ${folder}`);

  const folderPath = path.join(dataDir, folder);
  const files = fs
    .readdirSync(folderPath)
    .filter((f) => f.endsWith(".jsonl"));

  let totalRows = 0;

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    const BATCH_SIZE = 100;
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      const rows = batch.map((line) => {
        const parsed = JSON.parse(line);
        return transformRow(parsed);
      });

      if (rows.length === 0) continue;

      const columns = rows[0].columns;
      const placeholders = rows
        .map(
          (_, rowIdx) =>
            `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(", ")})`,
        )
        .join(", ");

      const allValues = rows.flatMap((r) => r.values);

      const query = `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(", ")}) VALUES ${placeholders} ON CONFLICT DO NOTHING`;
      await sql.query(query, allValues);
      totalRows += rows.length;
    }
  }

  return totalRows;
}

export async function ingestAll(
  connectionString: string,
  dataDir: string,
  onProgress?: (folder: string, count: number) => void,
): Promise<Record<string, number>> {
  const sql = neon(connectionString);

  const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  const statements = schemaSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await sql.query(stmt);
  }

  const results: Record<string, number> = {};
  const folders = Object.keys(FOLDER_TO_TABLE);

  for (const folder of folders) {
    const count = await ingestFolder(sql, dataDir, folder);
    results[folder] = count;
    onProgress?.(folder, count);
  }

  return results;
}
