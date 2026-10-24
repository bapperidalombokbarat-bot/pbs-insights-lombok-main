import ExcelJS from "exceljs";
import logoLobarBlue from "@/assets/logo-lobar-blue.png";

export interface ParsedMedisItem {
  rowNumber: number;
  nisn: string;
  nama_siswa: string;
  dokter_pemeriksa: string;
  diagnosa: string;
  tindakan: string;
  status_rujukan: string;
  keterangan: string;
  hasDataToUpdate: boolean;
}

export interface ParseResult {
  success: boolean;
  message?: string;
  items: ParsedMedisItem[];
  totalRowsRead: number;
}

/**
 * Unduh Template Resmi Excel untuk Pengisian Rekam Medis & Intervensi Klinis
 */
export async function downloadTemplateImportExcel(rows: any[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah (Bapperida) Lombok Barat";
  wb.lastModifiedBy = "Sistem PEDULI PATJU 360";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Template Import Rekam Medis", {
    views: [{ showGridLines: true, zoomScale: 90 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
    },
  });

  // 1. EMBED LOGO LOMBOK BARAT DI KOP
  try {
    const res = await fetch(logoLobarBlue);
    const arrayBuffer = await res.arrayBuffer();
    const imgId = wb.addImage({
      buffer: arrayBuffer,
      extension: "png",
    });

    // Posisikan logo di Kolom D/E (berdampingan simetris di sisi kiri teks OPD)
    ws.addImage(imgId, {
      tl: { col: 2.8, row: 0.2 },
      ext: { width: 72, height: 72 },
    });
  } catch (err) {
    console.warn("Logo tidak dapat dimuat:", err);
  }

  // 2. KOP SURAT RESMI PEMKAB & BAPPERIDA (BARIS 1 - 5)
  ws.mergeCells("A1:J1");
  const c1 = ws.getCell("A1");
  c1.value = "PEMERINTAH KABUPATEN LOMBOK BARAT";
  c1.font = { name: "Book Antiqua", size: 12, bold: true, color: { argb: "FF0F172A" } };
  c1.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A2:J2");
  const c2 = ws.getCell("A2");
  c2.value = "BADAN PERENCANAAN PEMBANGUNAN, RISET DAN INOVASI DAERAH (BAPPERIDA)";
  c2.font = { name: "Book Antiqua", size: 13, bold: true, color: { argb: "FF1E3A8A" } };
  c2.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A3:J3");
  const c3 = ws.getCell("A3");
  c3.value = "Bidang Pemerintahan dan Pembangunan Manusia (P2M)";
  c3.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF334155" } };
  c3.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A4:J4");
  const c4 = ws.getCell("A4");
  c4.value = "Jl. Soekarno - Hatta No. 1, Giri Menang, Gerung, Kabupaten Lombok Barat, NTB · Kode Pos: 83363";
  c4.font = { name: "Book Antiqua", size: 9.5, italic: true, color: { argb: "FF64748B" } };
  c4.alignment = { vertical: "middle", horizontal: "center" };

  // Garis Pembatas Kop Surat
  ws.mergeCells("A5:J5");
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

  // 3. JUDUL TEMPLATE
  ws.mergeCells("A7:J7");
  const c7 = ws.getCell("A7");
  c7.value = "FORMAT TEMPLATE IMPORT REKAM MEDIS & RUJUKAN KLINIS DOKTER (PATJU 360)";
  c7.font = { name: "Book Antiqua", size: 12.5, bold: true, color: { argb: "FF1E3A8A" } };
  c7.alignment = { vertical: "middle", horizontal: "center" };
  c7.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0FDF4" }, // Emerald 50
  };
  ws.getRow(7).height = 26;

  // 4. KOTAK PETUNJUK PENGISIAN
  ws.mergeCells("A9:J11");
  const cPetunjuk = ws.getCell("A9");
  cPetunjuk.value = 
    "PETUNJUK PENGISIAN FORMAT IMPORT:\n" +
    "1. Kolom B (NISN) digunakan sebagai Kunci Identifikasi Siswa. JANGAN MENGUBAH ATAU MENGHAPUS NISN karena data profil dan kemiskinan (DTSEN) tetap terlindungi utuh.\n" +
    "2. Isi Kolom F s/d J (Dokter Pemeriksa, Diagnosa Medis, Tindakan Medis / Terapi, Status Rujukan, Keterangan Intervensi) sesuai hasil pemeriksaan dokter/Puskesmas.\n" +
    "3. Standar Status Rujukan: 'Belum Ada Rujukan' | 'Selesai di FKTP' | 'Dirujuk ke RSUD' | 'Perlu Alat Bantu' | 'Terapi Rutin'.";
  cPetunjuk.font = { name: "Book Antiqua", size: 9.5, italic: true, color: { argb: "FF1E293B" } };
  cPetunjuk.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  cPetunjuk.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" },
  };
  cPetunjuk.border = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  ws.getRow(9).height = 20;
  ws.getRow(10).height = 20;
  ws.getRow(11).height = 20;
  ws.getRow(12).height = 8; // Spasi kosong

  // 5. STRUKTUR NESTED HEADERS (BARIS 13 & 14)
  // GROUP LEVEL 1 (BARIS 13)
  ws.mergeCells("A13:A14");
  ws.getCell("A13").value = "NO";

  ws.mergeCells("B13:E13");
  ws.getCell("B13").value = "DATA IDENTITAS PESERTA DIDIK (REFERENSI SISTEM)";

  ws.mergeCells("F13:J13");
  ws.getCell("F13").value = "LEMBAR PEMERIKSAAN MEDIS & RUJUKAN KLINIS DOKTER (DIISI OLEH PUSKESMAS / DIKES)";

  // SUB-HEADERS LEVEL 2 (BARIS 14)
  const subHeaders: Record<string, string> = {
    B14: "NISN (Kunci Siswa)",
    C14: "Nama Siswa",
    D14: "Satuan Pendidikan (Sekolah)",
    E14: "Kecamatan",
    F14: "Dokter Pemeriksa",
    G14: "Diagnosa Medis",
    H14: "Tindakan Medis / Terapi",
    I14: "Status Rujukan",
    J14: "Keterangan Intervensi",
  };

  Object.entries(subHeaders).forEach(([cellKey, title]) => {
    ws.getCell(cellKey).value = title;
  });

  const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  // Styling Row 13 (Group Header)
  ws.getRow(13).height = 30;
  colLetters.forEach((col) => {
    const cell = ws.getCell(`${col}13`);
    const isMedis = ["F", "G", "H", "I", "J"].includes(col);
    cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isMedis ? "FF047857" : "FF1E3A8A" }, // Emerald Green for Medis, Navy for Siswa
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FF475569" } },
      right: { style: "thin", color: { argb: "FF475569" } },
    };
  });

  // Styling Row 14 (Sub-headers)
  ws.getRow(14).height = 28;
  colLetters.forEach((col) => {
    const cell = ws.getCell(`${col}14`);
    const isMedis = ["F", "G", "H", "I", "J"].includes(col);
    cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isMedis ? "FF059669" : "FF0284C7" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFFFF" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF0369A1" } },
      right: { style: "thin", color: { argb: "FF0369A1" } },
    };
  });

  // ATUR LEBAR KOLOM
  const colWidths: Record<string, number> = {
    A: 7,   // No
    B: 20,  // NISN
    C: 32,  // Nama
    D: 34,  // Sekolah
    E: 18,  // Kecamatan
    F: 26,  // Dokter Pemeriksa
    G: 32,  // Diagnosa Medis
    H: 34,  // Tindakan Medis / Terapi
    I: 26,  // Status Rujukan
    J: 32,  // Keterangan Intervensi
  };

  Object.entries(colWidths).forEach(([col, width]) => {
    ws.getColumn(col).width = width;
  });

  // 6. ISI DATA SISWA (BARIS 15++)
  rows.forEach((r, idx) => {
    const rowNum = idx + 1;
    const rowValues = [
      rowNum,
      r.nisn || "",
      r.nama_siswa || "",
      r.satuan_pendidikan || "",
      r.kecamatan || "",
      r.dokter_pemeriksa || "",
      r.diagnosa || "",
      r.tindakan || "",
      r.status_rujukan || "Belum Ada Rujukan",
      r.keterangan || "",
    ];

    const row = ws.addRow(rowValues);
    row.height = 25;

    const isEven = idx % 2 === 1;
    const bgArgb = isEven ? "FFF8FAFC" : "FFFFFFFF";

    colLetters.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      const isMedisCol = ["F", "G", "H", "I", "J"].includes(col);
      
      cell.font = { 
        name: "Book Antiqua", 
        size: 11, 
        color: { argb: isMedisCol ? "FF0F172A" : "FF334155" } 
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isMedisCol && !isEven ? "FFF0FDF4" : bgArgb },
      };

      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (["A", "B", "E", "F", "I"].includes(col)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  });

  // 7. GENERATE BUFFER DAN TRIGGER DOWNLOAD
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Template_Import_Rekam_Medis_PATJU360_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Parsing berkas Excel (.xlsx) yang diunggah user
 * Fleksibel mendukung format Template maupun format Full Export Intervensi
 */
export async function parseIntervensiExcel(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const ws = wb.worksheets[0];
    if (!ws) {
      return { success: false, message: "Berkas Excel tidak memiliki sheet yang valid.", items: [], totalRowsRead: 0 };
    }

    // 1. Ekstrak seluruh baris ke bentuk array sederhana
    const sheetData: any[][] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values: any[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let cellVal = cell.value;
        // Tangani formula atau rich text jika ada
        if (cellVal && typeof cellVal === "object") {
          if ("result" in cellVal) cellVal = (cellVal as any).result;
          else if ("richText" in cellVal) cellVal = (cellVal as any).richText.map((t: any) => t.text).join("");
          else if ("text" in cellVal) cellVal = (cellVal as any).text;
        }
        values[colNumber - 1] = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : "";
      });
      sheetData[rowNumber - 1] = values;
    });

    // 2. Cari baris header yang memuat NISN dan kolom medis
    let headerRowIdx = -1;
    let colNisn = -1;
    let colNama = -1;
    let colDokter = -1;
    let colDiagnosa = -1;
    let colTindakan = -1;
    let colRujukan = -1;
    let colKet = -1;

    for (let r = 0; r < sheetData.length; r++) {
      const row = sheetData[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim().toLowerCase();
        if (val === "nisn" || val.startsWith("nisn")) colNisn = c;
        else if (val.includes("dokter")) colDokter = c;
        else if (val.includes("diagnosa") || val.includes("diagnosis")) colDiagnosa = c;
        else if (val.includes("tindakan") || val.includes("terapi")) colTindakan = c;
        else if (val.includes("rujukan")) colRujukan = c;
        else if (val.includes("keterangan") || val.includes("intervensi")) colKet = c;
        else if (val.includes("nama") && val.includes("siswa")) colNama = c;
      }

      // Jika baris ini memiliki NISN dan setidaknya 1 kolom medis, berarti ini header!
      if (colNisn !== -1 && (colDokter !== -1 || colDiagnosa !== -1 || colTindakan !== -1 || colRujukan !== -1 || colKet !== -1)) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1 || colNisn === -1) {
      return {
        success: false,
        message: "Kolom 'NISN' atau kolom hasil pemeriksaan medis tidak terdeteksi pada berkas Excel. Pastikan menggunakan format template yang disediakan.",
        items: [],
        totalRowsRead: 0,
      };
    }

    // 3. Baca data siswa di bawah baris header
    const items: ParsedMedisItem[] = [];
    let totalRead = 0;

    for (let r = headerRowIdx + 1; r < sheetData.length; r++) {
      const row = sheetData[r] || [];
      if (!row || row.length === 0) continue;

      const rawNisn = String(row[colNisn] || "").trim();
      // Bersihkan NISN: ambil angka atau string bersih
      const nisn = rawNisn.replace(/[^0-9a-zA-Z]/g, "");

      if (!nisn || nisn.length < 5) continue; // Lewati baris kosong / header berulang / catatan footer
      totalRead++;

      const nama_siswa = colNama !== -1 ? String(row[colNama] || "").trim() : "";
      const dokter_pemeriksa = colDokter !== -1 ? String(row[colDokter] || "").trim() : "";
      const diagnosa = colDiagnosa !== -1 ? String(row[colDiagnosa] || "").trim() : "";
      const tindakan = colTindakan !== -1 ? String(row[colTindakan] || "").trim() : "";
      const status_rujukan = colRujukan !== -1 ? String(row[colRujukan] || "").trim() : "";
      const keterangan = colKet !== -1 ? String(row[colKet] || "").trim() : "";

      const hasDataToUpdate = Boolean(
        dokter_pemeriksa || diagnosa || tindakan || 
        (status_rujukan && status_rujukan !== "Belum Ada Rujukan") || 
        keterangan
      );

      items.push({
        rowNumber: r + 1,
        nisn,
        nama_siswa,
        dokter_pemeriksa,
        diagnosa,
        tindakan,
        status_rujukan: status_rujukan || "Belum Ada Rujukan",
        keterangan,
        hasDataToUpdate,
      });
    }

    return {
      success: true,
      items,
      totalRowsRead: totalRead,
    };
  } catch (err: any) {
    console.error("Gagal parsing Excel:", err);
    return {
      success: false,
      message: "Terjadi kesalahan saat membaca file Excel: " + (err?.message || "Format file tidak didukung"),
      items: [],
      totalRowsRead: 0,
    };
  }
}
