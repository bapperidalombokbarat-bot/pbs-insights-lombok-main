import initSqlJs, { type Database } from "sql.js";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
      const res = await fetch("/data/pbs.db");
      const buf = await res.arrayBuffer();
      return new SQL.Database(new Uint8Array(buf));
    })();
  }
  return dbPromise;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params as any);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as T);
  stmt.free();
  return rows;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const r = await query<T>(sql, params);
  return r[0] ?? null;
}

export const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("id-ID");

export const HAMBATAN_COLS = [
  "Kesulitan Penglihatan",
  "Kesulitan Pendengaran",
  "Kesulitan Motorik Kasar",
  "Kesulitan Gerak dan Koordinasi Jari",
  "Kesulitan Berbicara",
  "Kesulitan Kemampuan Fungsi Intelektual",
  "Kesulitan Membaca Diseleksia",
  "Kesulitan Perilaku Sosialisasi",
  "Kesulitan Atensi",
  "Kesulitan Emosi",
];

export const HAMBATAN_SHORT: Record<string, string> = {
  "Kesulitan Penglihatan": "Penglihatan",
  "Kesulitan Pendengaran": "Pendengaran",
  "Kesulitan Motorik Kasar": "Motorik Kasar",
  "Kesulitan Gerak dan Koordinasi Jari": "Koordinasi Jari",
  "Kesulitan Berbicara": "Berbicara",
  "Kesulitan Kemampuan Fungsi Intelektual": "Fungsi Intelektual",
  "Kesulitan Membaca Diseleksia": "Disleksia",
  "Kesulitan Perilaku Sosialisasi": "Perilaku Sosial",
  "Kesulitan Atensi": "Atensi",
  "Kesulitan Emosi": "Emosi",
};
