import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useYear } from "@/lib/YearContext";
import { useAuth } from "@/lib/AuthContext";
import { query, fmt, HAMBATAN_SHORT } from "@/lib/db";
import { exportSiswaToExcel } from "@/lib/exportSiswaExcel";
import { Eye, EyeOff, ShieldAlert, Loader2, Download } from "lucide-react";

const maskNisn = (nisn: string, unlocked: boolean) => {
  if (unlocked || !nisn) return nisn;
  if (nisn.length < 6) return "******";
  return nisn.slice(0, 2) + "******" + nisn.slice(-2);
};

export const Route = createFileRoute("/siswa")({
  head: () => ({ meta: [{ title: "PEDULI | Data Siswa | Lombok Barat" }] }),
  component: SiswaPage,
});

function SiswaPage() {
  const [q, setQ] = useState("");
  const [kec, setKec] = useState("Semua");
  const [jenjang, setJenjang] = useState("Semua");
  const [kelamin, setKelamin] = useState("Semua");
  const [tingkat, setTingkat] = useState("Semua");
  const [filterVerval, setFilterVerval] = useState<"semua" | "verval">("semua");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [detail, setDetail] = useState<any>(null);
  const [isAllUnlocked, setIsAllUnlocked] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { selectedYear } = useYear();
  const { user, canUnlockPrivacy } = useAuth();

  const handleToggleUnlock = () => {
    if (isAllUnlocked) {
      setIsAllUnlocked(false);
      return;
    }
    if (user) {
      if (canUnlockPrivacy) {
        setIsAllUnlocked(true);
      } else {
        alert("Sesuai kebijakan perlindungan privasi data kemitraan (UU PDP & Kebijakan Program INOVASI), NISN siswa dirahasiakan untuk akun peninjau kebijakan / evaluasi.");
      }
    } else {
      const pwd = prompt("Masukkan PIN otoritas atau masuk dengan akun OPD Pemkab:");
      if (pwd === "17041958") {
        setIsAllUnlocked(true);
      } else if (pwd !== null) {
        alert("PIN tidak valid! Silakan gunakan tombol 'Masuk OPD' di bagian atas untuk login instansi resmi.");
      }
    }
  };

  const { data: totalVervalCount } = useQuery({
    queryKey: ["verval-count"],
    queryFn: async () => {
      const res = await query<any>(`SELECT COUNT(*) as n FROM verval_lanjutan`);
      return res[0]?.n || 0;
    }
  });

  const { data: kecList } = useQuery({
    queryKey: ["kec-list"],
    queryFn: () => query<any>(`SELECT DISTINCT kecamatan FROM siswa ORDER BY kecamatan`),
  });

  const filterSql = useMemo(() => {
    const where: string[] = []; const args: any[] = [];
    if (q) {
      where.push("(s.nama_siswa LIKE ? OR s.nisn LIKE ? OR s.satuan_pendidikan LIKE ?)");
      const p = `%${q}%`; args.push(p, p, p);
    }
    if (kec !== "Semua") { where.push("s.kecamatan=?"); args.push(kec); }
    if (jenjang !== "Semua") { where.push("s.jenjang=?"); args.push(jenjang); }
    if (kelamin !== "Semua") { where.push("s.jenis_kelamin=?"); args.push(kelamin); }
    if (tingkat === "Tanpa Hambatan") {
      where.push("NOT EXISTS (SELECT 1 FROM hambatan_siswa h WHERE h.siswa_id=s.id)");
    } else if (tingkat !== "Semua") {
      where.push("EXISTS (SELECT 1 FROM hambatan_siswa h WHERE h.siswa_id=s.id AND h.tingkat_hambatan=?)");
      args.push(tingkat);
    }
    if (filterVerval === "verval") {
      where.push("EXISTS (SELECT 1 FROM verval_lanjutan vl WHERE vl.nisn = s.nisn)");
    }
    return { w: where.length ? "WHERE " + where.join(" AND ") : "", args };
  }, [q, kec, jenjang, kelamin, tingkat, filterVerval]);

  const { data, isLoading } = useQuery({
    queryKey: ["siswa", filterSql, page, perPage, selectedYear],
    queryFn: async () => {
      if (selectedYear !== "2026") {
        return { data: [], total: 0 };
      }

      const total = (await query<any>(`SELECT COUNT(*) AS n FROM siswa s ${filterSql.w}`, filterSql.args))[0].n;
      const rows = await query<any>(`
        SELECT 
          s.*,
          vl.id AS verval_id,
          vl.desil_nasional,
          vl.sumber_instansi,
          vl.beasiswa_bskm,
          vl.pbi_jk,
          vl.puskesmas_terdekat,
          vl.jarak_km
        FROM siswa s 
        LEFT JOIN verval_lanjutan vl ON vl.nisn = s.nisn
        ${filterSql.w}
        ORDER BY s.nama_siswa LIMIT ? OFFSET ?
      `, [...filterSql.args, perPage, (page - 1) * perPage]);
      const ids = rows.map((r: any) => r.id);
      let hambMap = new Map<number, any[]>();
      if (ids.length) {
        const placeholders = ids.map(() => "?").join(",");
        const hamb = await query<any>(`SELECT siswa_id, jenis_hambatan, tingkat_hambatan FROM hambatan_siswa WHERE siswa_id IN (${placeholders})`, ids);
        hamb.forEach((h: any) => {
          if (!hambMap.has(h.siswa_id)) hambMap.set(h.siswa_id, []);
          hambMap.get(h.siswa_id)!.push(h);
        });
      }
      return { total, rows, hambMap };
    },
  });

  const pages = data ? Math.max(1, Math.ceil(data.total / perPage)) : 1;

  const exportExcel = async () => {
    try {
      setIsExporting(true);

      // 1. Ambil seluruh data siswa yang terfilter (termasuk join verval_lanjutan)
      const allRows = await query<any>(`
        SELECT 
          s.*,
          vl.id AS verval_id,
          vl.status_patju360,
          vl.desil_nasional,
          vl.kategori_desil,
          vl.sumber_instansi,
          vl.beasiswa_bskm,
          vl.pbi_jk,
          vl.puskesmas_terdekat,
          vl.jarak_km
        FROM siswa s 
        LEFT JOIN verval_lanjutan vl ON vl.nisn = s.nisn
        ${filterSql.w}
        ORDER BY s.nama_siswa
      `, filterSql.args);

      if (!allRows || allRows.length === 0) {
        alert("Tidak ada data siswa yang sesuai dengan filter untuk diekspor.");
        return;
      }

      // 2. Ambil seluruh rincian hambatan untuk siswa yang terfilter
      const ids = allRows.map((r: any) => r.id);
      const hambMap = new Map<number, any[]>();
      if (ids.length) {
        const chunkSize = 500;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => "?").join(",");
          const hamb = await query<any>(`
            SELECT siswa_id, jenis_hambatan, tingkat_hambatan 
            FROM hambatan_siswa 
            WHERE siswa_id IN (${placeholders})
          `, chunk);
          hamb.forEach((h: any) => {
            if (!hambMap.has(h.siswa_id)) hambMap.set(h.siswa_id, []);
            hambMap.get(h.siswa_id)!.push(h);
          });
        }
      }

      // 3. Ambil peta alat bantu
      const abRows = await query<any>(`
        SELECT jenis_hambatan, GROUP_CONCAT(nama_alat, ', ') as alat 
        FROM alat_bantu 
        GROUP BY jenis_hambatan
      `);
      const alatMap = new Map<string, string>();
      abRows.forEach((ab: any) => {
        alatMap.set(ab.jenis_hambatan, ab.alat);
      });

      // 4. Generate file Excel berstandar OPD Bapperida
      await exportSiswaToExcel(
        { q, kec, jenjang, kelamin, tingkat, filterVerval, selectedYear },
        allRows,
        hambMap,
        alatMap
      );
    } catch (error: any) {
      console.error("Gagal export excel:", error);
      alert("Terjadi kesalahan saat mengekspor data: " + (error?.message || ""));
    } finally {
      setIsExporting(false);
    }
  };

  const exportCsv = async () => {
    const all = await query<any>(`
      SELECT s.id, s.nama_siswa, s.nisn, s.satuan_pendidikan, s.kecamatan, s.jenjang, s.tingkat_kelas, s.jenis_kelamin
      FROM siswa s ${filterSql.w} ORDER BY s.nama_siswa
    `, filterSql.args);
    const header = ["No","Nama","NISN","Sekolah","Kecamatan","Jenjang","Kelas","Jenis Kelamin"];
    const lines = [header.join(",")];
    all.forEach((r: any, i: number) => {
      lines.push([i+1, r.nama_siswa, r.nisn, r.satuan_pendidikan, r.kecamatan, r.jenjang, r.tingkat_kelas, r.jenis_kelamin]
        .map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `siswa-pbs-lombok-barat.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const openDetail = async (s: any) => {
    const hamb = await query<any>(`SELECT * FROM hambatan_siswa WHERE siswa_id=?`, [s.id]);
    const alat = hamb.length ? await query<any>(`SELECT * FROM alat_bantu WHERE jenis_hambatan IN (${hamb.map(()=>"?").join(",")})`, hamb.map((h:any)=>h.jenis_hambatan)) : [];
    
    // Cek apakah ada data verval_lanjutan
    const vervalRows = await query<any>(`SELECT * FROM verval_lanjutan WHERE nisn=? OR siswa_id=?`, [s.nisn, s.id]);
    const verval = vervalRows[0] || null;
    let vervalHamb: any[] = [];
    if (verval) {
      vervalHamb = await query<any>(`SELECT * FROM verval_hambatan WHERE nisn=? OR siswa_id=?`, [s.nisn, s.id]);
    }

    setDetail({ s, hamb, alat, verval, vervalHamb });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Data Siswa</h2>
          <p className="text-sm text-muted-foreground mt-1">{data ? `${fmt(data.total)} siswa` : "Memuat…"}</p>
        </div>
        <div className="flex gap-2">
          <button 
            disabled={isExporting}
            onClick={exportExcel} 
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Mengekspor...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </>
            )}
          </button>
          <button onClick={exportCsv} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">⬇ Export CSV</button>
        </div>
      </div>

      {/* Quick Filter Toggle: Semua Siswa vs Khusus Terverifikasi PATJU 360 */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setFilterVerval("semua"); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            filterVerval === "semua"
              ? "bg-primary text-primary-foreground border-primary shadow"
              : "bg-card text-foreground border-border hover:bg-muted"
          }`}
        >
          <span>Semua Siswa</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary-foreground/20 text-inherit font-mono">
            {filterVerval === "semua" && data ? fmt(data.total) : "12.281"}
          </span>
        </button>
        <button
          onClick={() => { setFilterVerval("verval"); setPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            filterVerval === "verval"
              ? "bg-emerald-600 text-white border-emerald-600 shadow"
              : "bg-card text-foreground border-border hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Khusus Terverifikasi (PATJU 360)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-inherit font-black font-mono">
            {totalVervalCount ?? 277}
          </span>
        </button>
      </div>

      <div className="chart-card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Pencarian</label>
          <input value={q} onChange={(e)=>{setQ(e.target.value);setPage(1);}} placeholder="🔍 Cari nama / NISN / sekolah" className="border border-border bg-background rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Kecamatan</label>
          <select value={kec} onChange={(e)=>{setKec(e.target.value);setPage(1);}} className="border border-border bg-background rounded-lg px-3 py-2 text-sm w-full">
            <option>Semua</option>{kecList?.map((k:any)=><option key={k.kecamatan}>{k.kecamatan}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Jenjang</label>
          <select value={jenjang} onChange={(e)=>{setJenjang(e.target.value);setPage(1);}} className="border border-border bg-background rounded-lg px-3 py-2 text-sm w-full">
            <option>Semua</option><option>TK</option><option>SD/MI</option><option>SMP/MTS</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Jenis Kelamin</label>
          <select value={kelamin} onChange={(e)=>{setKelamin(e.target.value);setPage(1);}} className="border border-border bg-background rounded-lg px-3 py-2 text-sm w-full">
            <option>Semua</option><option>Laki - Laki</option><option>Perempuan</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Tingkat Hambatan</label>
          <select value={tingkat} onChange={(e)=>{setTingkat(e.target.value);setPage(1);}} className="border border-border bg-background rounded-lg px-3 py-2 text-sm w-full">
            <option>Semua</option><option>Ringan</option><option>Sedang</option><option>Berat</option><option>Tanpa Hambatan</option>
          </select>
        </div>
      </div>

      <div className="chart-card">
        {isLoading ? <div className="py-12 text-center text-muted-foreground"><div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-2">No</th>
                  <th className="text-left px-2 py-2">Nama Siswa</th>
                  <th className="text-left px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <span>NISN</span>
                      <button 
                        onClick={handleToggleUnlock}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
                        title={isAllUnlocked ? "Samarkan NISN" : "Buka sensor NISN"}
                      >
                        {isAllUnlocked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </th>
                  <th className="text-left px-2 py-2">Sekolah</th>
                  <th className="text-left px-2 py-2">Kecamatan</th>
                  <th className="text-left px-2 py-2">Jenjang</th>
                  <th className="text-left px-2 py-2">Kelas</th>
                  <th className="text-left px-2 py-2">JK</th>
                  <th className="text-left px-2 py-2">Hambatan</th>
                  <th className="text-left px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.length === 0 && <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Data tidak ditemukan</td></tr>}
                 {data?.rows.map((r: any, i: number) => {
                  const hs = data.hambMap.get(r.id) || [];
                  const nama = r.nama_siswa || "";
                  const nisn = r.nisn || "";
                  const maskedNisn = maskNisn(nisn, isAllUnlocked);

                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-2 py-2 text-muted-foreground">{(page-1)*perPage + i + 1}</td>
                      <td className="px-2 py-2 font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{nama}</span>
                          {r.verval_id && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 whitespace-nowrap" 
                              title={`Terverifikasi PATJU 360 (${r.sumber_instansi || 'Dikbud/Kemenag'})`}
                            >
                              <ShieldAlert className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              PATJU 360
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground font-mono">{maskedNisn}</td>
                      <td className="px-2 py-2">{r.satuan_pendidikan}</td>
                      <td className="px-2 py-2">{r.kecamatan}</td>
                      <td className="px-2 py-2"><span className="badge-pill" style={{background:'#dbeafe',color:'#1e40af'}}>{r.jenjang}</span></td>
                      <td className="px-2 py-2 text-xs">{r.tingkat_kelas}</td>
                      <td className="px-2 py-2 text-xs">{r.jenis_kelamin === "Laki - Laki" ? "L" : "P"}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {hs.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {hs.map((h: any, j: number) => (
                            <span key={j} className={`badge-pill badge-${h.tingkat_hambatan.toLowerCase()}`} title={`${h.jenis_hambatan} – ${h.tingkat_hambatan}`}>
                              {HAMBATAN_SHORT[h.jenis_hambatan]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={()=>openDetail(r)} className="text-xs text-primary hover:underline">Detail</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 text-sm flex-wrap gap-3">
          <div className="text-muted-foreground">Halaman {page} / {pages}</div>
          <div className="flex items-center gap-2">
            <select value={perPage} onChange={(e)=>{setPerPage(Number(e.target.value));setPage(1);}} className="border border-border bg-background rounded px-2 py-1 text-sm">
              <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
            </select>
            <button disabled={page<=1} onClick={()=>setPage(page-1)} className="px-3 py-1.5 rounded border border-border disabled:opacity-40 hover:bg-muted">‹</button>
            <button disabled={page>=pages} onClick={()=>setPage(page+1)} className="px-3 py-1.5 rounded border border-border disabled:opacity-40 hover:bg-muted">›</button>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setDetail(null)}>
          <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold">
                    {detail.s.nama_siswa}
                  </h3>
                  {detail.verval && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      <ShieldAlert className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Terverifikasi PATJU 360
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  NISN: {maskNisn(detail.s.nisn, isAllUnlocked)}
                </p>
              </div>
              <button onClick={()=>setDetail(null)} className="text-2xl text-muted-foreground hover:text-foreground ml-4">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Sekolah</div><div className="font-medium">{detail.s.satuan_pendidikan}</div></div>
                <div><div className="text-xs text-muted-foreground">Kecamatan</div><div className="font-medium">{detail.s.kecamatan}</div></div>
                <div><div className="text-xs text-muted-foreground">Jenjang</div><div className="font-medium">{detail.s.jenjang}</div></div>
                <div><div className="text-xs text-muted-foreground">Kelas</div><div className="font-medium">{detail.s.tingkat_kelas}</div></div>
                <div><div className="text-xs text-muted-foreground">Jenis Kelamin</div><div className="font-medium">{detail.s.jenis_kelamin}</div></div>
              </div>

              {/* Blok Khusus Verval Lanjutan PATJU 360 */}
              {detail.verval && (
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-semibold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Profil Verval Terpadu (PATJU 360)
                    </h4>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      {detail.verval.sumber_instansi || "Dikbud"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-background/90 p-2 rounded-lg border border-border/50">
                      <div className="text-muted-foreground text-[10px] uppercase">Taraf Desil</div>
                      <div className="font-bold text-foreground">
                        {detail.verval.desil_nasional || detail.verval.desil_awal || "Non-Desil"}
                        <span className="text-[10px] text-muted-foreground ml-1">({detail.verval.kategori_desil || "Reguler"})</span>
                      </div>
                    </div>
                    <div className="bg-background/90 p-2 rounded-lg border border-border/50">
                      <div className="text-muted-foreground text-[10px] uppercase">Beasiswa BSKM</div>
                      <div className={`font-bold ${detail.verval.beasiswa_bskm === 'Sudah Menerima' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {detail.verval.beasiswa_bskm || "-"}
                      </div>
                    </div>
                    <div className="bg-background/90 p-2 rounded-lg border border-border/50">
                      <div className="text-muted-foreground text-[10px] uppercase">BPJS PBI-JK</div>
                      <div className={`font-bold ${detail.verval.pbi_jk === 'Sudah Menerima' ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {detail.verval.pbi_jk || "-"}
                      </div>
                    </div>
                    <div className="bg-background/90 p-2 rounded-lg border border-border/50">
                      <div className="text-muted-foreground text-[10px] uppercase">Bansos PKH</div>
                      <div className="font-bold text-foreground">{detail.verval.pkh || "-"}</div>
                    </div>
                    <div className="bg-background/90 p-2 rounded-lg border border-border/50">
                      <div className="text-muted-foreground text-[10px] uppercase">Bansos Sembako</div>
                      <div className="font-bold text-foreground">{detail.verval.bansos_sembako || "-"}</div>
                    </div>
                    <div className="bg-background/90 p-2 rounded-lg border border-border/50">
                      <div className="text-muted-foreground text-[10px] uppercase">Status Medis</div>
                      <div className="font-bold text-foreground">{detail.verval.status_medis || "-"}</div>
                    </div>
                  </div>

                  {detail.verval.disabilitas_dtsen && detail.verval.disabilitas_dtsen !== "TIDAK TERCATAT DI DTSEN (TERVERIFIKASI PBS)" && (
                    <div className="bg-background/90 p-2.5 rounded-lg border border-border/50 text-xs">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase">Disabilitas DTSEN:</span>
                      <span className="font-semibold text-indigo-700 dark:text-indigo-400 mt-0.5 block">{detail.verval.disabilitas_dtsen}</span>
                    </div>
                  )}

                  <div className="bg-background/90 p-2.5 rounded-lg border border-border/50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Puskesmas Rujukan:</span>
                      <span className="font-bold text-foreground">{detail.verval.puskesmas_terdekat || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Jarak ke FKTP:</span>
                      <span className="font-bold text-foreground">{detail.verval.jarak_km ? `${detail.verval.jarak_km} KM` : "-"}</span>
                    </div>
                    {(detail.verval.nama_ayah || detail.verval.nama_ibu) && (
                      <div className="flex items-center justify-between border-t border-border/40 pt-1.5 mt-1">
                        <span className="text-muted-foreground">Orang Tua (Ayah / Ibu):</span>
                        <span className="font-medium text-foreground">
                          {`${detail.verval.nama_ayah || '-'} / ${detail.verval.nama_ibu || '-'}`}
                        </span>
                      </div>
                    )}
                    {detail.verval.alamat_siswa && (
                      <div className="flex items-start justify-between border-t border-border/40 pt-1.5 mt-1">
                        <span className="text-muted-foreground">Alamat Siswa:</span>
                        <span className="font-medium text-foreground text-right max-w-[65%]">{detail.verval.alamat_siswa}</span>
                      </div>
                    )}
                  </div>

                  {/* Rekam Medis & Tindak Lanjut */}
                  {(detail.verval.dokter_pemeriksa || detail.verval.diagnosa || detail.verval.tindakan || detail.verval.status_rujukan || detail.verval.keterangan) && (
                    <div className="bg-emerald-100/50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-xs space-y-1">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                        <span>🩺 Rekam Medis &amp; Rujukan Klinis:</span>
                      </div>
                      {detail.verval.dokter_pemeriksa && (
                        <div><span className="text-muted-foreground">Dokter Pemeriksa:</span> <span className="font-semibold text-foreground">{detail.verval.dokter_pemeriksa}</span></div>
                      )}
                      {detail.verval.diagnosa && (
                        <div><span className="text-muted-foreground">Diagnosa:</span> <span className="font-semibold text-foreground">{detail.verval.diagnosa}</span></div>
                      )}
                      {detail.verval.tindakan && (
                        <div><span className="text-muted-foreground">Tindakan:</span> <span className="font-semibold text-foreground">{detail.verval.tindakan}</span></div>
                      )}
                      {detail.verval.status_rujukan && (
                        <div><span className="text-muted-foreground">Status Rujukan:</span> <span className="font-bold text-sky-700 dark:text-sky-300">{detail.verval.status_rujukan}</span></div>
                      )}
                      {detail.verval.keterangan && (
                        <div><span className="text-muted-foreground">Keterangan:</span> <span className="text-foreground">{detail.verval.keterangan}</span></div>
                      )}
                    </div>
                  )}

                  {detail.vervalHamb && detail.vervalHamb.length > 0 && (
                    <div className="pt-1">
                      <div className="text-xs font-semibold text-muted-foreground mb-1.5">Rekomendasi Alat Spesifik (Verval PATJU 360):</div>
                      <div className="space-y-1.5">
                        {detail.vervalHamb.map((vh: any, idx: number) => (
                          <div key={idx} className="bg-background/90 p-2 rounded-lg border border-border/60 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-semibold">{vh.jenis_hambatan}</span>
                              <span className="text-muted-foreground ml-1 text-[11px]">({vh.klasifikasi})</span>
                            </div>
                            <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              {vh.tipe_alat_rekomendasi}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div>
                <h4 className="font-semibold text-sm mb-2">Hambatan ({detail.hamb.length})</h4>
                {detail.hamb.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada hambatan tercatat.</p> : (
                  <table className="w-full text-sm">
                    <tbody>
                      {detail.hamb.map((h: any, i: number) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-2">{HAMBATAN_SHORT[h.jenis_hambatan]}</td>
                          <td className="py-2 text-right"><span className={`badge-pill badge-${h.tingkat_hambatan.toLowerCase()}`}>{h.tingkat_hambatan}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {detail.alat.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Rekomendasi Alat Bantu</h4>
                  <ul className="space-y-1.5 text-sm">
                    {detail.alat.map((a: any) => (
                      <li key={a.id} className="flex items-start gap-2">
                        <span className="text-primary">▸</span>
                        <span><strong>{a.nama_alat}</strong> <span className="text-muted-foreground text-xs">({a.kategori})</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
