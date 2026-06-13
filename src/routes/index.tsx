import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { query, queryOne, fmt, HAMBATAN_SHORT } from "@/lib/db";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LabelList,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "PBS Dashboard | Beranda | Lombok Barat" }] }),
  component: DashboardPage,
});

const COLORS = {
  primary: "#1a56db",
  secondary: "#7e3af2",
  success: "#0e9f6e",
  warning: "#ff5a1f",
  danger: "#e02424",
};

function DashboardPage() {
  const [showDarurat, setShowDarurat] = useState(false);
  const [showTren, setShowTren] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const [summary, perKec, perJenis, perJenjang, kelamin, darurat, daruratList, spmSummary, trenList, rekomendasiAlat] = await Promise.all([
        queryOne<any>(`
          SELECT
            (SELECT COUNT(*) FROM siswa) AS total_siswa,
            (SELECT COUNT(DISTINCT satuan_pendidikan) FROM siswa) AS total_sekolah,
            (SELECT COUNT(DISTINCT npsn) FROM rapor_spm) AS total_sekolah_rapor,
            (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa) AS total_berkebutuhan,
            (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa WHERE tingkat_hambatan='Ringan') AS ringan,
            (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa WHERE tingkat_hambatan='Sedang') AS sedang,
            (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa WHERE tingkat_hambatan='Berat') AS berat
        `),
        query<any>(`
          SELECT s.kecamatan, 
                 COUNT(DISTINCT s.id) AS total,
                 COUNT(DISTINCT h.siswa_id) as berkebutuhan
          FROM siswa s
          LEFT JOIN hambatan_siswa h ON s.id = h.siswa_id
          GROUP BY s.kecamatan 
        `),
        query<any>(
          `SELECT jenis_hambatan, COUNT(DISTINCT siswa_id) AS total FROM hambatan_siswa GROUP BY jenis_hambatan ORDER BY total DESC`
        ),
        query<any>(
          `SELECT jenjang, COUNT(*) AS total FROM siswa GROUP BY jenjang`
        ),
        query<any>(`
          SELECT s.jenis_kelamin AS k,
            COUNT(DISTINCT s.id) AS total,
            COUNT(DISTINCT h.siswa_id) AS berkebutuhan
          FROM siswa s LEFT JOIN hambatan_siswa h ON h.siswa_id=s.id
          GROUP BY s.jenis_kelamin
        `),
        // Darurat Inklusi Query
        queryOne<any>(`
          SELECT COUNT(DISTINCT r.nama_satuan) as total_darurat
          FROM rapor_spm r
          JOIN (
            SELECT s.satuan_pendidikan
            FROM siswa s JOIN hambatan_siswa h ON s.id = h.siswa_id
            GROUP BY s.satuan_pendidikan
          ) pbs ON pbs.satuan_pendidikan = r.nama_satuan
          WHERE r.indikator LIKE '%Inklusivitas%' 
          AND r.label IN ('Perlu Intervensi Khusus', 'Dasar', 'Kurang', 'Merintis', 'Perlu Upaya')
        `),
        // List Detail Darurat
        query<any>(`
          SELECT DISTINCT r.npsn, r.nama_satuan, r.kecamatan, r.jenjang, r.label, r.delta, pbs.total_pbs
          FROM rapor_spm r
          JOIN (
            SELECT s.satuan_pendidikan, COUNT(DISTINCT h.siswa_id) as total_pbs
            FROM siswa s JOIN hambatan_siswa h ON s.id = h.siswa_id
            GROUP BY s.satuan_pendidikan
          ) pbs ON pbs.satuan_pendidikan = r.nama_satuan
          WHERE r.indikator LIKE '%Inklusivitas%' 
          AND r.label IN ('Perlu Intervensi Khusus', 'Dasar', 'Kurang', 'Merintis', 'Perlu Upaya')
          ORDER BY pbs.total_pbs DESC
        `),
        // SPM Tren
        queryOne<any>(`
          SELECT AVG(delta) as avg_delta FROM rapor_spm
        `),
        // Top 20 Tren
        query<any>(`
          SELECT npsn, nama_satuan, kecamatan, jenjang, AVG(delta) as avg_delta
          FROM rapor_spm
          GROUP BY npsn, nama_satuan, kecamatan, jenjang
          HAVING avg_delta > 0
          ORDER BY avg_delta DESC
          LIMIT 20
        `),
        // Alat Bantu Rekomendasi based on Top 3 Hambatan
        query<any>(`
          SELECT a.jenis_hambatan, a.nama_alat, a.kategori, a.deskripsi
          FROM alat_bantu a
          WHERE a.jenis_hambatan IN (
            SELECT jenis_hambatan FROM hambatan_siswa GROUP BY jenis_hambatan ORDER BY COUNT(DISTINCT siswa_id) DESC LIMIT 3
          )
        `)
      ]);
      return { summary, perKec, perJenis, perJenjang, kelamin, darurat, daruratList, spmSummary, trenList, rekomendasiAlat };
    },
  });

  if (isLoading || !data) return <LoadingState />;
  const s = data.summary!;
  const donut = [
    { name: "Ringan", value: s.ringan, color: COLORS.success },
    { name: "Sedang", value: s.sedang, color: COLORS.warning },
    { name: "Berat", value: s.berat, color: COLORS.danger },
  ];
  const totalHambatan = s.ringan + s.sedang + s.berat;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-black text-foreground tracking-tight">Command Center PBS (Profil Belajar Siswa)</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ringkasan Holistik Kinerja Rapor Pendidikan & Profil Siswa Berkebutuhan Khusus Kab. Lombok Barat
        </p>
      </div>

      {/* Hero Section - Executive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-primary/90 to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden transition-transform hover:-translate-y-1">
          <div className="absolute -right-6 -bottom-6 text-8xl opacity-20">👥</div>
          <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>📊</span> Total Siswa yg terdata PBS
          </p>
          <div className="text-5xl font-black mb-1">{fmt(s.total_siswa)}</div>
          <p className="text-[11px] leading-snug font-medium opacity-90 border-t border-white/20 pt-3 mt-3">
            Tersebar di <strong>{fmt(s.total_sekolah)}</strong> dari <strong>{fmt(s.total_sekolah_rapor)}</strong> Total Satuan Pendidikan di Lombok Barat
          </p>
        </div>

        <div className="bg-gradient-to-br from-warning/90 to-orange-500 rounded-3xl p-6 text-white shadow-xl shadow-warning/20 relative overflow-hidden transition-transform hover:-translate-y-1">
          <div className="absolute -right-6 -bottom-6 text-8xl opacity-20">⚠️</div>
          <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>♿</span> Siswa Berkebutuhan Khusus
          </p>
          <div className="text-5xl font-black mb-1">{fmt(s.total_berkebutuhan)}</div>
          <p className="text-sm font-medium opacity-90 border-t border-white/20 pt-3 mt-3">
            <strong>{((s.total_berkebutuhan/s.total_siswa)*100).toFixed(1)}%</strong> Rasio Kerentanan Kabupaten
          </p>
        </div>

        <button 
          onClick={() => setShowDarurat(!showDarurat)} 
          className="block outline-none group text-left w-full cursor-pointer focus:ring-4 focus:ring-danger/30 rounded-3xl"
        >
          <div className="bg-gradient-to-br from-danger/90 to-rose-600 rounded-3xl p-6 text-white shadow-xl shadow-danger/20 relative overflow-hidden transition-all hover:-translate-y-1 ring-2 ring-danger/50 ring-offset-2 ring-offset-background h-full flex flex-col">
            <div className="absolute -right-6 -bottom-6 text-8xl opacity-20 group-hover:scale-110 transition-transform">🚨</div>
            <p className="text-white/90 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="animate-pulse">🔴</span> Darurat Inklusi
            </p>
            <div className="text-5xl font-black mb-1 flex items-baseline gap-2">
              {fmt(data.darurat?.total_darurat || 0)} <span className="text-lg font-medium opacity-80">Sekolah</span>
            </div>
            <div className="text-[10px] font-medium opacity-95 mt-1 mb-3 leading-relaxed pr-6">
              Status ini muncul karena sekolah tersebut terdeteksi <strong>sedang mendidik Siswa Berkebutuhan Khusus</strong>, namun <strong>Indikator Iklim Inklusivitas</strong> pada Rapor Pendidikan mereka justru bernilai <strong>Merah/Rentan</strong>.
            </div>
            <p className="text-[11px] font-bold opacity-100 bg-black/25 px-3 py-2 rounded-xl mt-auto leading-tight backdrop-blur-sm flex items-center justify-between">
              <span>Buka Daftar Sekolah Darurat</span>
              <span className={`transition-transform duration-300 ${showDarurat ? 'rotate-180' : ''}`}>▼</span>
            </p>
          </div>
        </button>

        <button 
          onClick={() => setShowTren(!showTren)} 
          className="block outline-none group text-left w-full cursor-pointer focus:ring-4 focus:ring-success/30 rounded-3xl"
        >
          <div className="bg-gradient-to-br from-success/90 to-emerald-500 rounded-3xl p-6 text-white shadow-xl shadow-success/20 relative overflow-hidden transition-all hover:-translate-y-1 h-full flex flex-col">
            <div className="absolute -right-6 -bottom-6 text-8xl opacity-20 group-hover:scale-110 transition-transform">📈</div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>⭐</span> Tren Rapor Pendidikan
            </p>
            <div className="text-5xl font-black mb-1 flex items-center gap-2">
              {(data.spmSummary?.avg_delta || 0) > 0 ? '+' : ''}{(data.spmSummary?.avg_delta || 0).toFixed(2)}
            </div>
            <div className="text-[10px] font-medium opacity-95 mt-1 mb-3 leading-relaxed pr-6">
              Angka ini adalah kalkulasi <strong>Rata-rata Perubahan (Delta)</strong> dari capaian SPM tahun lalu. Nilai positif (+) menandakan kualitas iklim & mutu pendidikan se-kabupaten secara umum <strong>mengalami peningkatan</strong>.
            </div>
            <p className="text-[11px] font-bold opacity-100 bg-black/25 px-3 py-2 rounded-xl mt-auto leading-tight backdrop-blur-sm flex items-center justify-between">
              <span>Lihat Top 20 Sekolah Bintang</span>
              <span className={`transition-transform duration-300 ${showTren ? 'rotate-180' : ''}`}>▼</span>
            </p>
          </div>
        </button>
      </div>

      {/* Collapse Area for Darurat Inklusi */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showDarurat ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-danger/5 border border-danger/20 rounded-3xl p-6 shadow-sm mb-6 mt-[-10px]">
          <h3 className="text-danger flex items-center gap-2 mb-4 font-bold">
            <span>🚨</span> Rincian {fmt(data.darurat?.total_darurat || 0)} Satuan Pendidikan Darurat Inklusi
          </h3>
          {data.daruratList?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.daruratList.map((sch: any, idx: number) => (
                <Link key={idx} to="/spm" className="bg-card border border-danger/30 p-4 rounded-xl hover:shadow-md transition-shadow group flex flex-col justify-between h-full cursor-pointer">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-0.5 rounded-md uppercase">{sch.jenjang}</span>
                      <span className="text-[10px] text-muted-foreground">{sch.kecamatan}</span>
                    </div>
                    <div className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">{sch.nama_satuan}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold">Beban Siswa</span>
                      <span className="text-sm font-black text-warning flex items-center gap-1">♿ {sch.total_pbs} Anak</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase text-muted-foreground font-bold">Label Inklusivitas</span>
                      <span className="text-xs font-bold text-danger">{sch.label}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground italic">Tidak ada sekolah berstatus darurat saat ini.</div>
          )}
        </div>
      </div>

      {/* Collapse Area for Tren Positif */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showTren ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-success/5 border border-success/20 rounded-3xl p-6 shadow-sm mb-6 mt-[-10px]">
          <h3 className="text-success flex items-center gap-2 mb-4 font-bold">
            <span>⭐</span> Top 20 Sekolah dengan Tren Kinerja Rapor Pendidikan Tertinggi
          </h3>
          {data.trenList?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {data.trenList.map((sch: any, idx: number) => (
                <Link key={idx} to="/spm" className="bg-card border border-success/30 p-4 rounded-xl hover:shadow-md transition-shadow group flex flex-col justify-between h-full cursor-pointer">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-md uppercase">#{idx+1} {sch.jenjang}</span>
                      <span className="text-[10px] text-muted-foreground">{sch.kecamatan}</span>
                    </div>
                    <div className="font-bold text-foreground text-sm leading-tight group-hover:text-success transition-colors">{sch.nama_satuan}</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Rata-rata Delta</span>
                    <span className="text-sm font-black text-success flex items-center gap-1">📈 +{sch.avg_delta?.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground italic">Tidak ada data tren saat ini.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card flex flex-col">
          <div className="mb-6">
            <h3 className="!mb-0 text-lg">Konsentrasi PBS per Kecamatan</h3>
            <p className="text-xs text-muted-foreground mt-1">Daftar wilayah dengan beban tanggungan Siswa Berkebutuhan Khusus terbanyak beserta persentasenya.</p>
          </div>
          <div className="flex-1 min-h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.perKec.sort((a:any, b:any) => b.berkebutuhan - a.berkebutuhan)} layout="vertical" margin={{ left: 20, right: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
                <YAxis dataKey="kecamatan" type="category" tick={{ fontSize: 12, fill: "var(--chart-text)", fontWeight: 600 }} width={90} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)", borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                  formatter={(v: number, name: string, props: any) => {
                    const t = props.payload.total;
                    return [`${fmt(v)} Siswa (${((v/t)*100).toFixed(1)}%)`, 'Siswa Berkebutuhan Khusus'];
                  }} 
                />
                <Bar dataKey="berkebutuhan" fill="var(--warning)" radius={[0, 6, 6, 0]} maxBarSize={40}>
                  <LabelList 
                    dataKey="berkebutuhan" 
                    position="right" 
                    formatter={(v: number, i: number) => {
                      const item = data.perKec.find((k:any) => k.berkebutuhan === v);
                      return item ? `${fmt(v)} (${((v / item.total) * 100).toFixed(1)}%)` : fmt(v);
                    }} 
                    style={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 'bold' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card flex flex-col">
          <div className="mb-6">
            <h3 className="!mb-0 text-lg">Proporsi Hambatan per Tingkat Keparahan</h3>
            <p className="text-xs text-muted-foreground mt-1">Pembagian kategori Intervensi Ringan, Sedang, dan Berat.</p>
          </div>
          <div className="relative flex-1 min-h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={90} outerRadius={140} paddingAngle={3}>
                  {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: "var(--foreground)", fontWeight: 'bold' }}
                  formatter={(v: number) => `${fmt(v)} Siswa`} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  iconType="circle" 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-foreground text-xs font-bold uppercase">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: -35 }}>
              <div className="text-4xl font-black text-foreground drop-shadow-sm">{fmt(totalHambatan)}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Total Intervensi</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="chart-card lg:col-span-1 flex flex-col">
          <div className="mb-6">
            <h3 className="!mb-0 text-lg">Jenis Hambatan Terbanyak</h3>
            <p className="text-xs text-muted-foreground mt-1">Peringkat disabilitas di Lombok Barat.</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.perJenis.slice(0, 10).map((d:any) => ({ ...d, label: HAMBATAN_SHORT[d.jenis_hambatan] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--chart-text)" }} angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)", borderRadius: '12px' }}
                  cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                  formatter={(v: number) => [`${fmt(v)} Siswa`, 'Jumlah']} 
                />
                <Bar dataKey="total" fill="var(--secondary)" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card lg:col-span-2 flex flex-col bg-primary/5 border-primary/10">
          <div className="mb-6">
            <h3 className="!mb-0 text-lg flex items-center gap-2">
              <span className="p-1.5 bg-primary/10 text-primary rounded-lg text-xl">🛒</span> 
              Proyeksi Pengadaan Alat Bantu Mendesak
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Rekomendasi spesifik berdasarkan 3 jenis hambatan tertinggi di kabupaten tahun ini.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            {data.perJenis.slice(0, 3).map((h: any, idx: number) => {
              const tools = data.rekomendasiAlat.filter((a:any) => a.jenis_hambatan === h.jenis_hambatan);
              return (
                <div key={idx} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border/50">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 text-foreground flex items-center justify-center font-black text-lg">
                      #{idx+1}
                    </div>
                    <div>
                      <div className="font-bold text-sm leading-tight text-foreground mb-1">{h.jenis_hambatan}</div>
                      <div className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-md font-bold w-max">
                        {fmt(h.total)} Siswa Terdampak
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 flex-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Rekomendasi Alat:</div>
                    {tools.map((t:any, i:number) => (
                      <div key={i} className="flex flex-col p-3 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/60 transition-colors">
                        <span className="font-bold text-xs text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 bg-success rounded-full shadow-[0_0_8px_rgba(14,159,110,0.8)]"></span> {t.nama_alat}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-1 pl-4 leading-relaxed">{t.deskripsi}</span>
                      </div>
                    ))}
                    {tools.length === 0 && <div className="text-xs text-muted-foreground italic p-3 text-center bg-muted/20 rounded-xl border border-dashed border-border">Tidak ada referensi alat bantu.</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <div className="text-sm font-bold tracking-widest uppercase animate-pulse">Load Command Center...</div>
      </div>
    </div>
  );
}
