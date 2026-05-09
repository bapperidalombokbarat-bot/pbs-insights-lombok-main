import initSqlJs, { type Database } from "sql.js";

let dbPromise: Promise<Database> | null = null;

const DB_STORE_NAME = "pbs_db_store";
const DB_KEY = "pbs_binary";

async function getStoredDb(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open("PBS_Database", 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(DB_STORE_NAME, "readonly");
      const store = tx.objectStore(DB_STORE_NAME);
      const getReq = store.get(DB_KEY);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

export async function saveDb() {
  const db = await getDb();
  const binary = db.export();
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("PBS_Database", 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(DB_STORE_NAME, "readwrite");
      const store = tx.objectStore(DB_STORE_NAME);
      store.put(binary, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
      try {
        // Cek penyimpanan lokal dulu
        const localBuf = await getStoredDb();
        if (localBuf) {
          console.log("Memuat database dari penyimpanan lokal...");
          return new SQL.Database(localBuf);
        }

        // Jika tidak ada, ambil dari file publik
        const res = await fetch("/data/pbs.db");
        if (!res.ok) throw new Error("Gagal memuat file pbs.db");
        const buf = await res.arrayBuffer();
        return new SQL.Database(new Uint8Array(buf));
      } catch (err) {
        console.warn("Menggunakan database kosong baru...", err);
        return new SQL.Database();
      }
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

export async function run(sql: string, params: any[] = []) {
  const db = await getDb();
  db.run(sql, params);
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
