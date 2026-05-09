import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { query, fmt, HAMBATAN_COLS, HAMBATAN_SHORT } from "@/lib/db";
import InfoCard from "@/components/InfoCard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/kecamatan")({
  head: () => ({ meta: [{ title: "PBS Dashboard | Per Kecamatan | Lombok Barat" }] }),
  component: KecamatanPage,
});

function KecamatanPage() {
  const [kec, setKec] = useState<string>("Semua");
  const [jenjang, setJenjang] = useState<string>("Semua");

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

  const heatMap = useMemo(() => {
    if (!data) return null;
    const map = new Map<string, number>();
    let max = 0;
    data.heatmap.forEach((r: any) => {
      const k = `${r.kecamatan}|${r.jenis_hambatan}`;
      map.set(k, r.total);
      if (r.total > max) max = r.total;
    });
    return { map, max };
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
        <h2 className="text-2xl font-bold">Analisa Per Kecamatan</h2>
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

      <div className="chart-card overflow-x-auto">
        <h3>Heatmap Jenis Hambatan per Kecamatan</h3>
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 font-semibold sticky left-0 bg-card z-10">Kecamatan</th>
              {HAMBATAN_COLS.map((h) => (
                <th key={h} className="px-1.5 py-2 font-medium text-muted-foreground" style={{ minWidth: 80 }}>{HAMBATAN_SHORT[h]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.kecList.map((k: any) => (
              <tr key={k.kecamatan}>
                <td className="py-1.5 px-2 font-medium sticky left-0 bg-card z-10 border-r border-border/50">{k.kecamatan}</td>
                {HAMBATAN_COLS.map((h) => {
                  const v = heatMap?.map.get(`${k.kecamatan}|${h}`) || 0;
                  const ratio = heatMap?.max ? v / heatMap.max : 0;
                  const bg = v === 0 ? "transparent" : `rgba(224, 36, 36, ${0.1 + ratio * 0.7})`;
                  const color = ratio > 0.45 ? "#fff" : "var(--foreground)";
                  return (
                    <td key={h} className="text-center py-1.5 px-1.5 transition-colors" style={{ background: bg, color }}>
                      {v || "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-card">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h3 className="!mb-0">Ringkasan Sekolah ({fmt(filteredSekolah.length)})</h3>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nama sekolah…" className="border border-border bg-background rounded-lg px-3 py-2 text-sm min-w-[240px]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Sekolah</th>
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
