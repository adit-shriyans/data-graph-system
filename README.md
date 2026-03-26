# SAP O2C Graph Explorer

A **graph-based data modeling and query system** for SAP **Order-to-Cash (O2C)** data: ingest JSONL into PostgreSQL, visualize entities and relationships, and ask **natural-language questions** that are translated to **SQL**, executed, and answered with **data-backed** text. Built for the [Forward Deployed Engineer assignment](https://dodge-ai-fde.notion.site/Forward-Deployed-Engineer-Task-Details-32a24c04ec88807484d0c7f9d7910102).

## Features

- **Graph construction** — 19 JSONL entity folders → normalized Postgres tables; API builds an **overview graph** (aggregated counts + relationship edges) and **per-entity expansion** for exploration.
- **Graph UI** — `react-force-graph-2d`: overview vs explore, search, node detail, zoom-to-fit, query-driven **highlights** on relevant type nodes and edges.
- **Chat (NL → SQL)** — Google **Gemini** generates `SELECT` queries from schema-aware prompts; results are formatted into markdown answers with **entity IDs** for graph highlighting.
- **Guardrails** — Off-topic detection in the LLM response; server-side **SQL validation** (read-only, no multi-statement / dangerous patterns).

## Tech stack

| Layer | Choice |
|--------|--------|
| App | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| Styling | **Tailwind CSS 4** |
| Data fetching (client) | **TanStack React Query** |
| Database | **Neon PostgreSQL** via `@neondatabase/serverless` |
| LLM | **Google Gemini** (`@google/generative-ai`) |
| Graph | **react-force-graph-2d** (canvas + d3-force) |

## Architecture

```text
JSONL (sap-o2c-data/)  →  ingest script / API  →  Neon Postgres (19 tables)
                                                      ↓
                                            graph-builder (SQL)
                                                      ↓
                    Browser  ←  React Query  ←  /api/graph, /api/graph/expand
                      ↓
              ForceGraph2D + ChatPanel  ←  /api/chat  ←  Gemini + rawQuery
```

- **Server**: API routes own DB access and LLM calls; secrets stay on the server (`DATABASE_URL`, `GEMINI_API_KEY`).
- **Client**: `GraphViewer` and `ChatPanel` call APIs through React Query; chat responses can pass **highlighted entity types** back to tint the overview graph (nodes + edges between highlighted types).

## Database choice: Neon PostgreSQL

- **Why Postgres**: Relational O2C data maps naturally to tables, joins, and constraints; reviewers can reason about the model in standard SQL.
- **Why Neon**: Serverless HTTP driver fits **Next.js** route handlers without a long-lived pool; free tier is enough for development and demos.
- **Schema**: `lib/schema.sql` — tables aligned with JSONL folders (snake_case columns), primary keys, foreign keys where applicable, and indexes on common join/filter columns. Ingestion: `lib/ingest.ts` + `npm run ingest`.

## LLM prompting strategy

1. **SQL generation** (`lib/prompts.ts` — `SYSTEM_PROMPT`): Full **schema description** + relationship narrative + strict JSON output `{ relevant, sql, explanation }`. The model must refuse unrelated questions with `relevant: false`.
2. **Answer formatting** (`FORMAT_PROMPT`): Given question, SQL, and row JSON, produce `{ answer, entities }` where `entities` is `{ type, id }[]` using the graph’s **NodeType** vocabulary (SalesOrder, Delivery, BillingDocument, Customer, Product, Plant, JournalEntry, Payment) so the UI can highlight the right overview nodes.

Orchestration: `lib/llm.ts` (parse → guardrails → `rawQuery` → second Gemini call → return `ChatResponse`).

## Guardrails

- **Topic**: First LLM JSON includes `relevant`; `isOffTopic` in `lib/guardrails.ts` short-circuits before SQL runs.
- **SQL**: `validateSql` allows only `SELECT` / `WITH`; blocks `INSERT`, `UPDATE`, `DELETE`, DDL, comments that could smuggle statements, and multiple statements.
- **UX**: Off-topic replies use the assignment-style message that the system only answers O2C dataset questions.

## Prerequisites

- Node.js 20+ recommended  
- A **Neon** database (connection string)  
- A **Google AI Studio** API key for Gemini  

## Setup

```bash
cd fe
# Create .env.local with the variables below (do not commit secrets)
```

`.env.local`:

```env
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
GEMINI_API_KEY=your_key_here
```

```bash
npm install
npm run ingest    # loads sap-o2c-data/*.jsonl into Neon (requires DATABASE_URL)
npm run dev       # http://localhost:3000
```

For production builds: `npm run build` then `npm start`.

## Project layout

```text
fe/
├── app/                 # Next.js App Router (pages, layout, API routes)
├── components/          # GraphViewer, ChatPanel, NodeDetail, QueryProvider
├── hooks/               # useGraph, useChat (React Query)
├── lib/                 # db, schema.sql, ingest, graph-builder, llm, prompts, guardrails
├── scripts/ingest.ts    # CLI entry for ingestion
├── types/               # Shared TS types + node colors/labels
├── sap-o2c-data/        # Dataset (JSONL) — not committed if you .gitignore large data
├── sessions/            # Cursor AI session exports (see sessions/README.md)
└── README.md            # This file
```

## Example questions

- Which products are associated with the highest number of billing documents?
- Trace the full flow of billing document `90678703` (sales order → delivery → billing → journal).
- Which sales orders look incomplete (e.g. delivered but not billed)?

## AI session logs

See [`sessions/README.md`](sessions/README.md) for exported **Cursor** transcripts included for assignment submission.

## License

Private / assignment use unless otherwise specified.
