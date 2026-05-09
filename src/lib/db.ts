import { createClient } from "@libsql/client/web";
import { createServerFn } from "@tanstack/react-start";

// Konfigurasi Turso dari Environment Variables
// Gunakan TURSO_ (tanpa VITE_) agar tidak bocor ke bundle client
const url = process.env.TURSO_URL || import.meta.env.VITE_TURSO_URL;
const token = process.env.TURSO_TOKEN || import.meta.env.VITE_TURSO_TOKEN;

// Inisialisasi Client Turso
// Catatan: Di produksi (Vercel), kita akan menggunakan server function agar token tetap aman.
const client = createClient({
  url: url || "",
  authToken: token || "",
});

/**
 * Server Function untuk menjalankan query SQL di Turso.
 * Ini memastikan token tidak bocor ke browser dan query berjalan di sisi server/edge.
 */
export const executeSql = createServerFn("POST", async ({ sql, params }: { sql: string; params?: any[] }) => {
  if (!url || !token) {
    throw new Error("Turso URL atau Token belum dikonfigurasi di .env");
  }
  
  const result = await client.execute({ sql, args: params || [] });
  return {
    rows: result.rows.map(row => {
      const obj: any = {};
      result.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    }),
    lastInsertRowid: result.lastInsertRowid?.toString(),
    rowsAffected: result.rowsAffected
  };
});

/**
 * Server Function untuk menjalankan batch SQL di Turso.
 */
export const executeBatch = createServerFn("POST", async (statements: any[]) => {
  if (!url || !token) {
    throw new Error("Turso URL atau Token belum dikonfigurasi di .env");
  }
  return await client.batch(statements, "write");
});

/**
 * Wrapper untuk query banyak baris
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await executeSql({ sql, params });
  return result.rows as T[];
}

/**
 * Wrapper untuk query satu baris
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Fungsi untuk eksekusi perintah non-query (INSERT/UPDATE/DELETE)
 */
export async function run(sql: string, params: any[] = []) {
  return await executeSql({ sql, params });
}

// Helpers
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
