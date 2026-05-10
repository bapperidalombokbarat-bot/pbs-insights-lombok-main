import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { query, fmt } from "@/lib/db";
import InfoCard from "@/components/InfoCard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell,
} from "recharts";

export const Route = createFileRoute("/spm")({
  head: () => ({ meta: [{ title: "PBS Dashboard | Capaian SPM | Lombok Barat" }] }),
  component: SPMPage,
});

function SPMPage() {
  const [kec, setKec] = useState<string>("Semua");
  const [jenjang, setJenjang] = useState<string>("Semua");

  const { data, isLoading } = useQuery({
    queryKey: ["spm-data", kec, jenjang],
    queryFn: async () => {
      const where: string[] = []; 
      const args: any[] = [];
      
      if (kec !== "Semua") { where.push("kecamatan=?"); args.push(kec); }
      if (jenjang !== "Semua") { where.push("jenjang=?"); args.push(jenjang); }
      const w = where.length ? "WHERE " + where.join(" AND ") : "";

      const kecList = await query<any>(`SELECT DISTINCT kecamatan FROM rapor_spm ORDER BY kecamatan`);
      
      // Get averages per indicator
      const stats = await query<any>(`
        SELECT indikator, AVG(skor) as avg_skor, COUNT(*) as count
        FROM rapor_spm
        ${w}
        GROUP BY indikator
        ORDER BY avg_skor DESC
      `, args);

      // Get school list for table sorted by best average score
      const sekolah = await query<any>(`
        SELECT npsn, nama_satuan, jenis_satuan, kecamatan, jenjang,
               AVG(skor) as school_avg,
               GROUP_CONCAT(indikator || ':' || skor) as raw_scores
        FROM rapor_spm
        ${w}
        GROUP BY npsn, nama_satuan, jenis_satuan, kecamatan, jenjang
        ORDER BY school_avg DESC
        LIMIT 500
      `, args);

      return { kecList, stats, sekolah };
    },
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredSekolah = useMemo(() => {
    if (!data) return [];
    return data.sekolah.filter((s: any) =>
      !search || s.nama_satuan.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const pageData = filteredSekolah.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading || !data) return <LoadingState />;

  const getIndicatorIcon = (name: string) => {
    if (name.includes('Literasi')) return "📖";
    if (name.includes('Numerasi')) return "🧮";
    if (name.includes('Keamanan')) return "🛡️";
    if (name.includes('Kebinekaan')) return "🤝";
    if (name.includes('Inklusivitas')) return "♿";
    if (name.includes('Karakter')) return "🌟";
    if (name.includes('Kualitas')) return "✨";
    if (name.includes('PAUD')) return "🧸";
    if (name.includes('Holistik')) return "🏥";
    return "📊";
  };

  const getIndicatorColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 50) return "warning";
    return "danger";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Capaian Standar Pelayanan Minimal (SPM)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Analisis indikator Rapor Pendidikan Kabupaten Lombok Barat 2025
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1">Kecamatan</span>
            <select 
              value={kec} 
              onChange={(e) => { setKec(e.target.value); setPage(1); }} 
              className="border border-border bg-card/50 backdrop-blur-sm rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none min-w-[160px]"
            >
              <option>Semua</option>
              {data.kecList.map((k: any) => <option key={k.kecamatan} value={k.kecamatan}>{k.kecamatan}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1">Jenjang</span>
            <select 
              value={jenjang} 
              onChange={(e) => { setJenjang(e.target.value); setPage(1); }} 
              className="border border-border bg-card/50 backdrop-blur-sm rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none min-w-[140px]"
            >
              <option value="Semua">Semua Jenjang</option>
              <option value="DASMEN">Dasmen/Vokasi</option>
              <option value="PAUD">PAUD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info Cards Row - Menggunakan grid-cols-4 agar terbagi menjadi 2 baris (4+3) dan tidak terpotong */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.stats.slice(0, 7).map((st: any) => (
          <InfoCard 
            key={st.indikator}
            label={st.indikator}
            value={(st.avg_skor ?? 0).toFixed(2)}
            sub={`Skor Rata-rata`}
            icon={getIndicatorIcon(st.indikator)}
            color={getIndicatorColor(st.avg_skor ?? 0)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="chart-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="!mb-0">Perbandingan Indikator Utama</h3>
            <div className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase">Skor 0-100</div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.stats} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
              <YAxis 
                dataKey="indikator" 
                type="category" 
                tick={{ fontSize: 10, fill: "var(--chart-text)" }} 
                width={120}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                itemStyle={{ color: "var(--foreground)" }}
                cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
              />
              <Bar dataKey="avg_skor" name="Rata-rata Skor" radius={[0, 8, 8, 0]}>
                {data.stats.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={(entry.avg_skor ?? 0) > 70 ? 'var(--color-success)' : (entry.avg_skor ?? 0) > 40 ? 'var(--color-warning)' : 'var(--color-danger)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="!mb-0">Rincian Satuan Pendidikan ({fmt(filteredSekolah.length)})</h3>
            <input 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
              placeholder="Cari nama sekolah..." 
              className="border border-border bg-background rounded-xl px-4 py-2 text-sm min-w-[200px] outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3">Nama Satuan</th>
                  <th className="text-left px-4 py-3">Kecamatan</th>
                  <th className="text-center px-4 py-3">Jenjang</th>
                  <th className="text-right px-4 py-3">Capaian</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((s: any) => {
                  const avgScore = s.school_avg || 0;

                  return (
                    <tr key={s.npsn} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold">{s.nama_satuan}</div>
                        <div className="text-[10px] text-muted-foreground">NPSN: {s.npsn}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.kecamatan}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.jenjang === 'DASMEN' ? 'bg-blue-500/10 text-blue-600' : 'bg-pink-500/10 text-pink-600'}`}>
                          {s.jenjang}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={avgScore >= 70 ? 'text-success' : avgScore >= 40 ? 'text-warning' : 'text-danger'}>
                          {avgScore.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-[10px] text-muted-foreground font-bold uppercase">Halaman {page} dari {Math.ceil(filteredSekolah.length / pageSize)}</div>
            <div className="flex gap-2">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-all"
              >
                ←
              </button>
              <button 
                disabled={page >= Math.ceil(filteredSekolah.length / pageSize)} 
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-all"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground space-y-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <div className="text-sm font-bold animate-pulse">Menganalisis Indikator SPM...</div>
    </div>
  );
}
