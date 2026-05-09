import * as XLSX from 'xlsx/xlsx.mjs';
import fs from 'fs';
import initSqlJs from 'sql.js';

async function permanentImport() {
  const excelFile = './Rekapitulasi Pengisian PBS_KAB. LOMBOK BARAT_1778067446.xlsx';
  const dbPath = './public/data/pbs.db';

  if (!fs.existsSync(excelFile)) {
    console.error('File Excel tidak ditemukan');
    return;
  }

  const SQL = await initSqlJs();
  const dbData = fs.readFileSync(dbPath);
  const db = new SQL.Database(new Uint8Array(dbData));

  // Ambil data Excel
  const excelData = fs.readFileSync(excelFile);
  const workbook = XLSX.read(excelData, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`Memproses ${rows.length} data untuk impor permanen...`);

  // Bersihkan data lama
  db.run("DELETE FROM hambatan_siswa");
  db.run("DELETE FROM siswa");

  const insertSiswa = db.prepare(`
    INSERT INTO siswa (id, nama_siswa, nisn, satuan_pendidikan, kecamatan, jenjang, tingkat_kelas, jenis_kelamin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHambatan = db.prepare(`
    INSERT INTO hambatan_siswa (siswa_id, jenis_hambatan, tingkat_hambatan)
    VALUES (?, ?, ?)
  `);

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

  let count = 0;
  for (const row of rows) {
    const id = count + 1;
    const nama = row["Nama Peserta Didik"] || row["Nama Siswa"] || row["Nama"] || row["nama_siswa"];
    const nisn = row["NISN"] || "";
    const sekolah = row["Satuan Pendidikan"] || row["Sekolah"] || "";
    const kecamatan = row["Kecamatan"] || "";
    const jenjang = row["Jenjang"] || row["jenjang"] || "";
    const kelas = row["Kelas"] || row["Tingkat Kelas"] || "";
    const jk = row["Jenis Kelamin"] || "";

    if (!nama) continue;

    insertSiswa.run([id, nama, nisn, sekolah, kecamatan, jenjang, kelas, jk]);

    const studentDifficulties = [];
    let totalScore = 0;

    HAMBATAN_COLS.forEach(col => {
      let val = row[col];
      if (val && val !== "Tidak ada" && val !== "-" && val !== "Tidak Ada Kesulitan" && val !== "Tidak ada kesulitan") {
        let score = 0;
        if (val === "Sedikit Kesulitan") score = 1;
        else if (val === "Banyak Kesulitan") score = 3;
        else if (val === "Tidak Bisa Sama Sekali") score = 5;
        
        totalScore += score;
        studentDifficulties.push({ col, val });
      }
    });

    let finalCategory = "Ringan";
    if (totalScore >= 9) finalCategory = "Berat";
    else if (totalScore >= 4) finalCategory = "Sedang";
    else if (totalScore >= 1) finalCategory = "Ringan";

    studentDifficulties.forEach(h => {
      if (totalScore >= 1) { // Only insert if there's at least some difficulty
        insertHambatan.run([id, h.col, finalCategory]);
      }
    });

    count++;
  }

  insertSiswa.free();
  insertHambatan.free();

  const binaryData = db.export();
  fs.writeFileSync(dbPath, Buffer.from(binaryData));
  console.log(`Berhasil mengimpor ${count} data secara permanen ke pbs.db`);
}

permanentImport().catch(console.error);
