import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { query, fmt, HAMBATAN_SHORT } from "@/lib/db";
import InfoCard from "@/components/InfoCard";
import { HAMBATAN_INFO } from "@/lib/hambatan-info";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

export const Route = createFileRoute("/hambatan")({
  head: () => ({ meta: [{ title: "PBS Dashboard | Analisa Hambatan | Lombok Barat" }] }),
  component: HambatanPage,
});

const TINGKAT = ["Semua", "Ringan", "Sedang", "Berat"];

const RadarCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const info = HAMBATAN_INFO[data.originalName];
    if (!info) return null;
    
    return (
      <div className="bg-card/90 backdrop-blur-md border border-border/50 p-3.5 rounded-xl shadow-xl max-w-[280px] sm:max-w-[320px] text-sm z-50 relative pointer-events-none">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${info.warna}15`, color: info.warna }}>
            <span className="text-lg">{info.icon}</span>
          </div>
          <div>
            <div className="font-bold text-sm leading-tight" style={{ color: info.warna }}>{info.label}</div>
            <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">Total: <span className="text-foreground">{data.total} Siswa</span></div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span>ℹ️</span> Penjelasan Singkat
            </div>
            <p className="text-[10.5px] text-foreground/85 leading-snug border-l-2 border-muted pl-2 py-0.5">{info.definisi}</p>
          </div>
          
          <div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span className="text-danger">⚠️</span> Penyebab Utama
            </div>
            <ul className="text-[10px] text-foreground/85 leading-snug pl-4 list-disc marker:text-muted-foreground">
              {info.penyebab.slice(0, 2).map((p, i) => <li key={i}>{p}</li>)}
              {info.penyebab.length > 2 && <li className="text-muted-foreground italic list-none -ml-2 text-[9px] mt-0.5">+{info.penyebab.length - 2} penyebab lainnya...</li>}
            </ul>
          </div>

          <div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span>💡</span> Analisa
            </div>
            <p className="text-[10.5px] text-foreground/80 leading-snug italic border-l-2 border-primary/30 pl-2 py-0.5">"{info.analisa}"</p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

function HambatanPage() {
  const [tingkat, setTingkat] = useState("Semua");
  const { data, isLoading } = useQuery({
    queryKey: ["hambatan", tingkat],
    queryFn: async () => {
      const w = tingkat !== "Semua" ? "WHERE tingkat_hambatan=?" : "";
      const a = tingkat !== "Semua" ? [tingkat] : [];
      const summary = (await query<any>(`
        SELECT
          (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa) AS total,
          (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa WHERE tingkat_hambatan='Ringan') AS ringan,
          (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa WHERE tingkat_hambatan='Sedang') AS sedang,
          (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa WHERE tingkat_hambatan='Berat')  AS berat
      `))[0];
      const perJenis = await query<any>(`
        SELECT jenis_hambatan,
          COUNT(DISTINCT CASE WHEN tingkat_hambatan='Ringan' THEN siswa_id END) AS ringan,
          COUNT(DISTINCT CASE WHEN tingkat_hambatan='Sedang' THEN siswa_id END) AS sedang,
          COUNT(DISTINCT CASE WHEN tingkat_hambatan='Berat'  THEN siswa_id END) AS berat,
          COUNT(DISTINCT siswa_id) AS total
        FROM hambatan_siswa ${w}
        GROUP BY jenis_hambatan ORDER BY total DESC
      `, a);
      const perJenjang = await query<any>(`
        SELECT s.jenjang, h.tingkat_hambatan, COUNT(DISTINCT h.siswa_id) AS total
        FROM siswa s JOIN hambatan_siswa h ON s.id=h.siswa_id
        GROUP BY s.jenjang, h.tingkat_hambatan
      `);
      return { summary, perJenis, perJenjang };
    },
  });

  if (isLoading || !data) return <div className="h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  const jenjangPivot = ["TK","SD/MI","SMP/MTS"].map(j => {
    const r = data.perJenjang.filter((x: any) => x.jenjang === j);
    return {
      jenjang: j,
      Ringan: r.find((x: any) => x.tingkat_hambatan==='Ringan')?.total || 0,
      Sedang: r.find((x: any) => x.tingkat_hambatan==='Sedang')?.total || 0,
      Berat:  r.find((x: any) => x.tingkat_hambatan==='Berat')?.total || 0,
    };
  });
  const radarData = data.perJenis.map((d: any) => ({ 
    subject: HAMBATAN_SHORT[d.jenis_hambatan], 
    total: d.total, 
    originalName: d.jenis_hambatan 
  }));
  const stackedData = data.perJenis.map((d: any) => ({ ...d, label: HAMBATAN_SHORT[d.jenis_hambatan] }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analisa Hambatan</h2>
        <p className="text-sm text-muted-foreground mt-1">Distribusi 10 jenis hambatan & tingkat keparahannya</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="Total Entri Hambatan" value={data.summary.total} icon="📋" color="primary" />
        <InfoCard label="Hambatan Ringan" value={data.summary.ringan} icon="🟢" color="success" />
        <InfoCard label="Hambatan Sedang" value={data.summary.sedang} icon="🟠" color="warning" />
        <InfoCard label="Hambatan Berat" value={data.summary.berat} icon="🔴" color="danger" />
      </div>

      <div className="chart-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium mr-2">Filter Tingkat:</span>
          {TINGKAT.map(t => (
            <button key={t} onClick={() => setTingkat(t)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${tingkat===t ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="chart-card lg:col-span-3">
          <h3>Sebaran 10 Jenis Hambatan per Tingkat</h3>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={stackedData} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
              <YAxis dataKey="label" type="category" tick={{ fontSize: 12, fill: "var(--chart-text)" }} width={120} />
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                itemStyle={{ color: "var(--foreground)" }}
              />
              <Legend 
                verticalAlign="top" 
                formatter={(value) => <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 500 }}>{value}</span>}
              />
              {(tingkat==='Semua' || tingkat==='Ringan') && <Bar dataKey="ringan" stackId="a" name="Ringan" fill="var(--success)" />}
              {(tingkat==='Semua' || tingkat==='Sedang') && <Bar dataKey="sedang" stackId="a" name="Sedang" fill="var(--warning)" />}
              {(tingkat==='Semua' || tingkat==='Berat')  && <Bar dataKey="berat"  stackId="a" name="Berat"  fill="var(--danger)" />}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card lg:col-span-2">
          <h3>Profil Hambatan (Radar)</h3>
          <ResponsiveContainer width="100%" height={420}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--chart-grid)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--chart-text)" }} />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: "var(--chart-text)" }} stroke="var(--chart-grid)" />
              <Radar name="Total" dataKey="total" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.4} />
              <Tooltip 
                content={<RadarCustomTooltip />} 
                cursor={{ fill: 'var(--muted)', opacity: 0.2 }} 
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                offset={20}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Tren Hambatan per Jenjang Pendidikan</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={jenjangPivot}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="jenjang" tick={{ fontSize: 12, fill: "var(--chart-text)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
            <Tooltip 
              contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
            />
            <Legend 
              verticalAlign="top" 
              formatter={(value) => <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 500 }}>{value}</span>}
            />
            <Bar dataKey="Ringan" fill="var(--success)" radius={[4,4,0,0]} />
            <Bar dataKey="Sedang" fill="var(--warning)" radius={[4,4,0,0]} />
            <Bar dataKey="Berat"  fill="var(--danger)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Glosarium & Penjelasan Lengkap Jenis Hambatan</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {Object.entries(HAMBATAN_INFO).map(([key, info]) => (
            <div key={key} className="p-5 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${info.warna}15`, color: info.warna }}>
                  <span className="text-2xl">{info.icon}</span>
                </div>
                <div>
                  <div className="font-bold text-lg text-foreground leading-tight mb-1" style={{ color: info.warna }}>{info.label}</div>
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">{info.definisi}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 flex-1">
                <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="text-danger">⚠️</span> Penyebab Utama
                  </div>
                  <ul className="text-[11px] text-foreground/80 space-y-1.5 pl-4 list-disc marker:text-muted-foreground">
                    {info.penyebab.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>💡</span> Strategi Intervensi
                  </div>
                  <ul className="text-[11px] text-foreground/80 space-y-1.5 pl-4 list-disc marker:text-primary/70">
                    {info.intervensi.map((int, i) => <li key={i}>{int}</li>)}
                  </ul>
                </div>
              </div>
              
              <div className="pt-3 border-t border-border/50 mt-auto">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span>🎯</span> Analisa & Perspektif
                </div>
                <p className="text-[11.5px] text-foreground/75 leading-relaxed italic border-l-2 border-primary/30 pl-3 py-0.5">
                  "{info.analisa}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
