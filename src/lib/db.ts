import { createClient } from "@libsql/client";

// Konfigurasi client Turso menggunakan environment variables dari .env
const client = createClient({
  url: import.meta.env.VITE_TURSO_DATABASE_URL || "",
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN || "",
});

/**
 * Fungsi query untuk mengambil banyak baris data
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await client.execute({
      sql,
      args: params
    });
    // LibSQL mengembalikan rows sebagai array of objects (jika menggunakan execute)
    return result.rows as unknown as T[];
  } catch (error) {
    console.error("Database Query Error:", error);
    throw error;
  }
}

/**
 * Fungsi query untuk mengambil satu baris data saja
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const r = await query<T>(sql, params);
  return r[0] ?? null;
}

/**
 * Fungsi untuk menjalankan perintah non-query (INSERT, UPDATE, DELETE)
 */
export async function run(sql: string, params: any[] = []) {
  try {
    await client.execute({
      sql,
      args: params
    });
  } catch (error) {
    console.error("Database Run Error:", error);
    throw error;
  }
}

/**
 * Fungsi pembantu untuk inisialisasi tabel jika belum ada (opsional untuk Turso)
 * Biasanya schema diatur sekali di awal, tapi kita jaga-jaga di sini.
 */
export async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS siswa (
      id INTEGER PRIMARY KEY,
      nama_siswa TEXT,
      nisn TEXT,
      satuan_pendidikan TEXT,
      kecamatan TEXT,
      jenjang TEXT,
      tingkat_kelas TEXT,
      jenis_kelamin TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS hambatan_siswa (
      siswa_id INTEGER,
      jenis_hambatan TEXT,
      tingkat_hambatan TEXT
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS alat_bantu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jenis_hambatan TEXT,
      nama_alat TEXT,
      kategori TEXT,
      deskripsi TEXT
    )
  `);
  
  // Cek jika katalog alat bantu kosong, isi dengan data default
  const count = await queryOne<{ n: number }>("SELECT COUNT(*) as n FROM alat_bantu");
  if (count && count.n === 0) {
    console.log("Katalog alat bantu kosong di Turso, memulihkan data standar...");
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
    
    for (const t of tools) {
      await run("INSERT INTO alat_bantu (jenis_hambatan, nama_alat, kategori, deskripsi) VALUES (?, ?, ?, ?)", t);
    }
  }
}

// Utility untuk format angka
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

// Fungsi dummy untuk kompatibilitas jika ada yang memanggil saveDb (Turso otomatis autosave)
export async function saveDb() {
  return Promise.resolve();
}

// Fungsi dummy untuk kompatibilitas getDb
export async function getDb(): Promise<any> {
  return client;
}
