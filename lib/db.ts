import { neon, NeonQueryFunction } from "@neondatabase/serverless";

export type Sql = NeonQueryFunction<false, false>;

export function getDb(): Sql {
  return neon(process.env.DATABASE_URL!);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rawQuery(query: string, params?: any[]): Promise<Record<string, any>[]> {
  const sql = neon(process.env.DATABASE_URL!);
  return sql.query(query, params);
}
