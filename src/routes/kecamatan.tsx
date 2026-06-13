import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { query, fmt, HAMBATAN_COLS, HAMBATAN_SHORT } from "@/lib/db";
import InfoCard from "@/components/InfoCard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/kecamatan")({
  head: () => ({ meta: [{ title: "PBS Dashboard | Analis per Kecamatan | Lombok Barat" }] }),
  component: KecamatanPage,
});

function KecamatanPage() {
  const [kec, setKec] = useState<string>("Semua");
  const [jenjang, setJenjang] = useState<string>("Semua");
  const [drillDown, setDrillDown] = useState<{kec: string, hambatan: string, total: number} | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kecamatan", kec, jenjang],
    queryFn: async () => {
      const where: string[] = []; const args: any[] = [];
      if (kec !== "Semua") { where.push("s.kecamatan=?"); args.push(kec); }
      if (jenjang !== "Semua") { where.push("s.jenjang=?"); args.push(jenjang); }
      const w = where.length ? "WHERE " + where.join(" AND ") : "";

      const kecList = await query<any>(`SELECT DISTINCT kecamatan FROM siswa ORDER BY kecamatan`);
      const summary = await query<any>(`
        SELECT
          (SELECT COUNT(*) FROM siswa s ${w}) AS total_siswa,
          (SELECT COUNT(DISTINCT satuan_pendidikan) FROM siswa s ${w}) AS total_sekolah,
          (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa h JOIN siswa s ON s.id=h.siswa_id ${w}) AS berkebutuhan
      `, [...args, ...args, ...args]);

      const perKec = await query<any>(`
        SELECT s.kecamatan,
          COUNT(DISTINCT CASE WHEN h.tingkat_hambatan='Ringan' THEN h.siswa_id END) AS ringan,
          COUNT(DISTINCT CASE WHEN h.tingkat_hambatan='Sedang' THEN h.siswa_id END) AS sedang,
          COUNT(DISTINCT CASE WHEN h.tingkat_hambatan='Berat'  THEN h.siswa_id END) AS berat
        FROM siswa s LEFT JOIN hambatan_siswa h ON s.id=h.siswa_id
        ${jenjang !== "Semua" ? "WHERE s.jenjang=?" : ""}
        GROUP BY s.kecamatan ORDER BY s.kecamatan
      `, jenjang !== "Semua" ? [jenjang] : []);

      const heatmap = await query<any>(`
        SELECT s.kecamatan, h.jenis_hambatan, COUNT(DISTINCT h.siswa_id) AS total
        FROM siswa s JOIN hambatan_siswa h ON s.id=h.siswa_id
        ${jenjang !== "Semua" ? "WHERE s.jenjang=?" : ""}
        GROUP BY s.kecamatan, h.jenis_hambatan
      `, jenjang !== "Semua" ? [jenjang] : []);

      const sekolah = await query<any>(`
        SELECT s.satuan_pendidikan, s.kecamatan, s.jenjang,
          COUNT(*) AS total_siswa,
          COUNT(DISTINCT h.siswa_id) AS berkebutuhan
        FROM siswa s LEFT JOIN hambatan_siswa h ON s.id=h.siswa_id
        ${w}
        GROUP BY s.satuan_pendidikan, s.kecamatan, s.jenjang
        ORDER BY berkebutuhan DESC, total_siswa DESC
      `, args);

      return { kecList, summary: summary[0], perKec, heatmap, sekolah };
    },
  });

  const heatMapData = useMemo(() => {
    if (!data) return { map: new Map<string, number>(), max: 0, colTotals: {} as Record<string, number>, rowTotals: {} as Record<string, number>, grandTotal: 0 };
    const map = new Map<string, number>();
    const colTotals: Record<string, number> = {};
    const rowTotals: Record<string, number> = {};
    let max = 0;
    let grandTotal = 0;

    data.heatmap.forEach((r: any) => {
      const k = `${r.kecamatan}|${r.jenis_hambatan}`;
      map.set(k, r.total);
      if (r.total > max) max = r.total;
      
      colTotals[r.jenis_hambatan] = (colTotals[r.jenis_hambatan] || 0) + r.total;
      rowTotals[r.kecamatan] = (rowTotals[r.kecamatan] || 0) + r.total;
      grandTotal += r.total;
    });

    return { map, max, colTotals, rowTotals, grandTotal };
  }, [data]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filteredSekolah = useMemo(() => {
    if (!data) return [];
    return data.sekolah.filter((s: any) =>
      !search || s.satuan_pendidikan.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);
  const pageSize = 10;
  const pageData = filteredSekolah.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading || !data) return <Loading />;
  const s = data.summary;
  const persen = s.total_siswa > 0 ? ((s.berkebutuhan / s.total_siswa) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analis per Kecamatan</h2>
        <p className="text-sm text-muted-foreground mt-1">Filter dan bandingkan data antar kecamatan</p>
      </div>

      <div className="chart-card flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Kecamatan</label>
          <select value={kec} onChange={(e) => setKec(e.target.value)} className="border border-border bg-background rounded-lg px-3 py-2 text-sm min-w-[180px]">
            <option>Semua</option>
            {data.kecList.map((k: any) => <option key={k.kecamatan}>{k.kecamatan}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Jenjang</label>
          <select value={jenjang} onChange={(e) => setJenjang(e.target.value)} className="border border-border bg-background rounded-lg px-3 py-2 text-sm min-w-[150px]">
            <option>Semua</option><option>TK</option><option>SD/MI</option><option>SMP/MTS</option>
          </select>
        </div>
        <button onClick={() => { setKec("Semua"); setJenjang("Semua"); }} className="text-xs text-primary hover:underline">Reset</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="Total Siswa" value={s.total_siswa} icon="👥" color="primary" />
        <InfoCard label="Total Sekolah" value={s.total_sekolah} icon="🏫" color="secondary" />
        <InfoCard label="Siswa Berkebutuhan" value={s.berkebutuhan} icon="⚠️" color="warning" />
        <InfoCard label="% Berkebutuhan" value={`${persen}%`} icon="📊" color="danger" />
      </div>

      <div className="chart-card">
        <h3>Perbandingan Tingkat Hambatan per Kecamatan</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.perKec}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="kecamatan" tick={{ fontSize: 11, fill: "var(--chart-text)" }} angle={-25} textAnchor="end" height={70} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
            <Tooltip 
              contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
              formatter={(v: number) => fmt(v)} 
            />
            <Legend />
            <Bar dataKey="ringan" name="Ringan" fill="var(--success)" radius={[4,4,0,0]} />
            <Bar dataKey="sedang" name="Sedang" fill="var(--warning)" radius={[4,4,0,0]} />
            <Bar dataKey="berat"  name="Berat"  fill="var(--danger)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card overflow-x-auto relative">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="!mb-0">Heatmap Jenis Hambatan per Kecamatan</h3>
          <div className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full flex items-center gap-1.5 font-medium border border-primary/20">
            <span>👆</span> Klik angka untuk melihat rincian sekolah
          </div>
        </div>
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 font-semibold sticky left-0 bg-card z-10 border-b border-border/50">Kecamatan</th>
              {HAMBATAN_COLS.map((h) => (
                <th key={h} className="px-1.5 py-2 font-medium text-muted-foreground border-b border-border/50" style={{ minWidth: 80 }}>{HAMBATAN_SHORT[h]}</th>
              ))}
              <th className="text-center py-2 px-2 font-bold bg-muted/30 border-b border-border/50">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.kecList.map((k: any) => {
              const rowSum = heatMapData.rowTotals[k.kecamatan] || 0;
              return (
                <tr key={k.kecamatan} className="group">
                  <td className="py-1.5 px-2 font-medium sticky left-0 bg-card group-hover:bg-muted/30 z-10 border-r border-b border-border/50">{k.kecamatan}</td>
                  {HAMBATAN_COLS.map((h) => {
                    const v = heatMapData.map.get(`${k.kecamatan}|${h}`) || 0;
                    const ratio = heatMapData.max ? v / heatMapData.max : 0;
                    const bg = v === 0 ? "transparent" : `rgba(224, 36, 36, ${0.1 + ratio * 0.7})`;
                    const color = ratio > 0.45 ? "#fff" : "var(--foreground)";
                    return (
                      <td 
                        key={h} 
                        className={`text-center py-1.5 px-1.5 transition-colors border-b border-border/50 ${v > 0 ? 'cursor-pointer hover:ring-2 hover:ring-primary hover:z-20 relative font-medium' : ''}`} 
                        style={{ background: bg, color }}
                        title={v > 0 ? `${k.kecamatan} - ${h}: ${v} Siswa (Klik untuk detail)` : ''}
                        onClick={() => v > 0 && setDrillDown({ kec: k.kecamatan, hambatan: h, total: v })}
                      >
                        {v || "—"}
                      </td>
                    );
                  })}
                  <td className="text-center py-1.5 px-2 font-bold bg-muted/30 border-b border-border/50">{rowSum || "—"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 font-bold">
              <td className="py-2 px-2 sticky left-0 bg-muted/80 z-10 border-r border-t border-border/50 uppercase">Total Kabupaten</td>
              {HAMBATAN_COLS.map((h) => (
                <td key={h} className="text-center py-2 px-1.5 border-t border-border/50">{heatMapData.colTotals[h] || "—"}</td>
              ))}
              <td className="text-center py-2 px-2 text-primary border-t border-border/50 text-sm">{heatMapData.grandTotal || "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="chart-card">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h3 className="!mb-0">Satuan Pendidikan dan Jenjang</h3>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nama satuan pendidikan…" className="border border-border bg-background rounded-lg px-3 py-2 text-sm min-w-[240px]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Satuan Pendidikan</th>
                <th className="text-left px-3 py-2">Kecamatan</th>
                <th className="text-left px-3 py-2">Jenjang</th>
                <th className="text-right px-3 py-2">Siswa</th>
                <th className="text-right px-3 py-2">Berkebutuhan</th>
                <th className="text-right px-3 py-2">%</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r: any, i: number) => (
                <tr key={i} className="border-t border-border hover:bg-muted/50">
                  <td className="px-3 py-2">{r.satuan_pendidikan}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.kecamatan}</td>
                  <td className="px-3 py-2"><span className="badge-pill bg-primary/10 text-primary border border-primary/20">{r.jenjang}</span></td>
                  <td className="px-3 py-2 text-right">{fmt(r.total_siswa)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(r.berkebutuhan)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{r.total_siswa ? ((r.berkebutuhan/r.total_siswa)*100).toFixed(1) : 0}%</td>
                </tr>
              ))}
              {pageData.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination total={filteredSekolah.length} page={page} pageSize={pageSize} onChange={setPage} />
      </div>

      {drillDown && <DrillDownDialog data={drillDown} onClose={() => setDrillDown(null)} jenjang={jenjang} />}
    </div>
  );
}

function DrillDownDialog({ data, onClose, jenjang }: { data: {kec: string, hambatan: string, total: number}, onClose: ()=>void, jenjang: string }) {
  const { data: list, isLoading } = useQuery({
    queryKey: ["heatmap-drilldown", data.kec, data.hambatan, jenjang],
    queryFn: async () => {
      const args: any[] = [data.kec, data.hambatan];
      let jWhere = "";
      if (jenjang !== "Semua") {
        jWhere = "AND s.jenjang=?";
        args.push(jenjang);
      }
      return await query<any>(`
        SELECT s.satuan_pendidikan, s.jenjang, COUNT(DISTINCT h.siswa_id) as n
        FROM siswa s
        JOIN hambatan_siswa h ON s.id = h.siswa_id
        WHERE s.kecamatan=? AND h.jenis_hambatan=? ${jWhere}
        GROUP BY s.satuan_pendidikan, s.jenjang
        ORDER BY n DESC
      `, args);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-border" onClick={(e)=>e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-start justify-between bg-muted/30 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">🔍</span> Rincian Sebaran Sekolah
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Kec. <strong className="text-foreground">{data.kec}</strong> · Hambatan <strong className="text-foreground">{data.hambatan}</strong>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-background border border-border hover:bg-muted text-muted-foreground transition-colors">✕</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <div className="mb-5 bg-primary/10 text-primary border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-medium">Total Siswa Berkebutuhan</span>
            <span className="text-2xl font-black">{data.total}</span>
          </div>
          
          {isLoading ? (
            <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Distribusi per Satuan Pendidikan</div>
              {list?.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card hover:bg-muted/40 hover:border-primary/30 transition-all group">
                  <div>
                    <div className="font-semibold text-sm group-hover:text-primary transition-colors">{s.satuan_pendidikan}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 px-2 py-0.5 rounded bg-muted/60 inline-block font-medium border border-border/50">{s.jenjang}</div>
                  </div>
                  <div className="font-bold text-base bg-background px-3.5 py-1.5 rounded-lg border border-border shadow-sm group-hover:border-primary/40 group-hover:bg-primary/5 transition-colors">{s.n}</div>
                </div>
              ))}
              {list?.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">Tidak ada data terperinci yang ditemukan.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pagination({ total, page, pageSize, onChange }: { total: number; page: number; pageSize: number; onChange: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between mt-3 text-sm">
      <div className="text-muted-foreground">Halaman {page} dari {pages}</div>
      <div className="flex gap-2">
        <button disabled={page<=1} onClick={() => onChange(page-1)} className="px-3 py-1.5 rounded border border-border disabled:opacity-40 hover:bg-muted">‹ Sebelumnya</button>
        <button disabled={page>=pages} onClick={() => onChange(page+1)} className="px-3 py-1.5 rounded border border-border disabled:opacity-40 hover:bg-muted">Berikutnya ›</button>
      </div>
    </div>
  );
}

function Loading() {
  return <div className="flex items-center justify-center h-[60vh] text-muted-foreground"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}
