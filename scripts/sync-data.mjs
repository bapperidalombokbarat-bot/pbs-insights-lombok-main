import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import * as XLSXModule from "xlsx";
const XLSX = XLSXModule.default || XLSXModule;
import { createClient } from "@libsql/client";

// Load .env if present
dotenv.config();

const url = process.env.VITE_TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.VITE_TURSO_AUTH_TOKEN || "";

console.log("==========================================");
console.log("  PEDULI - Pemutakhiran Data ke Database  ");
console.log("==========================================");
console.log(`📡 Target Database URL: ${url.startsWith("file:") ? url : url.replace(/(:\/\/[^@]+@|:\/\/).*/, "$1***")}`);

const client = createClient({
  url,
  authToken,
});

const HAMBATAN_COLS = [
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

async function initTables() {
  console.log("🔨 Memeriksa dan membuat tabel bila belum ada...");
  await client.execute(`
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
  await client.execute(`
    CREATE TABLE IF NOT EXISTS hambatan_siswa (
      siswa_id INTEGER,
      jenis_hambatan TEXT,
      tingkat_hambatan TEXT
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS alat_bantu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jenis_hambatan TEXT,
      nama_alat TEXT,
      kategori TEXT,
      deskripsi TEXT
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS rapor_spm (
      npsn TEXT, 
      nama_satuan TEXT, 
      jenis_satuan TEXT, 
      kecamatan TEXT, 
      jenjang TEXT, 
      indikator TEXT, 
      skor REAL, 
      label TEXT,
      delta REAL,
      domain TEXT
    )
  `);
  try { await client.execute("ALTER TABLE rapor_spm ADD COLUMN delta REAL"); } catch (_) {}
  try { await client.execute("ALTER TABLE rapor_spm ADD COLUMN domain TEXT"); } catch (_) {}

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_siswa_kecamatan ON siswa(kecamatan)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_siswa_jenjang ON siswa(jenjang)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_hambatan_siswa_id ON hambatan_siswa(siswa_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_rapor_kecamatan ON rapor_spm(kecamatan)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_rapor_jenjang ON rapor_spm(jenjang)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_rapor_npsn ON rapor_spm(npsn)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_rapor_indikator ON rapor_spm(indikator)`);
}

function parseVal(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const s = v.toString().trim().replace(",", ".");
  if (s === "-" || s === "" || isNaN(Number(s))) return null;
  return parseFloat(s);
}

async function syncPbs(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File PBS tidak ditemukan di: ${filePath}`);
    return;
  }

  console.log(`\n📂 Membaca data Rekapitulasi PBS dari: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find(n => n.includes("Rekapitulasi")) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`📊 Ditemukan ${rows.length} baris data PBS. Memulai proses impor...`);

  // Hapus data lama
  await client.execute("DELETE FROM hambatan_siswa");
  await client.execute("DELETE FROM siswa");

  const BATCH_SIZE = 100;
  let batchStatements = [];
  let countSiswa = 0;
  let countHambatan = 0;

  for (const [idx, row] of rows.entries()) {
    const id = idx + 1;
    const nama = row["Nama Peserta Didik"] || row["Nama Siswa"] || row["Nama"] || row["nama_siswa"];
    if (!nama) continue;

    const nisn = row["NISN"] || row["nisn"] || "";
    const sekolah = row["Satuan Pendidikan"] || row["Sekolah"] || row["satuan_pendidikan"] || "";
    const kecamatan = row["Kecamatan"] || row["kecamatan"] || "";
    const jenjang = row["Jenjang"] || row["jenjang"] || "";
    const kelas = row["Kelas"] || row["Tingkat Kelas"] || row["tingkat_kelas"] || "";
    const jk = row["Jenis Kelamin"] || row["jenis_kelamin"] || "";

    batchStatements.push({
      sql: `INSERT INTO siswa (id, nama_siswa, nisn, satuan_pendidikan, kecamatan, jenjang, tingkat_kelas, jenis_kelamin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, nama, nisn, sekolah, kecamatan, jenjang, kelas, jk],
    });

    const difficulties = [];
    let totalScore = 0;

    HAMBATAN_COLS.forEach((col) => {
      const val = row[col];
      if (val && val !== "Tidak ada" && val !== "-" && val !== "Tidak Ada Kesulitan" && val !== "Tidak ada kesulitan") {
        let score = 0;
        if (val === "Sedikit Kesulitan" || val === "Ringan") score = 1;
        else if (val === "Banyak Kesulitan" || val === "Sedang") score = 3;
        else if (val === "Tidak Bisa Sama Sekali" || val === "Berat") score = 4;

        totalScore += score;
        difficulties.push({ col, val });
      }
    });

    let finalCategory = "Ringan";
    if (totalScore >= 9) finalCategory = "Berat";
    else if (totalScore >= 4) finalCategory = "Sedang";
    else if (totalScore >= 1) finalCategory = "Ringan";

    for (const h of difficulties) {
      if (totalScore >= 1) {
        batchStatements.push({
          sql: `INSERT INTO hambatan_siswa (siswa_id, jenis_hambatan, tingkat_hambatan)
                VALUES (?, ?, ?)`,
          args: [id, h.col, finalCategory],
        });
        countHambatan++;
      }
    }

    countSiswa++;

    if (batchStatements.length >= BATCH_SIZE) {
      await client.batch(batchStatements, "write");
      process.stdout.write(`\r⏳ Mengimpor siswa: ${countSiswa} / ${rows.length}...`);
      batchStatements = [];
    }
  }

  if (batchStatements.length > 0) {
    await client.batch(batchStatements, "write");
    batchStatements = [];
  }

  console.log(`\n✅ Selesai impor PBS: ${countSiswa} siswa, ${countHambatan} data hambatan.`);
}

async function syncRapor(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File RAPOR tidak ditemukan di: ${filePath}`);
    return;
  }

  console.log(`\n📂 Membaca data Rapor Pendidikan (SPM) dari: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  const dasmenSheet = workbook.SheetNames.find(n => n.includes("DASMEN"));
  const paudSheet = workbook.SheetNames.find(n => n.includes("PAUD"));

  if (!dasmenSheet && !paudSheet) {
    console.warn("⚠️ Tidak ditemukan sheet DASMEN atau PAUD pada file rapor ini.");
    return;
  }

  await client.execute("DELETE FROM rapor_spm");

  const BATCH_SIZE = 100;
  let batchStatements = [];
  let countRapor = 0;

  if (dasmenSheet) {
    console.log(`📊 Memproses sheet ${dasmenSheet}...`);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[dasmenSheet], { header: 1 });
    const dasmenIndicators = [
      { name: "Literasi", labelIdx: 35, valIdx: 37, domain: "Mutu Hasil Belajar" },
      { name: "Numerasi", labelIdx: 44, valIdx: 46, domain: "Mutu Hasil Belajar" },
      { name: "Karakter", labelIdx: 55, valIdx: 57, domain: "Mutu Hasil Belajar" },
      { name: "Kualitas Pembelajaran", labelIdx: 91, valIdx: 93, domain: "Mutu Proses Belajar" },
      { name: "Iklim Keamanan", labelIdx: 112, valIdx: 114, domain: "Mutu Proses Belajar" },
      { name: "Iklim Kebinekaan", labelIdx: 132, valIdx: 134, domain: "Mutu Proses Belajar" },
      { name: "Iklim Inklusivitas", labelIdx: 139, valIdx: 141, domain: "Mutu Proses Belajar" },
    ];

    for (let i = 6; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;
      for (const ind of dasmenIndicators) {
        const delta = parseVal(row[ind.valIdx]);
        const label = row[ind.labelIdx] || "N/A";
        batchStatements.push({
          sql: `INSERT INTO rapor_spm (npsn, nama_satuan, jenis_satuan, kecamatan, jenjang, indikator, skor, label, delta, domain)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [row[0], row[1], row[2], row[5], "DASMEN", ind.name, 0, label, delta, ind.domain],
        });
      }
      countRapor++;

      if (batchStatements.length >= BATCH_SIZE) {
        await client.batch(batchStatements, "write");
        process.stdout.write(`\r⏳ Mengimpor Rapor DASMEN: ${countRapor} sekolah...`);
        batchStatements = [];
      }
    }
  }

  if (paudSheet) {
    console.log(`\n📊 Memproses sheet ${paudSheet}...`);
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[paudSheet], { header: 1 });
    const paudIndicators = [
      { name: "Perencanaan Pembelajaran", labelIdx: 6, valIdx: 8, domain: "Mutu Proses Belajar" },
      { name: "Proses Belajar", labelIdx: 13, valIdx: 15, domain: "Mutu Proses Belajar" },
      { name: "Kemampuan Fondasi", labelIdx: 26, valIdx: 28, domain: "Mutu Hasil Belajar" },
      { name: "Kebiasaan Anak Hebat", labelIdx: 42, valIdx: 44, domain: "Mutu Hasil Belajar" },
      { name: "Sarana Prasarana", labelIdx: 53, valIdx: 55, domain: "Mutu Input" },
      { name: "Iklim Keamanan", labelIdx: 65, valIdx: 67, domain: "Mutu Proses Belajar" },
      { name: "Iklim Inklusivitas & Kebinekaan", labelIdx: 75, valIdx: 77, domain: "Mutu Proses Belajar" },
      { name: "Refleksi & Perbaikan Pembelajaran", labelIdx: 83, valIdx: 85, domain: "Mutu Proses Belajar" },
      { name: "Kepemimpinan Instruksional", labelIdx: 90, valIdx: 92, domain: "Mutu Input" },
      { name: "Kemitraan Orang Tua", labelIdx: 97, valIdx: 99, domain: "Mutu Proses Belajar" },
      { name: "Layanan Holistik Integratif", labelIdx: 101, valIdx: 103, domain: "Mutu Hasil Belajar" },
    ];

    for (let i = 6; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;
      for (const ind of paudIndicators) {
        const delta = parseVal(row[ind.valIdx]);
        const label = row[ind.labelIdx] || "N/A";
        batchStatements.push({
          sql: `INSERT INTO rapor_spm (npsn, nama_satuan, jenis_satuan, kecamatan, jenjang, indikator, skor, label, delta, domain)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [row[0], row[1], row[2], row[5], "PAUD", ind.name, 0, label, delta, ind.domain],
        });
      }
      countRapor++;

      if (batchStatements.length >= BATCH_SIZE) {
        await client.batch(batchStatements, "write");
        process.stdout.write(`\r⏳ Mengimpor Rapor PAUD: ${countRapor} sekolah...`);
        batchStatements = [];
      }
    }
  }

  if (batchStatements.length > 0) {
    await client.batch(batchStatements, "write");
    batchStatements = [];
  }

  console.log(`\n✅ Selesai impor Rapor SPM: total ${countRapor} sekolah.`);
}

async function main() {
  await initTables();

  const args = process.argv.slice(2);
  let pbsPath = "./Rekapitulasi Pengisian PBS_KAB. LOMBOK BARAT_1778067446.xlsx";
  let raporPath = "./RAPOR.xlsx";

  // Check custom arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pbs" && args[i + 1]) {
      pbsPath = args[i + 1];
    }
    if (args[i] === "--rapor" && args[i + 1]) {
      raporPath = args[i + 1];
    }
  }

  if (args.includes("--pbs-only")) {
    await syncPbs(pbsPath);
  } else if (args.includes("--rapor-only")) {
    await syncRapor(raporPath);
  } else {
    await syncPbs(pbsPath);
    await syncRapor(raporPath);
  }

  console.log("\n🎉 Seluruh proses sinkronisasi data selesai dengan sukses!");
}

main().catch((err) => {
  console.error("\n❌ Terjadi kesalahan saat sinkronisasi:", err);
  process.exit(1);
});
