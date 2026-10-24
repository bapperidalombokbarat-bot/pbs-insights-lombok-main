import ExcelJS from "exceljs";
import logoLobarBlue from "@/assets/logo-lobar-blue.png";

export interface ExportSiswaFilterOptions {
  q: string;
  kec: string;
  jenjang: string;
  kelamin: string;
  tingkat: string;
  filterVerval: "semua" | "verval";
  selectedYear: string | number;
}

export async function exportSiswaToExcel(
  filters: ExportSiswaFilterOptions,
  rows: any[],
  hambMap: Map<number, any[]>,
  alatMap: Map<string, string>
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah (Bapperida) Lombok Barat";
  wb.lastModifiedBy = "Sistem PEDULI PATJU 360";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Data Siswa PBS", {
    views: [{ showGridLines: true, zoomScale: 85 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
    },
  });

  // 1. EMBED LOGO LOMBOK BARAT DI KOP (BERSANDING DEKAT NAMA OPD)
  try {
    const res = await fetch(logoLobarBlue);
    const arrayBuffer = await res.arrayBuffer();
    const imgId = wb.addImage({
      buffer: arrayBuffer,
      extension: "png",
    });

    // Posisikan logo di Kolom G (berdampingan simetris di sisi kiri nama OPD Bapperida)
    ws.addImage(imgId, {
      tl: { col: 6.6, row: 0.2 },
      ext: { width: 72, height: 72 },
    });
  } catch (err) {
    console.warn("Logo tidak dapat dimuat:", err);
  }

  // 2. KOP SURAT RESMI PEMKAB & BAPPERIDA (BARIS 1 - 5)
  ws.mergeCells("A1:R1");
  const c1 = ws.getCell("A1");
  c1.value = "PEMERINTAH KABUPATEN LOMBOK BARAT";
  c1.font = { name: "Book Antiqua", size: 12, bold: true, color: { argb: "FF0F172A" } };
  c1.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A2:R2");
  const c2 = ws.getCell("A2");
  c2.value = "BADAN PERENCANAAN PEMBANGUNAN, RISET DAN INOVASI DAERAH (BAPPERIDA)";
  c2.font = { name: "Book Antiqua", size: 13, bold: true, color: { argb: "FF1E3A8A" } };
  c2.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A3:R3");
  const c3 = ws.getCell("A3");
  c3.value = "Bidang Pemerintahan dan Pembangunan Manusia (P2M)";
  c3.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF334155" } };
  c3.alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A4:R4");
  const c4 = ws.getCell("A4");
  c4.value = "Jl. Soekarno - Hatta No. 1, Giri Menang, Gerung, Kabupaten Lombok Barat, NTB · Kode Pos: 83363";
  c4.font = { name: "Book Antiqua", size: 9.5, italic: true, color: { argb: "FF64748B" } };
  c4.alignment = { vertical: "middle", horizontal: "center" };

  // Garis Pembatas Kop Surat
  ws.mergeCells("A5:R5");
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
  if (filters.filterVerval === "verval") {
    titleFilterDeskripsi += " · KHUSUS TERVERIFIKASI PATJU 360";
  }
  if (filters.kec !== "Semua") {
    titleFilterDeskripsi += ` - KECAMATAN ${filters.kec.toUpperCase()}`;
  }
  if (filters.jenjang !== "Semua") {
    titleFilterDeskripsi += ` - JENJANG ${filters.jenjang}`;
  }
  if (filters.tingkat !== "Semua") {
    titleFilterDeskripsi += ` - HAMBATAN ${filters.tingkat.toUpperCase()}`;
  }

  ws.mergeCells("A7:R7");
  const c7 = ws.getCell("A7");
  c7.value = `LAPORAN DATA PESERTA DIDIK BERKEBUTUHAN KHUSUS (PBS)${titleFilterDeskripsi ? titleFilterDeskripsi : ""}`;
  c7.font = { name: "Book Antiqua", size: 13, bold: true, color: { argb: "FF1E3A8A" } };
  c7.alignment = { vertical: "middle", horizontal: "center" };
  c7.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F7FF" },
  };
  ws.getRow(7).height = 26;

  ws.mergeCells("A8:R8");
  const c8 = ws.getCell("A8");
  c8.value = `Sistem Data Terpadu Peserta Didik Inklusi (PEDULI) Kabupaten Lombok Barat · Tahun Anggaran ${filters.selectedYear}`;
  c8.font = { name: "Book Antiqua", size: 11, italic: true, color: { argb: "FF475569" } };
  c8.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(8).height = 20;

  // 4. KOTAK INFORMASI FILTER YANG DITERAPKAN (METADATA TARIKAN DATA)
  ws.mergeCells("A10:D10");
  ws.getCell("A10").value = `Wilayah Kecamatan : ${filters.kec === "Semua" ? "Semua Kecamatan" : filters.kec}`;
  ws.getCell("A10").font = { name: "Book Antiqua", size: 10.5, bold: true, color: { argb: "FF1E293B" } };

  ws.mergeCells("E10:H10");
  ws.getCell("E10").value = `Jenjang Pendidikan : ${filters.jenjang === "Semua" ? "Semua Jenjang" : filters.jenjang}`;
  ws.getCell("E10").font = { name: "Book Antiqua", size: 10.5, bold: true, color: { argb: "FF1E293B" } };

  ws.mergeCells("I10:L10");
  ws.getCell("I10").value = `Jenis Kelamin : ${filters.kelamin === "Semua" ? "Semua Gender" : filters.kelamin}`;
  ws.getCell("I10").font = { name: "Book Antiqua", size: 10.5, bold: true, color: { argb: "FF1E293B" } };

  ws.mergeCells("M10:R10");
  ws.getCell("M10").value = `Waktu Ekspor : ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} Pukul ${new Date().toLocaleTimeString("id-ID")}`;
  ws.getCell("M10").font = { name: "Book Antiqua", size: 10, italic: true, color: { argb: "FF475569" } };

  ws.mergeCells("A11:D11");
  ws.getCell("A11").value = `Tingkat Hambatan : ${filters.tingkat === "Semua" ? "Semua Tingkatan" : filters.tingkat}`;
  ws.getCell("A11").font = { name: "Book Antiqua", size: 10, color: { argb: "FF475569" } };

  ws.mergeCells("E11:H11");
  ws.getCell("E11").value = `Status PATJU 360 : ${filters.filterVerval === "verval" ? "Khusus Terverifikasi" : "Semua Siswa Terdata"}`;
  ws.getCell("E11").font = { name: "Book Antiqua", size: 10, color: { argb: "FF475569" } };

  ws.mergeCells("I11:L11");
  ws.getCell("I11").value = `Kata Kunci Pencarian : ${filters.q ? `"${filters.q}"` : "Tidak Ada"}`;
  ws.getCell("I11").font = { name: "Book Antiqua", size: 10, color: { argb: "FF475569" } };

  ws.mergeCells("M11:R11");
  ws.getCell("M11").value = `Jumlah Data Terfilter : ${rows.length} Siswa Terdaftar`;
  ws.getCell("M11").font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF047857" } };

  ws.getRow(10).height = 19;
  ws.getRow(11).height = 19;
  ws.getRow(12).height = 8; // Spasi kosong

  // 5. STRUKTUR NESTED TABLE HEADER (BARIS 13 & 14)
  // LEVEL 1: GROUP HEADERS (Row 13)
  ws.mergeCells("A13:A14");
  ws.getCell("A13").value = "NO";

  ws.mergeCells("B13:F13");
  ws.getCell("B13").value = "IDENTITAS PESERTA DIDIK";

  ws.mergeCells("G13:J13");
  ws.getCell("G13").value = "SATUAN PENDIDIKAN & WILAYAH";

  ws.mergeCells("K13:M13");
  ws.getCell("K13").value = "STATUS HAMBATAN & ALAT BANTU (PBS)";

  ws.mergeCells("N13:R13");
  ws.getCell("N13").value = "INTEGRASI DATA SOSIAL & KESEHATAN (PATJU 360)";

  // LEVEL 2: SUB-HEADERS (Row 14)
  const subHeaders: Record<string, string> = {
    B14: "Nama Siswa",
    C14: "NISN",
    D14: "Jenis Kelamin",
    E14: "Wilayah Kecamatan",
    F14: "Status PATJU 360",
    G14: "Satuan Pendidikan (Sekolah)",
    H14: "Instansi Pembina",
    I14: "Jenjang",
    J14: "Kelas",
    K14: "Rincian Jenis Hambatan",
    L14: "Klasifikasi Hambatan",
    M14: "Rekomendasi Alat Bantu",
    N14: "Desil DTSEN",
    O14: "Beasiswa BSKM",
    P14: "BPJS PBI-JK",
    Q14: "Puskesmas Rujukan (FKTP)",
    R14: "Jarak ke FKTP (KM)",
  };

  Object.entries(subHeaders).forEach(([cellKey, title]) => {
    ws.getCell(cellKey).value = title;
  });

  const colLetters = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", 
    "K", "L", "M", "N", "O", "P", "Q", "R"
  ];

  // STYLING ROW 13 (GROUP HEADERS)
  ws.getRow(13).height = 30;
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

  // ATUR LEBAR KOLOM (OPTIMAL DENGAN BOOK ANTIQUA 11 PT)
  const colWidths: Record<string, number> = {
    A: 7,   // No
    B: 32,  // Nama Siswa
    C: 18,  // NISN
    D: 16,  // Jenis Kelamin
    E: 20,  // Kecamatan
    F: 24,  // Status PATJU 360
    G: 34,  // Satuan Pendidikan
    H: 16,  // Instansi
    I: 14,  // Jenjang
    J: 13,  // Kelas
    K: 36,  // Rincian Hambatan
    L: 22,  // Klasifikasi Hambatan
    M: 34,  // Rekomendasi Alat Bantu
    N: 20,  // Desil DTSEN
    O: 18,  // Beasiswa BSKM
    P: 20,  // BPJS PBI-JK
    Q: 30,  // Puskesmas Rujukan
    R: 16,  // Jarak (KM)
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

  const getInstansi = (r: any) => {
    if (r.sumber_instansi) return r.sumber_instansi;
    const sName = (r.satuan_pendidikan || "").toUpperCase();
    if (sName.startsWith("MI ") || sName.startsWith("MIS ") || sName.startsWith("MIN ") ||
        sName.startsWith("MTS ") || sName.startsWith("MTSS ") || sName.startsWith("MTSN ") ||
        sName.startsWith("RA ") || sName.startsWith("MA ")) {
      return "KEMENAG";
    }
    return "DIKBUD";
  };

  let currentRowIdx = 15;

  rows.forEach((r, idx) => {
    const rowNum = idx + 1;
    const hs = hambMap.get(r.id) || [];
    
    // Rincian Hambatan
    const hambatanText = hs.length 
      ? hs.map((h: any) => `${h.jenis_hambatan} (${h.tingkat_hambatan || "Berat"})`).join("; ")
      : "Tanpa Hambatan";

    // Klasifikasi Tertinggi
    let maxTingkat = "Tanpa Hambatan";
    if (hs.some((h: any) => h.tingkat_hambatan === "Berat")) {
      maxTingkat = "Berat";
    } else if (hs.some((h: any) => h.tingkat_hambatan === "Sedang")) {
      maxTingkat = "Sedang";
    } else if (hs.some((h: any) => h.tingkat_hambatan === "Ringan")) {
      maxTingkat = "Ringan";
    }

    // Rekomendasi Alat Bantu
    const alatList: string[] = [];
    hs.forEach((h: any) => {
      const a = alatMap.get(h.jenis_hambatan);
      if (a && !alatList.includes(a)) {
        alatList.push(a);
      }
    });
    const alatText = alatList.length ? alatList.join("; ") : "—";

    const inst = getInstansi(r);
    const statusVerval = r.verval_id ? "TERVERIFIKASI PATJU 360" : "BELUM VERVAL";

    const desilText = r.desil_nasional === "1" 
      ? "Desil 1 (Ekstrem)" 
      : r.desil_nasional === "2" 
      ? "Desil 2 (Sangat Miskin)" 
      : r.desil_nasional 
      ? `Desil ${r.desil_nasional}` 
      : "—";

    const bskmText = r.beasiswa_bskm ? r.beasiswa_bskm : "—";
    const pbiText = r.pbi_jk === "YA" ? "SUDAH PBI-JK" : r.pbi_jk === "TIDAK" ? "BELUM PBI-JK" : "—";

    const rowValues = [
      rowNum,
      r.nama_siswa || "—",
      r.nisn || "—",
      r.jenis_kelamin || "—",
      r.kecamatan || "—",
      statusVerval,
      r.satuan_pendidikan || "—",
      inst,
      formatJenjang(r.jenjang, inst),
      r.tingkat_kelas || "—",
      hambatanText,
      maxTingkat,
      alatText,
      desilText,
      bskmText,
      pbiText,
      r.puskesmas_terdekat || "—",
      r.jarak_km ? `${r.jarak_km} KM` : "—",
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
      if (["A", "C", "D", "E", "F", "H", "I", "J", "L", "N", "O", "P", "R"].includes(col)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Highlight status PATJU 360 Terverifikasi
      if (col === "F" && r.verval_id) {
        cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF047857" } };
      }

      // Highlight tingkat hambatan berat
      if (col === "L") {
        if (maxTingkat === "Berat") {
          cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFB91C1C" } };
        } else if (maxTingkat === "Sedang") {
          cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFB45309" } };
        } else if (maxTingkat === "Ringan") {
          cell.font = { name: "Book Antiqua", size: 11, color: { argb: "FF0369A1" } };
        } else {
          cell.font = { name: "Book Antiqua", size: 11, italic: true, color: { argb: "FF64748B" } };
        }
      }

      // Khusus Desil 1 & 2 diberi highlight lembut
      if (col === "N") {
        if (r.desil_nasional === "1") {
          cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFB91C1C" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
        } else if (r.desil_nasional === "2") {
          cell.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FFB45309" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        }
      }

      // Khusus BSKM Belum Menerima diberi highlight oranye
      if (col === "O" && r.beasiswa_bskm === "TIDAK") {
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
    "Data ini bersumber dari Profil Siswa Inklusi (PBS) Terpadu Kabupaten Lombok Barat hasil sinkronisasi Dikbud, Kemenag, dan Bapperida Kab. Lombok Barat.";
  ws.getCell(`B${signRowStart + 1}`).font = { name: "Book Antiqua", size: 10, italic: true, color: { argb: "FF64748B" } };
  ws.getCell(`B${signRowStart + 1}`).alignment = { vertical: "top", horizontal: "left", wrapText: true };

  // Tanda Tangan Kanan (Bapperida Lombok Barat)
  const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  
  ws.mergeCells(`N${signRowStart}:R${signRowStart}`);
  const s1 = ws.getCell(`N${signRowStart}`);
  s1.value = `Gerung, ${todayStr}`;
  s1.font = { name: "Book Antiqua", size: 11, bold: true };
  s1.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`N${signRowStart + 1}:R${signRowStart + 1}`);
  const s2 = ws.getCell(`N${signRowStart + 1}`);
  s2.value = "KEPALA BADAN PERENCANAAN PEMBANGUNAN, RISET DAN INOVASI DAERAH";
  s2.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
  s2.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`N${signRowStart + 2}:R${signRowStart + 2}`);
  const s3 = ws.getCell(`N${signRowStart + 2}`);
  s3.value = "KABUPATEN LOMBOK BARAT";
  s3.font = { name: "Book Antiqua", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
  s3.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`N${signRowStart + 6}:R${signRowStart + 6}`);
  const s4 = ws.getCell(`N${signRowStart + 6}`);
  s4.value = "( ............................................................................ )";
  s4.font = { name: "Book Antiqua", size: 11, bold: true };
  s4.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells(`N${signRowStart + 7}:R${signRowStart + 7}`);
  const s5 = ws.getCell(`N${signRowStart + 7}`);
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
  let filenameParts = ["PATJU360_Data_Siswa"];
  if (filters.filterVerval === "verval") filenameParts.push("Verval");
  if (filters.kec !== "Semua") filenameParts.push(filters.kec.replace(/[^a-zA-Z0-9]/g, ""));
  if (filters.jenjang !== "Semua") filenameParts.push(filters.jenjang.replace(/[^a-zA-Z0-9]/g, ""));
  if (filters.tingkat !== "Semua") filenameParts.push(filters.tingkat.replace(/[^a-zA-Z0-9]/g, ""));
  
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  filenameParts.push(dateStamp);

  anchor.download = `${filenameParts.join("_")}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
