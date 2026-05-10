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

async function ensureAlatBantu(db: Database) {
  const count = (db.exec("SELECT COUNT(*) as n FROM alat_bantu")[0].values[0][0] as number);
  if (count === 0) {
    console.log("Katalog alat bantu kosong, memulihkan data standar...");
    const tools = [
      ["Kesulitan Penglihatan", "Kacamata Refraksi", "Optik", "Kacamata untuk membantu koreksi penglihatan jarak jauh/dekat."],
      ["Kesulitan Penglihatan", "Magnifier (Kaca Pembesar)", "Optik", "Alat bantu untuk memperbesar tulisan atau objek."],
      ["Kesulitan Penglihatan", "Buku Braille / Audio Book", "Literasi", "Media belajar alternatif untuk hambatan penglihatan berat."],
      ["Kesulitan Pendengaran", "Hearing Aid (Alat Bantu Dengar)", "Auditori", "Memperkeras suara yang masuk ke telinga."],
      ["Kesulitan Pendengaran", "SIBI / ASL Trainer", "Komunikasi", "Modul atau aplikasi bahasa isyarat."],
      ["Kesulitan Pendengaran", "Visual Alert System", "Teknologi", "Lampu indikator sebagai pengganti alarm suara."],
      ["Kesulitan Motorik Kasar", "Kursi Roda Standard", "Mobilitas", "Alat bantu mobilisasi untuk hambatan motorik tungkai."],
      ["Kesulitan Motorik Kasar", "Kruk / Walker", "Mobilitas", "Alat bantu jalan untuk keseimbangan."],
      ["Kesulitan Gerak dan Koordinasi Jari", "Adaptor Pensil", "Motorik Halus", "Alat bantu pegangan agar lebih mudah menulis."],
      ["Kesulitan Gerak dan Koordinasi Jari", "Keyboard Adaptif", "Teknologi", "Keyboard dengan tombol besar untuk koordinasi jari terbatas."],
      ["Kesulitan Berbicara", "Communication Board", "Komunikasi", "Papan simbol untuk membantu menyampaikan keinginan."],
      ["Kesulitan Berbicara", "Aplikasi Text-to-Speech", "Teknologi", "Aplikasi pengubah teks menjadi suara."],
      ["Kesulitan Kemampuan Fungsi Intelektual", "Guru Pembimbing Khusus (GPK)", "SDM", "Pendampingan khusus untuk adaptasi kurikulum."],
      ["Kesulitan Kemampuan Fungsi Intelektual", "Media Manipulatif", "Akademis", "Alat peraga konkrit untuk membantu pemahaman konsep."],
      ["Kesulitan Membaca Diseleksia", "Software Font Dyslexia", "Teknologi", "Font khusus dan penggaris baca untuk fokus."],
      ["Kesulitan Membaca Diseleksia", "Reading Tracker", "Literasi", "Alat bantu untuk menelusuri baris teks saat membaca."],
      ["Kesulitan Perilaku Sosialisasi", "Kartu Skenario Sosial", "Psikologis", "Panduan visual untuk interaksi sosial."],
      ["Kesulitan Atensi", "Fidget Spinner / Stress Ball", "Sensorik", "Alat bantu untuk membantu fokus dan menyalurkan energi."],
      ["Kesulitan Atensi", "Noise Cancelling Headphone", "Sensorik", "Mengurangi distraksi suara dari lingkungan."],
      ["Kesulitan Emosi", "Weighted Blanket", "Terapi", "Selimut pemberat untuk memberikan rasa tenang."],
      ["Kesulitan Emosi", "Visual Timer", "Manajemen", "Alat bantu visual untuk mengelola transisi aktivitas."],
    ];
    const stmt = db.prepare("INSERT INTO alat_bantu (jenis_hambatan, nama_alat, kategori, deskripsi) VALUES (?, ?, ?, ?)");
    tools.forEach(t => stmt.run(t));
    stmt.free();
    // Jika kita di browser, simpan hasil pemulihan ini
    if (typeof window !== "undefined") {
        setTimeout(() => saveDb(), 1000);
    }
  }
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
          const db = new SQL.Database(localBuf);
          await ensureAlatBantu(db);
          return db;
        }

        // Jika tidak ada, ambil dari file publik
        const res = await fetch("/data/pbs.db");
        if (!res.ok) throw new Error("Gagal memuat file pbs.db");
        const buf = await res.arrayBuffer();
        const db = new SQL.Database(new Uint8Array(buf));
        await ensureAlatBantu(db);
        return db;
      } catch (err) {
        console.warn("Menggunakan database kosong baru...", err);
        const db = new SQL.Database();
        // Pastikan tabel ada dulu sebelum diisi
        db.run("CREATE TABLE IF NOT EXISTS alat_bantu (id INTEGER PRIMARY KEY AUTOINCREMENT, jenis_hambatan TEXT, nama_alat TEXT, kategori TEXT, deskripsi TEXT)");
        await ensureAlatBantu(db);
        return db;
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
