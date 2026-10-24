import ExcelJS from "exceljs";
import logoLobarBlue from "@/assets/logo-lobar-blue.png";

export interface ExportFilterOptions {
  q: string;
  kec: string;
  instansi: string;
  jenjang: string;
  desil: string;
  bskm: string;
  pbiJk: string;
  jarakKat: string;
  selectedYear: string | number;
}

export async function exportIntervensiToExcel(
  filters: ExportFilterOptions,
  rows: any[],
  hambatanMap: Map<string, any[]>
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah (Bapperida) Lombok Barat";
  wb.lastModifiedBy = "Sistem PEDULI PATJU 360";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Data Intervensi Prioritas", {
    views: [{ showGridLines: true, zoomScale: 85 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
    },
  });

  // 1. EMBED LOGO LOMBOK BARAT DI KOP (DIDEKATKAN DENGAN NAMA OPD)
  try {
    const res = await fetch(logoLobarBlue);
    const arrayBuffer = await res.arrayBuffer();
    const imgId = wb.addImage({
      buffer: arrayBuffer,
      extension: "png",
    });

    // Posisikan logo di Kolom N (tepat di sisi kiri nama OPD Bapperida)
    ws.addImage(imgId, {
      tl: { col: 13.0, row: 0.2 },
      ext: { width: 72, height: 72 },
    });
  } catch (err) {
    console.warn("Logo tidak dapat dimuat:", err);
  }

  // 2. KOP SURAT RESMI PEMKAB & BAPPERIDA (BARIS 1 - 5)
  ws.mergeCells("A1:AC1");
  const c1 = ws.getCell("A1");
  c1.value = "PEMERINTAH KABUPATEN LOMBOK BARAT";
  c1.font = { name: "Book Antiqua", size: 12, bold: true, color: { argb: "FF0F172A" } };
  c1.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A2:AC2");
  const c2 = ws.getCell("A2");
  c2.value = "BADAN PERENCANAAN PEMBANGUNAN, RISET DAN INOVASI DAERAH (BAPPERIDA)";
  c2.font = { name: "Book Antiqua", size: 13, bold: true, color: { argb: "FF1E3A8A" } };
  c2.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A3:AC3");
  const c3 = ws.getCell("A3");
  c3.value = "Bidang Pemerintahan dan Pembangunan Manusia (P2M)";
  c3.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF334155" } };
  c3.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A4:AC4");
  const c4 = ws.getCell("A4");
  c4.value = "Jl. Soekarno - Hatta No. 1, Giri Menang, Gerung, Kabupaten Lombok Barat, NTB · Kode Pos: 83363";
  c4.font = { name: "Book Antiqua", size: 9.5, italic: true, color: { argb: "FF64748B" } };
  c4.alignment = { vertical: "middle", horizontal: "center" };

  // Garis Pembatas Kop Surat
  ws.mergeCells("A5:AC5");
  const c5 = ws.getCell("A5");
  c5.border = {
    bottom: { style: "double", color: { argb: "FF1E293B" } },
  };

  ws.getRow(1).height = 20;
  ws.getRow(2).height = 24;
  ws.getRow(3).height = 18;
  ws.getRow(4).height = 17;
  ws.getRow(5).height = 6;
  ws.getRow(6).height = 8; // Spasi kosong

  // 3. JUDUL LAPORAN & DOKUMEN (SESUAI FILTER YANG DITERAPKAN)
  let titleFilterDeskripsi = "";
  if (filters.instansi !== "Semua") {
    titleFilterDeskripsi += ` ${filters.instansi}`;
  }
  if (filters.jenjang !== "Semua") {
    titleFilterDeskripsi += ` - JENJANG ${filters.jenjang}`;
  }
  if (filters.kec !== "Semua") {
    titleFilterDeskripsi += ` - KECAMATAN ${filters.kec.toUpperCase()}`;
  }

  ws.mergeCells("A7:AC7");
  const c7 = ws.getCell("A7");
  c7.value = `LAPORAN DATA INTERVENSI PRIORITAS (PATJU 360)${titleFilterDeskripsi ? " · " + titleFilterDeskripsi : ""}`;
  c7.font = { name: "Book Antiqua", size: 13, bold: true, color: { argb: "FF1E3A8A" } };
  c7.alignment = { vertical: "middle", horizontal: "center" };
  c7.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F7FF" },
  };
  ws.getRow(7).height = 26;

  ws.mergeCells("A8:AC8");
  const c8 = ws.getCell("A8");
  c8.value = `Sistem Data Terpadu Peserta Didik Inklusi (PEDULI) Kabupaten Lombok Barat · Tahun Anggaran ${filters.selectedYear}`;
  c8.font = { name: "Book Antiqua", size: 11, italic: true, color: { argb: "FF475569" } };
  c8.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(8).height = 20;

  // 4. KOTAK INFORMASI FILTER YANG DITERAPKAN (METADATA TARIKAN DATA)
  ws.mergeCells("A10:E10");
  ws.getCell("A10").value = `Instansi Pembina : ${filters.instansi === "Semua" ? "Semua (Dikbud & Kemenag)" : filters.instansi}`;
  ws.getCell("A10").font = { name: "Book Antiqua", size: 10.5, bold: true, color: { argb: "FF1E293B" } };

  ws.mergeCells("F10:J10");
  ws.getCell("F10").value = `Jenjang Pendidikan : ${filters.jenjang === "Semua" ? "Semua Jenjang" : filters.jenjang}`;
  ws.getCell("F10").font = { name: "Book Antiqua", size: 10.5, bold: true, color: { argb: "FF1E293B" } };

  ws.mergeCells("K10:O10");
  ws.getCell("K10").value = `Wilayah Kecamatan : ${filters.kec === "Semua" ? "Semua Kecamatan" : filters.kec}`;
  ws.getCell("K10").font = { name: "Book Antiqua", size: 10.5, bold: true, color: { argb: "FF1E293B" } };

  ws.mergeCells("P10:T10");
  ws.getCell("P10").value = `Status Desil DTSEN : ${filters.desil === "Semua" ? "Semua Desil" : filters.desil === "1" ? "Desil 1 (Ekstrem)" : filters.desil === "2" ? "Desil 2 (Sangat Miskin)" : filters.desil}`;
  ws.getCell("P10").font = { name: "Book Antiqua", size: 10.5, bold: true, color: { argb: "FF1E293B" } };

  ws.mergeCells("U10:AC10");
  ws.getCell("U10").value = `Waktu Ekspor : ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} Pukul ${new Date().toLocaleTimeString("id-ID")}`;
  ws.getCell("U10").font = { name: "Book Antiqua", size: 10, italic: true, color: { argb: "FF475569" } };

  ws.mergeCells("A11:E11");
  ws.getCell("A11").value = `Beasiswa BSKM : ${filters.bskm === "Semua" ? "Semua Status" : filters.bskm === "Belum" ? "Belum Menerima (Prioritas)" : "Sudah Menerima"}`;
  ws.getCell("A11").font = { name: "Book Antiqua", size: 10, color: { argb: "FF475569" } };

  ws.mergeCells("F11:J11");
  ws.getCell("F11").value = `BPJS PBI-JK : ${filters.pbiJk === "Semua" ? "Semua Status" : filters.pbiJk === "Belum" ? "Belum Tercover (Prioritas)" : "Sudah Tercover"}`;
  ws.getCell("F11").font = { name: "Book Antiqua", size: 10, color: { argb: "FF475569" } };

  ws.mergeCells("K11:O11");
  ws.getCell("K11").value = `Jarak ke FKTP : ${filters.jarakKat === "Semua" ? "Semua Jarak" : filters.jarakKat}`;
  ws.getCell("K11").font = { name: "Book Antiqua", size: 10, color: { argb: "FF475569" } };

  ws.mergeCells("P11:T11");
  ws.getCell("P11").value = `Kata Kunci Pencarian : ${filters.q ? `"${filters.q}"` : "Tidak Ada"}`;
  ws.getCell("P11").font = { name: "Book Antiqua", size: 10, color: { argb: "FF475569" } };

  ws.mergeCells("U11:AC11");
  ws.getCell("U11").value = `Jumlah Data Terfilter : ${rows.length} Siswa Terdaftar`;
  ws.getCell("U11").font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF047857" } };

  ws.getRow(10).height = 19;
  ws.getRow(11).height = 19;
  ws.getRow(12).height = 8; // Spasi kosong

  // 5. STRUKTUR NESTED TABLE HEADER (BARIS 13 & 14)
  // LEVEL 1: GROUP HEADERS (Row 13)
  ws.mergeCells("A13:A14");
  ws.getCell("A13").value = "NO";

  ws.mergeCells("B13:F13");
  ws.getCell("B13").value = "IDENTITAS PESERTA DIDIK";

  ws.mergeCells("G13:L13");
  ws.getCell("G13").value = "SATUAN PENDIDIKAN & WILAYAH";

  ws.mergeCells("M13:R13");
  ws.getCell("M13").value = "STATUS SOSIAL & KEMISKINAN (DTSEN)";

  ws.mergeCells("S13:V13");
  ws.getCell("S13").value = "STATUS KESEHATAN & HAMBATAN PBS";

  ws.mergeCells("W13:X13");
  ws.getCell("W13").value = "AKSESIBILITAS FKTP";

  ws.mergeCells("Y13:AC13");
  ws.getCell("Y13").value = "LEMBAR REKAM MEDIS & RUJUKAN KLINIS DOKTER";

  // LEVEL 2: SUB-HEADERS (Row 14)
  const subHeaders: Record<string, string> = {
    B14: "Nama Siswa",
    C14: "NISN",
    D14: "NIK Siswa",
    E14: "Jenis Kelamin",
    F14: "Alamat Domisili Siswa",
    G14: "Instansi",
    H14: "Satuan Pendidikan (Sekolah)",
    I14: "Jenjang",
    J14: "Kelas",
    K14: "Kecamatan",
    L14: "Alamat Sekolah",
    M14: "Desil Nasional",
    N14: "Kategori Desil",
    O14: "Desil Awal",
    P14: "Beasiswa BSKM",
    Q14: "BPJS PBI-JK",
    R14: "Bansos PKH/BPNT",
    S14: "Penyakit Kronis",
    T14: "Disabilitas DTSEN",
    U14: "Rincian Hambatan Berat",
    V14: "Rekomendasi Alat Bantu",
    W14: "Puskesmas Rujukan (FKTP)",
    X14: "Jarak (KM)",
    Y14: "Dokter Pemeriksa",
    Z14: "Diagnosa Medis",
    AA14: "Tindakan Medis / Terapi",
    AB14: "Status Rujukan",
    AC14: "Keterangan Intervensi",
  };

  Object.entries(subHeaders).forEach(([cellKey, title]) => {
    ws.getCell(cellKey).value = title;
  });

  // STYLING ROW 13 (GROUP HEADERS)
  ws.getRow(13).height = 30;
  const colLetters = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", 
    "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", 
    "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC"
  ];

  colLetters.forEach((col) => {
    const cell = ws.getCell(`${col}13`);
    cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Dark Navy Blue
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FF475569" } },
      right: { style: "thin", color: { argb: "FF475569" } },
    };
  });

  // STYLING ROW 14 (SUB HEADERS)
  ws.getRow(14).height = 28;
  colLetters.forEach((col) => {
    const cell = ws.getCell(`${col}14`);
    cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0284C7" }, // Ocean Blue
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFFFF" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF0369A1" } },
      right: { style: "thin", color: { argb: "FF0369A1" } },
    };
  });

  // ATUR LEBAR KOLOM (DISESUAIKAN DENGAN BOOK ANTIQUA 11 PT)
  const colWidths: Record<string, number> = {
    A: 7,   // No
    B: 32,  // Nama Siswa
    C: 18,  // NISN
    D: 22,  // NIK Siswa
    E: 16,  // Jenis Kelamin
    F: 32,  // Alamat Domisili Siswa
    G: 14,  // Instansi
    H: 34,  // Satuan Pendidikan (Sekolah)
    I: 13,  // Jenjang
    J: 12,  // Kelas
    K: 18,  // Kecamatan
    L: 30,  // Alamat Sekolah
    M: 20,  // Desil Nasional
    N: 22,  // Kategori Desil
    O: 16,  // Desil Awal
    P: 18,  // Beasiswa BSKM
    Q: 20,  // BPJS PBI-JK
    R: 22,  // Bansos PKH/BPNT
    S: 26,  // Penyakit Kronis
    T: 26,  // Disabilitas DTSEN
    U: 36,  // Hambatan Berat PBS
    V: 32,  // Rekomendasi Alat Bantu
    W: 30,  // Puskesmas Rujukan (FKTP)
    X: 15,  // Jarak (KM)
    Y: 26,  // Dokter Pemeriksa
    Z: 32,  // Diagnosa Medis
    AA: 34, // Tindakan Medis / Terapi
    AB: 26, // Status Rujukan
    AC: 32, // Keterangan Intervensi
  };

  Object.entries(colWidths).forEach(([col, width]) => {
    ws.getColumn(col).width = width;
  });

  // 6. ISI DATA SISWA (BARIS 15++)
  const formatJenjang = (j: string, inst?: string) => {
    if (!j) return "—";
    if (inst === "KEMENAG") {
      if (j === "SD/MI" || j === "SD") return "MI";
      if (j === "SMP/MTS" || j === "SMP") return "MTs";
      if (j === "TK") return "RA";
    } else if (inst === "DIKBUD") {
      if (j === "SD/MI" || j === "SD") return "SD";
      if (j === "SMP/MTS" || j === "SMP") return "SMP";
      if (j === "TK") return "TK";
    }
    return j;
  };

  let currentRowIdx = 15;

  rows.forEach((r, idx) => {
    const rowNum = idx + 1;
    const hList = hambatanMap.get(r.nisn) || [];
    const hambatanText = hList.map((h) => `${h.jenis_hambatan} (${h.klasifikasi || "BERAT"})`).join("; ") || "—";
    const alatText = hList.map((h) => h.tipe_alat_rekomendasi).filter(Boolean).join("; ") || "—";

    const bansosText = [
      r.pkh?.startsWith("YA") ? "PKH" : null,
      r.bansos_sembako?.startsWith("YA") ? "Sembako/BPNT" : null,
    ].filter(Boolean).join(" & ") || "TIDAK ADA";

    const rowValues = [
      rowNum,
      r.nama_siswa || "—",
      r.nisn || "—",
      r.nik_siswa || "—",
      r.jenis_kelamin || "—",
      r.alamat_siswa || "—",
      r.sumber_instansi || "—",
      r.satuan_pendidikan || "—",
      formatJenjang(r.jenjang, r.sumber_instansi),
      r.tingkat_kelas || "—",
      r.kecamatan || "—",
      r.alamat_sekolah || "—",
      r.desil_nasional === "1" ? "Desil 1 (Ekstrem)" : r.desil_nasional === "2" ? "Desil 2 (Sangat Miskin)" : r.desil_nasional ? `Desil ${r.desil_nasional}` : "Belum Ada",
      r.kategori_desil || "Reguler",
      r.desil_awal ? `Desil ${r.desil_awal}` : "—",
      r.beasiswa_bskm || "TIDAK",
      r.pbi_jk === "YA" ? "SUDAH PBI-JK" : "BELUM PBI-JK",
      bansosText,
      r.status_medis || "TIDAK ADA",
      r.disabilitas_dtsen || "TERVERIFIKASI PBS",
      hambatanText,
      alatText,
      r.puskesmas_terdekat || "—",
      r.jarak_km ? `${r.jarak_km} KM` : "—",
      r.dokter_pemeriksa || "—",
      r.diagnosa || "—",
      r.tindakan || "—",
      r.status_rujukan || "Belum Ada Rujukan",
      r.keterangan || "—",
    ];

    const row = ws.addRow(rowValues);
    row.height = 25;

    const isEven = idx % 2 === 1;
    const bgArgb = isEven ? "FFF8FAFC" : "FFFFFFFF";

    // Styling sel data (Book Antiqua 11 pt)
    colLetters.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.font = { name: "Book Antiqua", size: 11, color: { argb: "FF0F172A" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgArgb },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Alignment berdasarkan tipe data
      if (["A", "C", "D", "E", "G", "I", "J", "K", "M", "N", "O", "P", "Q", "R", "X", "AB"].includes(col)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Khusus Desil 1 & 2 diberi highlight lembut
      if (col === "M") {
        if (r.desil_nasional === "1") {
          cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFB91C1C" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
        } else if (r.desil_nasional === "2") {
          cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFB45309" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        }
      }

      // Khusus BSKM Belum Menerima diberi highlight oranye
      if (col === "P" && (!r.beasiswa_bskm || r.beasiswa_bskm === "TIDAK")) {
        cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFC2410C" } };
      }
    });

    currentRowIdx++;
  });

  // 7. LEMBAR TANDA TANGAN & PENGESAHAN OPD DI BAGIAN BAWAH
  const signRowStart = currentRowIdx + 2;

  // Catatan Kiri
  ws.mergeCells(`B${signRowStart}:F${signRowStart}`);
  ws.getCell(`B${signRowStart}`).value = "Catatan Sistem:";
  ws.getCell(`B${signRowStart}`).font = { name: "Book Antiqua", size: 10.5, bold: true, color: { argb: "FF334155" } };

  ws.mergeCells(`B${signRowStart + 1}:F${signRowStart + 2}`);
  ws.getCell(`B${signRowStart + 1}`).value = 
    "Data ini merupakan hasil sinkronisasi verifikasi validasi terpadu Program PATJU 360 kolaborasi Bapperida, DikesPPKB, Dikbud, Kemenag, dan Dinsos Kab. Lombok Barat.";
  ws.getCell(`B${signRowStart + 1}`).font = { name: "Book Antiqua", size: 10, italic: true, color: { argb: "FF64748B" } };
  ws.getCell(`B${signRowStart + 1}`).alignment = { vertical: "top", horizontal: "left", wrapText: true };

  // Tanda Tangan Kanan (Bapperida Lombok Barat)
  const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  
  ws.mergeCells(`W${signRowStart}:AC${signRowStart}`);
  const s1 = ws.getCell(`W${signRowStart}`);
  s1.value = `Gerung, ${todayStr}`;
  s1.font = { name: "Book Antiqua", size: 11, bold: true };
  s1.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`W${signRowStart + 1}:AC${signRowStart + 1}`);
  const s2 = ws.getCell(`W${signRowStart + 1}`);
  s2.value = "KEPALA BADAN PERENCANAAN PEMBANGUNAN, RISET DAN INOVASI DAERAH";
  s2.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
  s2.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`W${signRowStart + 2}:AC${signRowStart + 2}`);
  const s3 = ws.getCell(`W${signRowStart + 2}`);
  s3.value = "KABUPATEN LOMBOK BARAT";
  s3.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
  s3.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`W${signRowStart + 6}:AC${signRowStart + 6}`);
  const s4 = ws.getCell(`W${signRowStart + 6}`);
  s4.value = "( ............................................................................ )";
  s4.font = { name: "Book Antiqua", size: 11, bold: true };
  s4.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`W${signRowStart + 7}:AC${signRowStart + 7}`);
  const s5 = ws.getCell(`W${signRowStart + 7}`);
  s5.value = "NIP. ..............................................................";
  s5.font = { name: "Book Antiqua", size: 10.5 };
  s5.alignment = { horizontal: "center", vertical: "middle" };

  // 8. GENERATE BUFFER DAN TRIGGER DOWNLOAD DI BROWSER
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;

  // Nama File Sesuai Filter
  let filenameParts = ["PATJU360_Intervensi"];
  if (filters.instansi !== "Semua") filenameParts.push(filters.instansi);
  if (filters.jenjang !== "Semua") filenameParts.push(filters.jenjang.replace(/[^a-zA-Z0-9]/g, ""));
  if (filters.kec !== "Semua") filenameParts.push(filters.kec.replace(/[^a-zA-Z0-9]/g, ""));
  if (filters.desil !== "Semua") filenameParts.push(`Desil${filters.desil.replace(/[^0-9]/g, "")}`);
  
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  filenameParts.push(dateStamp);

  anchor.download = `${filenameParts.join("_")}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
