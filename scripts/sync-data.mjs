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

  await client.execute(`
    CREATE TABLE IF NOT EXISTS verval_lanjutan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      siswa_id INTEGER,
      nisn TEXT,
      nik_siswa TEXT,
      nama_siswa TEXT,
      sumber_instansi TEXT,
      alamat_siswa TEXT,
      alamat_sekolah TEXT,
      nama_ibu TEXT,
      nik_ibu TEXT,
      nama_ayah TEXT,
      nik_ayah TEXT,
      status_patju360 TEXT,
      metode_verval TEXT,
      desil_nasional TEXT,
      kategori_desil TEXT,
      desil_awal TEXT,
      pkh TEXT,
      bansos_sembako TEXT,
      beasiswa_bskm TEXT,
      pbi_jk TEXT,
      status_medis TEXT,
      disabilitas_dtsen TEXT,
      puskesmas_terdekat TEXT,
      jarak_km REAL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS verval_hambatan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      siswa_id INTEGER,
      nisn TEXT,
      jenis_hambatan TEXT,
      klasifikasi TEXT,
      tipe_alat_rekomendasi TEXT
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
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_verval_nisn ON verval_lanjutan(nisn)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_verval_siswa_id ON verval_lanjutan(siswa_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_verval_desil ON verval_lanjutan(desil_nasional)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_verval_instansi ON verval_lanjutan(sumber_instansi)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_verval_hambatan_nisn ON verval_hambatan(nisn)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_verval_hambatan_siswa_id ON verval_hambatan(siswa_id)`);
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

async function syncVerval() {
  console.log("\n📂 Memulai sinkronisasi data Verval Lanjutan (PATJU 360 / DTSEN)...");
  
  // 1. Ambil peta NISN -> siswa_id dari tabel siswa
  const siswaRows = await client.execute("SELECT id, nisn FROM siswa");
  const nisnMap = new Map();
  for (const s of siswaRows.rows) {
    if (s.nisn) nisnMap.set(String(s.nisn).trim(), s.id);
  }

  // File paths
  const dikbudCandidates = [
    "./VERVAL LANJUTAN DATA PBS/VERVAL_LANJUTAN_PBS_DIKBUD_PATJU360.xlsx",
    "./VERVAL LANJUTAN DATA PBS/Dikbud tes.xlsx"
  ];
  const kemenagCandidates = [
    "./VERVAL LANJUTAN DATA PBS/VERVAL_LANJUTAN_PBS_KEMENAG_PATJU360.xlsx",
    "./VERVAL LANJUTAN DATA PBS/Kemenag Tes.xlsx"
  ];

  const dikbudFile = dikbudCandidates.find(p => fs.existsSync(p));
  const kemenagFile = kemenagCandidates.find(p => fs.existsSync(p));

  if (!dikbudFile && !kemenagFile) {
    console.warn("⚠️ File Verval Dikbud/Kemenag tidak ditemukan di folder VERVAL LANJUTAN DATA PBS.");
    return;
  }

  // Bersihkan data lama
  await client.execute("DELETE FROM verval_hambatan");
  await client.execute("DELETE FROM verval_lanjutan");

  const kecs = ['KEDIRI', 'GERUNG', 'BATULAYAR', 'GUNUNGSARI', 'KURIPAN', 'LABUAPI', 'LINGSAR', 'NARMADA', 'SEKOTONG', 'LEMBAR'];
  const filesToProcess = [];
  if (dikbudFile) filesToProcess.push({ path: dikbudFile, instansi: "DIKBUD" });
  if (kemenagFile) filesToProcess.push({ path: kemenagFile, instansi: "KEMENAG" });

  let totalSiswaVerval = 0;
  let totalHambatanVerval = 0;
  const BATCH_SIZE = 100;
  let batchStatements = [];

  for (const { path: filePath, instansi } of filesToProcess) {
    const isKemenag = instansi === "KEMENAG";
    console.log(`📊 Membaca file ${instansi}: ${filePath}...`);
    const wb = XLSX.readFile(filePath);

    for (const k of kecs) {
      if (!wb.Sheets[k]) continue;
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[k], { header: 1 });
      let curStudent = null;

      for (let r = 6; r < raw.length; r++) {
        const row = raw[r];
        if (!row || !row.length) continue;

        const no = row[0];
        const nama = row[1];
        if (no !== undefined && no !== null && no !== '' && nama) {
          const nisn = String(row[3] || '').trim();
          const siswaId = nisnMap.get(nisn) || null;
          const jarakVal = typeof row[isKemenag ? 30 : 24] === 'number' 
            ? row[isKemenag ? 30 : 24] 
            : parseFloat(String(row[isKemenag ? 30 : 24] || '0').replace(',', '.')) || 0;

          curStudent = {
            siswa_id: siswaId,
            nisn: nisn,
            nik_siswa: String(row[2] || '').trim(),
            nama_siswa: String(nama).trim(),
            sumber_instansi: instansi,
            alamat_siswa: isKemenag ? String(row[9] || '').trim() : null,
            alamat_sekolah: isKemenag ? String(row[10] || '').trim() : null,
            nama_ibu: isKemenag ? String(row[11] || '').trim() : null,
            nik_ibu: isKemenag ? String(row[12] || '').trim() : null,
            nama_ayah: isKemenag ? String(row[13] || '').trim() : null,
            nik_ayah: isKemenag ? String(row[14] || '').trim() : null,
            status_patju360: String(row[isKemenag ? 15 : 9] || '').trim(),
            metode_verval: String(row[isKemenag ? 16 : 10] || '').trim(),
            desil_nasional: String(row[isKemenag ? 17 : 11] || '').trim(),
            kategori_desil: String(row[isKemenag ? 18 : 12] || '').trim(),
            desil_awal: String(row[isKemenag ? 19 : 13] || '').trim(),
            pkh: String(row[isKemenag ? 20 : 14] || '').trim(),
            bansos_sembako: String(row[isKemenag ? 21 : 15] || '').trim(),
            beasiswa_bskm: String(row[isKemenag ? 22 : 16] || '').trim(),
            pbi_jk: String(row[isKemenag ? 23 : 17] || '').trim(),
            status_medis: String(row[isKemenag ? 24 : 18] || '').trim(),
            disabilitas_dtsen: String(row[isKemenag ? 25 : 19] || '').trim(),
            puskesmas_terdekat: String(row[isKemenag ? 29 : 23] || '').trim(),
            jarak_km: jarakVal
          };

          batchStatements.push({
            sql: `INSERT INTO verval_lanjutan (
              siswa_id, nisn, nik_siswa, nama_siswa, sumber_instansi,
              alamat_siswa, alamat_sekolah, nama_ibu, nik_ibu, nama_ayah, nik_ayah,
              status_patju360, metode_verval, desil_nasional, kategori_desil, desil_awal,
              pkh, bansos_sembako, beasiswa_bskm, pbi_jk, status_medis, disabilitas_dtsen,
              puskesmas_terdekat, jarak_km
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              curStudent.siswa_id, curStudent.nisn, curStudent.nik_siswa, curStudent.nama_siswa, curStudent.sumber_instansi,
              curStudent.alamat_siswa, curStudent.alamat_sekolah, curStudent.nama_ibu, curStudent.nik_ibu, curStudent.nama_ayah, curStudent.nik_ayah,
              curStudent.status_patju360, curStudent.metode_verval, curStudent.desil_nasional, curStudent.kategori_desil, curStudent.desil_awal,
              curStudent.pkh, curStudent.bansos_sembako, curStudent.beasiswa_bskm, curStudent.pbi_jk, curStudent.status_medis, curStudent.disabilitas_dtsen,
              curStudent.puskesmas_terdekat, curStudent.jarak_km
            ]
          });
          totalSiswaVerval++;
        }

        const hCol = isKemenag ? 26 : 20;
        const kCol = isKemenag ? 27 : 21;
        const tCol = isKemenag ? 28 : 22;

        if (curStudent && row[hCol]) {
          batchStatements.push({
            sql: `INSERT INTO verval_hambatan (siswa_id, nisn, jenis_hambatan, klasifikasi, tipe_alat_rekomendasi)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [
              curStudent.siswa_id,
              curStudent.nisn,
              String(row[hCol] || '').trim(),
              String(row[kCol] || 'BERAT').trim(),
              String(row[tCol] || '').trim()
            ]
          });
          totalHambatanVerval++;
        }

        if (batchStatements.length >= BATCH_SIZE) {
          await client.batch(batchStatements, "write");
          process.stdout.write(`\r⏳ Mengimpor data Verval: ${totalSiswaVerval} siswa, ${totalHambatanVerval} rincian hambatan...`);
          batchStatements = [];
        }
      }
    }
  }

  if (batchStatements.length > 0) {
    await client.batch(batchStatements, "write");
    batchStatements = [];
  }

  console.log(`\n✅ Selesai impor Verval Lanjutan: ${totalSiswaVerval} siswa, ${totalHambatanVerval} rincian hambatan.`);
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
  } else if (args.includes("--verval-only")) {
    await syncVerval();
  } else {
    await syncPbs(pbsPath);
    await syncRapor(raporPath);
    await syncVerval();
  }

  console.log("\n🎉 Seluruh proses sinkronisasi data selesai dengan sukses!");
}

main().catch((err) => {
  console.error("\n❌ Terjadi kesalahan saat sinkronisasi:", err);
  process.exit(1);
});
