import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useYear } from "@/lib/YearContext";
import { query, fmt } from "@/lib/db";
import InfoCard from "@/components/InfoCard";
import * as XLSX from "xlsx";
import { 
  ShieldAlert, Download, Eye, EyeOff, Search, RotateCcw, 
  MapPin, HeartPulse, GraduationCap, CheckCircle2, XCircle, 
  User, School, Users, Activity, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const maskName = (name: string, unlocked: boolean) => {
  if (unlocked || !name) return name;
  return name
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word[0] + "*".repeat(Math.max(1, word.length - 1));
    })
    .join(" ");
};

const maskNik = (nik: string, unlocked: boolean) => {
  if (unlocked || !nik) return nik;
  if (nik.length < 8) return "******";
  return nik.slice(0, 4) + "********" + nik.slice(-4);
};

export const Route = createFileRoute("/intervensi")({
  head: () => ({ meta: [{ title: "PEDULI | Intervensi Prioritas (PATJU 360) | Lombok Barat" }] }),
  component: IntervensiPage,
});

function IntervensiPage() {
  const { selectedYear } = useYear();
  const [q, setQ] = useState("");
  const [kec, setKec] = useState("Semua");
  const [instansi, setInstansi] = useState("Semua");
  const [desil, setDesil] = useState("Semua");
  const [bskm, setBskm] = useState("Semua");
  const [pbiJk, setPbiJk] = useState("Semua");
  const [jarakKat, setJarakKat] = useState("Semua");
  const [activeTab, setActiveTab] = useState<"tabel" | "desil" | "kesehatan" | "alat">("tabel");
  
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [detailSiswa, setDetailSiswa] = useState<any>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handleToggleUnlock = () => {
    if (isUnlocked) {
      setIsUnlocked(false);
    } else {
      const pwd = prompt("Masukkan password otoritas untuk membuka nama & NIK lengkap:");
      if (pwd === "17041958") {
        setIsUnlocked(true);
      } else if (pwd !== null) {
        alert("Password salah!");
      }
    }
  };

  const resetFilters = () => {
    setQ("");
    setKec("Semua");
    setInstansi("Semua");
    setDesil("Semua");
    setBskm("Semua");
    setPbiJk("Semua");
    setJarakKat("Semua");
    setPage(1);
  };

  // 1. Ambil daftar kecamatan yang tersedia di verval_lanjutan
  const { data: kecList } = useQuery({
    queryKey: ["verval-kec-list"],
    queryFn: async () => {
      const rows = await query<any>(`
        SELECT DISTINCT s.kecamatan 
        FROM verval_lanjutan vl 
        JOIN siswa s ON s.id = vl.siswa_id 
        ORDER BY s.kecamatan
      `);
      return rows.map((r: any) => r.kecamatan);
    },
  });

  // 2. Query Utama Data Siswa Verval Terpadu
  const filterParams = useMemo(() => {
    const where: string[] = [];
    const args: any[] = [];

    if (q) {
      where.push("(vl.nama_siswa LIKE ? OR vl.nisn LIKE ? OR vl.nik_siswa LIKE ? OR s.satuan_pendidikan LIKE ?)");
      const term = `%${q}%`;
      args.push(term, term, term, term);
    }
    if (kec !== "Semua") {
      where.push("s.kecamatan = ?");
      args.push(kec);
    }
    if (instansi !== "Semua") {
      where.push("vl.sumber_instansi = ?");
      args.push(instansi);
    }
    if (desil === "1") {
      where.push("vl.desil_nasional = '1'");
    } else if (desil === "2") {
      where.push("vl.desil_nasional = '2'");
    } else if (desil === "3-4") {
      where.push("(vl.desil_nasional = '3' OR vl.desil_nasional = '4')");
    } else if (desil === "5-10") {
      where.push("(CAST(vl.desil_nasional AS INTEGER) >= 5)");
    } else if (desil === "BELUM ADA DESIL") {
      where.push("(vl.desil_nasional = 'BELUM ADA DESIL' OR vl.desil_nasional IS NULL)");
    }

    if (bskm === "Belum") {
      where.push("(vl.beasiswa_bskm = 'TIDAK' OR vl.beasiswa_bskm IS NULL)");
    } else if (bskm === "Sudah") {
      where.push("(vl.beasiswa_bskm LIKE 'YA%')");
    }

    if (pbiJk === "Belum") {
      where.push("(vl.pbi_jk = 'TIDAK' OR vl.pbi_jk IS NULL)");
    } else if (pbiJk === "Sudah") {
      where.push("(vl.pbi_jk = 'YA')");
    }

    if (jarakKat === "Dekat") {
      where.push("vl.jarak_km <= 2.0");
    } else if (jarakKat === "Sedang") {
      where.push("vl.jarak_km > 2.0 AND vl.jarak_km <= 5.0");
    } else if (jarakKat === "Jauh") {
      where.push("vl.jarak_km > 5.0");
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";
    return { whereClause, args };
  }, [q, kec, instansi, desil, bskm, pbiJk, jarakKat]);

  // Query Data List & Summary
  const { data: vervalData, isLoading } = useQuery({
    queryKey: ["verval-list", filterParams, page, perPage, selectedYear],
    queryFn: async () => {
      const { whereClause, args } = filterParams;

      // Summary counts
      const summaryRows = await query<any>(`
        SELECT 
          COUNT(*) as total_siswa,
          SUM(CASE WHEN vl.desil_nasional IN ('1', '2') THEN 1 ELSE 0 END) as desil_1_2,
          SUM(CASE WHEN vl.beasiswa_bskm = 'TIDAK' OR vl.beasiswa_bskm IS NULL THEN 1 ELSE 0 END) as belum_bskm,
          SUM(CASE WHEN vl.pbi_jk = 'TIDAK' OR vl.pbi_jk IS NULL THEN 1 ELSE 0 END) as belum_pbi,
          SUM(CASE WHEN vl.jarak_km > 5.0 THEN 1 ELSE 0 END) as jarak_jauh
        FROM verval_lanjutan vl
        JOIN siswa s ON s.id = vl.siswa_id
        ${whereClause}
      `, args);

      const summary = summaryRows[0] || {
        total_siswa: 0,
        desil_1_2: 0,
        belum_bskm: 0,
        belum_pbi: 0,
        jarak_jauh: 0
      };

      // Rows
      const rows = await query<any>(`
        SELECT 
          vl.*,
          s.satuan_pendidikan,
          s.kecamatan,
          s.jenjang,
          s.tingkat_kelas,
          s.jenis_kelamin
        FROM verval_lanjutan vl
        JOIN siswa s ON s.id = vl.siswa_id
        ${whereClause}
        ORDER BY 
          CASE WHEN vl.desil_nasional IN ('1', '2') THEN 0 ELSE 1 END,
          CAST(vl.desil_nasional AS INTEGER) ASC,
          vl.nama_siswa ASC
        LIMIT ? OFFSET ?
      `, [...args, perPage, (page - 1) * perPage]);

      // Ambil rincian hambatan untuk siswa pada page ini
      const nisnList = rows.map((r: any) => r.nisn).filter(Boolean);
      let hambatanMap = new Map<string, any[]>();
      if (nisnList.length > 0) {
        const placeholders = nisnList.map(() => "?").join(",");
        const hRows = await query<any>(`
          SELECT nisn, jenis_hambatan, klasifikasi, tipe_alat_rekomendasi
          FROM verval_hambatan
          WHERE nisn IN (${placeholders})
        `, nisnList);
        for (const h of hRows) {
          if (!hambatanMap.has(h.nisn)) hambatanMap.set(h.nisn, []);
          hambatanMap.get(h.nisn)!.push(h);
        }
      }

      return { summary, rows, hambatanMap };
    },
  });

  // Query Data Analytics
  const { data: analyticsData } = useQuery({
    queryKey: ["verval-analytics", filterParams.whereClause, filterParams.args, selectedYear],
    queryFn: async () => {
      const { whereClause, args } = filterParams;

      // 1. Distribusi Desil
      const desilRows = await query<any>(`
        SELECT 
          CASE 
            WHEN vl.desil_nasional = '1' THEN 'Desil 1 (Ekstrem)'
            WHEN vl.desil_nasional = '2' THEN 'Desil 2 (Sangat Miskin)'
            WHEN vl.desil_nasional IN ('3', '4') THEN 'Desil 3-4 (Rentan)'
            WHEN CAST(vl.desil_nasional AS INTEGER) >= 5 THEN 'Desil 5-10 (Mampu)'
            ELSE 'Belum Ada Desil'
          END as desil_group,
          COUNT(*) as total
        FROM verval_lanjutan vl
        JOIN siswa s ON s.id = vl.siswa_id
        ${whereClause}
        GROUP BY desil_group
        ORDER BY total DESC
      `, args);

      // 2. Puskesmas Terbanyak
      const puskesmasRows = await query<any>(`
        SELECT 
          vl.puskesmas_terdekat as puskesmas,
          COUNT(*) as total,
          ROUND(AVG(vl.jarak_km), 2) as avg_jarak
        FROM verval_lanjutan vl
        JOIN siswa s ON s.id = vl.siswa_id
        ${whereClause}
        GROUP BY vl.puskesmas_terdekat
        ORDER BY total DESC
        LIMIT 8
      `, args);

      // 3. Rekomendasi Alat Bantu Terbanyak
      const alatRows = await query<any>(`
        SELECT 
          vh.tipe_alat_rekomendasi as alat,
          COUNT(*) as total
        FROM verval_hambatan vh
        JOIN verval_lanjutan vl ON vl.nisn = vh.nisn
        JOIN siswa s ON s.id = vl.siswa_id
        ${whereClause}
        GROUP BY vh.tipe_alat_rekomendasi
        ORDER BY total DESC
        LIMIT 6
      `, args);

      return { desilRows, puskesmasRows, alatRows };
    },
  });

  // Ekspor Data ke Excel
  const handleExportExcel = async () => {
    const { whereClause, args } = filterParams;
    const allRows = await query<any>(`
      SELECT 
        vl.nama_siswa as "Nama Siswa",
        vl.nik_siswa as "NIK Siswa",
        vl.nisn as "NISN",
        s.jenis_kelamin as "Jenis Kelamin",
        s.jenjang as "Jenjang",
        s.tingkat_kelas as "Kelas",
        s.satuan_pendidikan as "Satuan Pendidikan",
        s.kecamatan as "Kecamatan",
        vl.sumber_instansi as "Instansi",
        vl.desil_nasional as "Desil Nasional (DTSEN)",
        vl.kategori_desil as "Kategori Desil",
        vl.beasiswa_bskm as "Penerima BSKM Pemda",
        vl.pbi_jk as "PBI-JK (BPJS Gratis Pemda)",
        vl.pkh as "Penerima PKH",
        vl.bansos_sembako as "Penerima Sembako",
        vl.status_medis as "Status Medis Kronis",
        vl.disabilitas_dtsen as "Status Disabilitas DTSEN",
        vl.puskesmas_terdekat as "Puskesmas Terdekat",
        vl.jarak_km as "Jarak ke Puskesmas (KM)",
        vl.nama_ayah as "Nama Ayah",
        vl.nik_ayah as "NIK Ayah",
        vl.nama_ibu as "Nama Ibu",
        vl.nik_ibu as "NIK Ibu"
      FROM verval_lanjutan vl
      JOIN siswa s ON s.id = vl.siswa_id
      ${whereClause}
      ORDER BY vl.nama_siswa ASC
    `, args);

    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Intervensi Prioritas");
    XLSX.writeFile(wb, `Intervensi_Prioritas_PATJU360_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalRows = vervalData?.summary?.total_siswa || 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / perPage));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-xl relative overflow-hidden border border-blue-500/20">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-4 h-4 text-sky-400" />
            Executive Dashboard Intervensi Terpadu
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
            Intervensi Prioritas Peserta Didik Inklusi (PATJU 360)
          </h2>
          <p className="text-sm md:text-base text-blue-100/90 leading-relaxed">
            Data 277 siswa berhambatan berat hasil verifikasi lanjutan penyandingan data <strong>DTSEN Versi 2</strong> &amp; platform penanganan kemiskinan <strong>PATJU 360</strong> Kabupaten Lombok Barat.
          </p>
        </div>
        <div className="absolute right-[-30px] bottom-[-40px] opacity-10 pointer-events-none">
          <ShieldAlert className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* KPI InfoCards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <InfoCard
          label="Total Sasaran Prioritas"
          value={vervalData?.summary?.total_siswa ?? 0}
          sub="Siswa Verval Lanjutan"
          icon="👥"
          color="primary"
        />
        <InfoCard
          label="Desil 1 & 2 (Ekstrem & Sangat Miskin)"
          value={vervalData?.summary?.desil_1_2 ?? 0}
          sub="Prioritas Tertinggi Intervensi"
          icon="⚠️"
          color="danger"
        />
        <InfoCard
          label="Belum Dapat Beasiswa BSKM"
          value={vervalData?.summary?.belum_bskm ?? 0}
          sub="Sasaran Bantuan Pendidikan"
          icon="🎓"
          color="warning"
        />
        <InfoCard
          label="Belum PBI-JK Pemda"
          value={vervalData?.summary?.belum_pbi ?? 0}
          sub="Sasaran Jaminan Kesehatan"
          icon="🏥"
          color="secondary"
        />
        <InfoCard
          label="Akses Puskesmas Jauh (>5 KM)"
          value={vervalData?.summary?.jarak_jauh ?? 0}
          sub="Perlu Layanan Jemput Bola"
          icon="📍"
          color="warning"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama siswa, NIK, NISN, atau sekolah..."
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isUnlocked ? "destructive" : "outline"}
              size="sm"
              onClick={handleToggleUnlock}
              className="rounded-xl flex items-center gap-1.5 text-xs font-bold"
            >
              {isUnlocked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isUnlocked ? "Kunci NIK/Nama" : "Buka NIK/Nama"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="rounded-xl flex items-center gap-1.5 text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-border/60 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Kecamatan</label>
            <select
              value={kec}
              onChange={(e) => { setKec(e.target.value); setPage(1); }}
              className="w-full p-2 bg-background border border-border rounded-lg text-xs"
            >
              <option value="Semua">Semua Kecamatan</option>
              {kecList?.map((k: string) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Instansi</label>
            <select
              value={instansi}
              onChange={(e) => { setInstansi(e.target.value); setPage(1); }}
              className="w-full p-2 bg-background border border-border rounded-lg text-xs"
            >
              <option value="Semua">Semua (Dikbud &amp; Kemenag)</option>
              <option value="DIKBUD">DIKBUD (SD/SMP/TK)</option>
              <option value="KEMENAG">KEMENAG (Madrasah)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Status Desil DTSEN</label>
            <select
              value={desil}
              onChange={(e) => { setDesil(e.target.value); setPage(1); }}
              className="w-full p-2 bg-background border border-border rounded-lg text-xs"
            >
              <option value="Semua">Semua Desil</option>
              <option value="1">Desil 1 (Ekstrem)</option>
              <option value="2">Desil 2 (Sangat Miskin)</option>
              <option value="3-4">Desil 3-4 (Hampir/Rentan)</option>
              <option value="5-10">Desil 5-10 (Mampu)</option>
              <option value="BELUM ADA DESIL">Belum Ada Desil</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Beasiswa BSKM Pemda</label>
            <select
              value={bskm}
              onChange={(e) => { setBskm(e.target.value); setPage(1); }}
              className="w-full p-2 bg-background border border-border rounded-lg text-xs"
            >
              <option value="Semua">Semua Status</option>
              <option value="Belum">Belum Menerima (Prioritas)</option>
              <option value="Sudah">Sudah Menerima</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">BPJS PBI-JK Pemda</label>
            <select
              value={pbiJk}
              onChange={(e) => { setPbiJk(e.target.value); setPage(1); }}
              className="w-full p-2 bg-background border border-border rounded-lg text-xs"
            >
              <option value="Semua">Semua Status</option>
              <option value="Belum">Belum PBI-JK (Prioritas)</option>
              <option value="Sudah">Sudah PBI-JK</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Jarak ke Puskesmas</label>
            <select
              value={jarakKat}
              onChange={(e) => { setJarakKat(e.target.value); setPage(1); }}
              className="w-full p-2 bg-background border border-border rounded-lg text-xs"
            >
              <option value="Semua">Semua Jarak</option>
              <option value="Dekat">Dekat (≤ 2 KM)</option>
              <option value="Sedang">Sedang (2 - 5 KM)</option>
              <option value="Jauh">Jauh (&gt; 5 KM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Menu Visual Analytics */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("tabel")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "tabel" 
              ? "bg-primary text-primary-foreground shadow" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Tabel Intervensi Prioritas ({fmt(totalRows)})
        </button>
        <button
          onClick={() => setActiveTab("desil")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "desil" 
              ? "bg-primary text-primary-foreground shadow" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Activity className="w-4 h-4" />
          Distribusi Desil Kemiskinan
        </button>
        <button
          onClick={() => setActiveTab("kesehatan")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "kesehatan" 
              ? "bg-primary text-primary-foreground shadow" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          Aksesibilitas Puskesmas
        </button>
        <button
          onClick={() => setActiveTab("alat")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "alat" 
              ? "bg-primary text-primary-foreground shadow" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Rekomendasi Alat Bantu
        </button>
      </div>

      {/* Tab 1: TABEL INTERVENSI */}
      {activeTab === "tabel" && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa &amp; Identitas</th>
                  <th className="py-3 px-4">Satuan Pendidikan</th>
                  <th className="py-3 px-4">Kecamatan</th>
                  <th className="py-3 px-4 text-center">Instansi</th>
                  <th className="py-3 px-4 text-center">Status Desil DTSEN</th>
                  <th className="py-3 px-4 text-center">Intervensi Bansos</th>
                  <th className="py-3 px-4">Puskesmas &amp; Jarak</th>
                  <th className="py-3 px-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      Memuat data intervensi...
                    </td>
                  </tr>
                ) : vervalData?.rows?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      Tidak ada data yang cocok dengan filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  vervalData?.rows?.map((r: any, idx: number) => {
                    const rowNum = (page - 1) * perPage + idx + 1;
                    const hambatanList = vervalData?.hambatanMap?.get(r.nisn) || [];

                    // Desil badge styling
                    let desilColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                    if (r.desil_nasional === "1") {
                      desilColor = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-black";
                    } else if (r.desil_nasional === "2") {
                      desilColor = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold";
                    } else if (r.desil_nasional === "3" || r.desil_nasional === "4") {
                      desilColor = "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30";
                    } else if (r.desil_nasional && !isNaN(Number(r.desil_nasional))) {
                      desilColor = "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30";
                    }

                    return (
                      <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-muted-foreground text-[11px]">
                          {rowNum}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground">
                            {maskName(r.nama_siswa, isUnlocked)}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            NISN: {r.nisn} · NIK: {maskNik(r.nik_siswa, isUnlocked)}
                          </div>
                          {hambatanList.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {hambatanList.slice(0, 2).map((h: any, i: number) => (
                                <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary">
                                  {h.jenis_hambatan}
                                </span>
                              ))}
                              {hambatanList.length > 2 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-muted text-muted-foreground font-semibold">
                                  +{hambatanList.length - 2} lagi
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">{r.satuan_pendidikan}</div>
                          <div className="text-[10px] text-muted-foreground">{r.jenjang} · {r.tingkat_kelas}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {r.kecamatan}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                            r.sumber_instansi === "KEMENAG"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                          }`}>
                            {r.sumber_instansi}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-xs inline-block ${desilColor}`}>
                            {r.desil_nasional === "1" ? "Desil 1 (Ekstrem)" :
                             r.desil_nasional === "2" ? "Desil 2 (Sangat Miskin)" :
                             r.desil_nasional ? `Desil ${r.desil_nasional}` : "Belum Ada Desil"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.beasiswa_bskm?.startsWith("YA")
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-rose-500/10 text-rose-600"
                            }`}>
                              BSKM: {r.beasiswa_bskm?.startsWith("YA") ? "YA" : "TIDAK"}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.pbi_jk === "YA"
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-rose-500/10 text-rose-600"
                            }`}>
                              PBI-JK: {r.pbi_jk === "YA" ? "YA" : "TIDAK"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate max-w-[150px]">{r.puskesmas_terdekat || "—"}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Jarak: <span className="font-bold text-foreground">{r.jarak_km} KM</span>
                            {r.jarak_km > 5.0 && (
                              <span className="ml-1 px-1 rounded text-[9px] bg-amber-500/15 text-amber-600 font-bold">
                                Jauh
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetailSiswa({ ...r, hambatanList })}
                            className="rounded-xl text-xs h-8 px-2.5 font-bold hover:bg-primary hover:text-primary-foreground"
                          >
                            Detail Profil
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              Menampilkan {Math.min(totalRows, (page - 1) * perPage + 1)} - {Math.min(totalRows, page * perPage)} dari {fmt(totalRows)} siswa prioritas
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg h-8 px-3"
              >
                Sebelumnya
              </Button>
              <span className="px-3 py-1 font-bold">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg h-8 px-3"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: DISTRIBUSI DESIL KEMISKINAN */}
      {activeTab === "desil" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Distribusi Kelompok Desil DTSEN
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData?.desilRows || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="desil_group" angle={-15} textAnchor="end" height={50} fontSize={10} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Jumlah Siswa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-base mb-2">Pedoman Aksi Intervensi Berdasarkan Desil</h3>
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300">
                <span className="font-bold block text-sm mb-1">🚨 Desil 1 &amp; 2 (Ekstrem &amp; Sangat Miskin)</span>
                Wajib mendapatkan paket lengkap perlindungan sosial: Beasiswa BSKM, kartu PBI-JK Pemda, dan intervensi alat bantu khusus dari alokasi bansos APBD.
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
                <span className="font-bold block text-sm mb-1">⚠️ Desil 3 &amp; 4 (Hampir &amp; Rentan Miskin)</span>
                Prioritas kedua untuk subsidi pengadaan alat bantu belajar dan pendampingan Guru Pembimbing Khusus (GPK).
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300">
                <span className="font-bold block text-sm mb-1">ℹ️ Desil 5 - 10 (Mampu / Mandiri)</span>
                Fokus intervensi berupa fasilitasi kurikulum inklusi, bimbingan teknis sekolah, dan rujukan pemeriksaan medis berkala di Puskesmas.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AKSESIBILITAS PUSKESMAS */}
      {activeTab === "kesehatan" && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-500" />
                Beban Puskesmas Rujukan &amp; Jarak Aksesibilitas
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Puskesmas dengan jumlah peserta didik inklusi rujukan terbanyak di Kabupaten Lombok Barat
              </p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData?.puskesmasRows || []} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="puskesmas" angle={-25} textAnchor="end" height={60} fontSize={10} />
                <YAxis yAxisId="left" orientation="left" stroke="var(--color-primary)" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={11} unit=" km" />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Bar yAxisId="left" dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Jumlah Siswa Rujukan" />
                <Bar yAxisId="right" dataKey="avg_jarak" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Rata-rata Jarak (KM)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 4: REKOMENDASI ALAT BANTU */}
      {activeTab === "alat" && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              Kebutuhan Alat Bantu Khusus &amp; Intervensi Pembelajaran
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rekomendasi alat bantu spesifik berdasarkan analisis hambatan berat siswa hasil verval terpadu
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData?.alatRows?.map((item: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Rekomendasi #{idx + 1}</span>
                  <h4 className="font-bold text-sm text-foreground mt-1 mb-2 leading-snug">{item.alat}</h4>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-xs text-muted-foreground">Jumlah Kebutuhan:</span>
                  <span className="text-base font-black text-primary">{fmt(item.total)} Unit/Siswa</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Detail Profil Siswa */}
      <Dialog open={!!detailSiswa} onOpenChange={(open) => !open && setDetailSiswa(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailSiswa && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    detailSiswa.sumber_instansi === "KEMENAG"
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                  }`}>
                    {detailSiswa.sumber_instansi}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700">
                    Klasifikasi: BERAT
                  </span>
                </div>
                <DialogTitle className="text-xl font-black">
                  {maskName(detailSiswa.nama_siswa, isUnlocked)}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  NISN: {detailSiswa.nisn} · NIK: {maskNik(detailSiswa.nik_siswa, isUnlocked)}
                </DialogDescription>
              </DialogHeader>

              {/* Data Sekolah & Lokasi */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Satuan Pendidikan</span>
                  <span className="font-bold text-foreground">{detailSiswa.satuan_pendidikan}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Jenjang &amp; Kelas</span>
                  <span className="font-bold text-foreground">{detailSiswa.jenjang} · {detailSiswa.tingkat_kelas}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Kecamatan</span>
                  <span className="font-bold text-foreground">{detailSiswa.kecamatan}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Jenis Kelamin</span>
                  <span className="font-bold text-foreground">{detailSiswa.jenis_kelamin}</span>
                </div>
                {detailSiswa.alamat_siswa && (
                  <div className="col-span-2 pt-2 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Alamat Domisili Siswa</span>
                    <span className="font-medium text-foreground">{detailSiswa.alamat_siswa}</span>
                  </div>
                )}
              </div>

              {/* Data Orang Tua (Khusus Kemenag) */}
              {(detailSiswa.nama_ayah || detailSiswa.nama_ibu) && (
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border text-xs space-y-2">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                    <Users className="w-4 h-4 text-primary" />
                    Identitas Orang Tua / Wali
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Nama Ayah</span>
                      <span className="font-semibold text-foreground">{maskName(detailSiswa.nama_ayah, isUnlocked) || "—"}</span>
                      {detailSiswa.nik_ayah && (
                        <span className="text-[10px] text-muted-foreground font-mono block">NIK: {maskNik(detailSiswa.nik_ayah, isUnlocked)}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Nama Ibu</span>
                      <span className="font-semibold text-foreground">{maskName(detailSiswa.nama_ibu, isUnlocked) || "—"}</span>
                      {detailSiswa.nik_ibu && (
                        <span className="text-[10px] text-muted-foreground font-mono block">NIK: {maskNik(detailSiswa.nik_ibu, isUnlocked)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Kemiskinan DTSEN & PATJU 360 */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-2">
                <span className="font-bold text-xs flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                  <ShieldAlert className="w-4 h-4" />
                  Status Kemiskinan &amp; DTSEN Versi 2
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Desil Nasional</span>
                    <span className="font-black text-sm text-foreground">
                      {detailSiswa.desil_nasional === "1" ? "Desil 1 (Ekstrem)" :
                       detailSiswa.desil_nasional === "2" ? "Desil 2 (Sangat Miskin)" :
                       detailSiswa.desil_nasional ? `Desil ${detailSiswa.desil_nasional}` : "Belum Ada"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Metode Verval</span>
                    <span className="font-semibold text-foreground">{detailSiswa.metode_verval || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Terdata PATJU 360</span>
                    <span className="font-semibold text-foreground">{detailSiswa.status_patju360 || "TRUE"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Beasiswa BSKM</span>
                    <span className={`font-bold ${detailSiswa.beasiswa_bskm?.startsWith("YA") ? "text-emerald-600" : "text-rose-600"}`}>
                      {detailSiswa.beasiswa_bskm || "TIDAK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">BPJS PBI-JK</span>
                    <span className={`font-bold ${detailSiswa.pbi_jk === "YA" ? "text-emerald-600" : "text-rose-600"}`}>
                      {detailSiswa.pbi_jk === "YA" ? "SUDAH TERCOVER" : "BELUM TERCOVER"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Penyakit Kronis</span>
                    <span className="font-semibold text-foreground">{detailSiswa.status_medis || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Fasilitas Kesehatan Rujukan */}
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                <span className="font-bold text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400 mb-2">
                  <HeartPulse className="w-4 h-4" />
                  Rujukan Fasilitas Kesehatan (FKTP)
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-foreground">{detailSiswa.puskesmas_terdekat || "—"}</span>
                    <span className="text-[11px] text-muted-foreground block">Puskesmas Rujukan Terdekat</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-primary">{detailSiswa.jarak_km} KM</span>
                    <span className="text-[10px] text-muted-foreground block">Jarak Euclidean GPS</span>
                  </div>
                </div>
              </div>

              {/* Rincian Hambatan & Alat Bantu */}
              <div className="space-y-2">
                <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Rincian Hambatan Berat &amp; Rekomendasi Alat Bantu
                </span>
                <div className="space-y-2">
                  {detailSiswa.hambatanList?.map((h: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl border border-border bg-card text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {h.jenis_hambatan}
                        </div>
                        <span className="text-[11px] text-primary font-medium block mt-0.5">
                          Alat: {h.tipe_alat_rekomendasi}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/15 text-rose-700 shrink-0 self-start sm:self-center">
                        {h.klasifikasi || "BERAT"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="outline" onClick={() => setDetailSiswa(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
