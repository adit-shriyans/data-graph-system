import path from "path";
import { config } from "dotenv";
import { ingestAll } from "../lib/ingest";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes("...")) {
    console.error("Set DATABASE_URL in .env.local to your Neon connection string");
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), "sap-o2c-data");
  console.log("Starting ingestion from:", dataDir);
  console.log("Database:", dbUrl.replace(/\/\/.*@/, "//***@"));

  const start = Date.now();
  const results = await ingestAll(dbUrl, dataDir, (folder, count) => {
    console.log(`  ${folder}: ${count} rows`);
  });

  const totalRows = Object.values(results).reduce((a, b) => a + b, 0);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone! ${totalRows} total rows ingested in ${elapsed}s`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
