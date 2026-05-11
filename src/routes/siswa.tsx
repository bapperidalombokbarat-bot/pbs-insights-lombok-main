import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { query, fmt, HAMBATAN_SHORT } from "@/lib/db";
import * as XLSX from "xlsx/xlsx.mjs";

export const Route = createFileRoute("/siswa")({
  head: () => ({ meta: [{ title: "PBS Dashboard | Data Siswa | Lombok Barat" }] }),
  component: SiswaPage,
});

function SiswaPage() {
  const [q, setQ] = useState("");
  const [kec, setKec] = useState("Semua");
  const [jenjang, setJenjang] = useState("Semua");
  const [kelamin, setKelamin] = useState("Semua");
  const [tingkat, setTingkat] = useState("Semua");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [detail, setDetail] = useState<any>(null);

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
    return { w: where.length ? "WHERE " + where.join(" AND ") : "", args };
  }, [q, kec, jenjang, kelamin, tingkat]);

  const { data, isLoading } = useQuery({
    queryKey: ["siswa", filterSql, page, perPage],
    queryFn: async () => {
      const total = (await query<any>(`SELECT COUNT(*) AS n FROM siswa s ${filterSql.w}`, filterSql.args))[0].n;
      const rows = await query<any>(`
        SELECT s.* FROM siswa s ${filterSql.w}
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
      const all = await query<any>(`
        SELECT 
          s.nama_siswa as 'Nama Siswa', 
          s.nisn as 'NISN', 
          s.satuan_pendidikan as 'Sekolah', 
          s.kecamatan as 'Kecamatan', 
          s.tingkat_kelas as 'Kelas', 
          s.jenis_kelamin as 'JK',
          h.jenis_hambatan as 'Jenis Hambatan', 
          h.tingkat_hambatan as 'Klasifikasi Hambatan',
          (SELECT GROUP_CONCAT(nama_alat, ', ') FROM alat_bantu WHERE jenis_hambatan = h.jenis_hambatan) as 'Tipe Alat Bantu'
        FROM siswa s
        LEFT JOIN hambatan_siswa h ON s.id = h.siswa_id
        ${filterSql.w}
        ORDER BY s.nama_siswa
      `, filterSql.args);

      const worksheet = XLSX.utils.json_to_sheet(all);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa PBS");
      
      XLSX.writeFile(workbook, `data-siswa-pbs-lombok-barat.xlsx`);
    } catch (error) {
      console.error("Gagal export excel:", error);
      alert("Terjadi kesalahan saat mengekspor data.");
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
    setDetail({ s, hamb, alat });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Data Siswa</h2>
          <p className="text-sm text-muted-foreground mt-1">{data ? `${fmt(data.total)} siswa` : "Memuat…"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2">
            📊 Export Excel
          </button>
          <button onClick={exportCsv} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">⬇ Export CSV</button>
        </div>
      </div>

      <div className="chart-card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        <input value={q} onChange={(e)=>{setQ(e.target.value);setPage(1);}} placeholder="🔍 Cari nama / NISN / sekolah" className="border border-border bg-background rounded-lg px-3 py-2 text-sm lg:col-span-2" />
        <select value={kec} onChange={(e)=>{setKec(e.target.value);setPage(1);}} className="border border-border bg-background rounded-lg px-3 py-2 text-sm">
          <option>Semua</option>{kecList?.map((k:any)=><option key={k.kecamatan}>{k.kecamatan}</option>)}
        </select>
        <select value={jenjang} onChange={(e)=>{setJenjang(e.target.value);setPage(1);}} className="border border-border bg-background rounded-lg px-3 py-2 text-sm">
          <option>Semua</option><option>TK</option><option>SD/MI</option><option>SMP/MTS</option>
        </select>
        <select value={kelamin} onChange={(e)=>{setKelamin(e.target.value);setPage(1);}} className="border border-border bg-background rounded-lg px-3 py-2 text-sm">
          <option>Semua</option><option>Laki - Laki</option><option>Perempuan</option>
        </select>
        <select value={tingkat} onChange={(e)=>{setTingkat(e.target.value);setPage(1);}} className="border border-border bg-background rounded-lg px-3 py-2 text-sm">
          <option>Semua</option><option>Ringan</option><option>Sedang</option><option>Berat</option><option>Tanpa Hambatan</option>
        </select>
      </div>

      <div className="chart-card">
        {isLoading ? <div className="py-12 text-center text-muted-foreground"><div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-2">No</th>
                  <th className="text-left px-2 py-2">Nama Siswa</th>
                  <th className="text-left px-2 py-2">NISN</th>
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
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-2 py-2 text-muted-foreground">{(page-1)*perPage + i + 1}</td>
                      <td className="px-2 py-2 font-medium">{r.nama_siswa}</td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{r.nisn}</td>
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
                      <td className="px-2 py-2"><button onClick={()=>openDetail(r)} className="text-xs text-primary hover:underline">Detail</button></td>
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
              <div>
                <h3 className="text-xl font-bold">{detail.s.nama_siswa}</h3>
                <p className="text-sm text-muted-foreground">NISN: {detail.s.nisn}</p>
              </div>
              <button onClick={()=>setDetail(null)} className="text-2xl text-muted-foreground hover:text-foreground">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Sekolah</div><div className="font-medium">{detail.s.satuan_pendidikan}</div></div>
                <div><div className="text-xs text-muted-foreground">Kecamatan</div><div className="font-medium">{detail.s.kecamatan}</div></div>
                <div><div className="text-xs text-muted-foreground">Jenjang</div><div className="font-medium">{detail.s.jenjang}</div></div>
                <div><div className="text-xs text-muted-foreground">Kelas</div><div className="font-medium">{detail.s.tingkat_kelas}</div></div>
                <div><div className="text-xs text-muted-foreground">Jenis Kelamin</div><div className="font-medium">{detail.s.jenis_kelamin}</div></div>
              </div>
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
