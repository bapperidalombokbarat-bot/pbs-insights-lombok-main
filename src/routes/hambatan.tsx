import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { query, fmt, HAMBATAN_SHORT } from "@/lib/db";
import InfoCard from "@/components/InfoCard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

export const Route = createFileRoute("/hambatan")({
  head: () => ({ meta: [{ title: "PBS Dashboard | Analisa Hambatan | Lombok Barat" }] }),
  component: HambatanPage,
});

const DESKRIPSI_HAMBATAN: Record<string, string> = {
  "Kesulitan Penglihatan": "Hambatan indra penglihatan meskipun sudah dibantu kacamata, mencakup low vision hingga buta total.",
  "Kesulitan Pendengaran": "Hambatan dalam mempersepsi suara, mulai dari gangguan pendengaran ringan hingga tuli.",
  "Kesulitan Motorik Kasar": "Keterbatasan dalam gerakan fisik besar seperti berjalan, keseimbangan, atau berpindah tempat.",
  "Kesulitan Gerak dan Koordinasi Jari": "Gangguan motorik halus yang mempengaruhi kemampuan menulis atau memegang benda kecil.",
  "Kesulitan Berbicara": "Hambatan dalam memproduksi suara atau bahasa untuk berkomunikasi secara verbal dengan jelas.",
  "Kesulitan Kemampuan Fungsi Intelektual": "Keterbatasan dalam fungsi intelektual dan perilaku adaptif (intelegensi di bawah rata-rata).",
  "Kesulitan Membaca Diseleksia": "Gangguan belajar spesifik yang mempengaruhi kemampuan membaca, mengeja, dan mengenali kata.",
  "Kesulitan Perilaku Sosialisasi": "Hambatan dalam memahami norma sosial atau berinteraksi (termasuk spektrum autisme).",
  "Kesulitan Atensi": "Kesulitan dalam memusatkan perhatian, konsentrasi, atau mengendalikan impulsivitas (seperti ADHD).",
  "Kesulitan Emosi": "Gangguan dalam regulasi perasaan seperti kecemasan berlebih atau perubahan suasana hati ekstrem.",
};

const TINGKAT = ["Semua", "Ringan", "Sedang", "Berat"];

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
  const radarData = data.perJenis.map((d: any) => ({ subject: HAMBATAN_SHORT[d.jenis_hambatan], total: d.total }));
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
                contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
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
        <h3>Glosarium & Penjelasan Jenis Hambatan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {Object.entries(DESKRIPSI_HAMBATAN).map(([title, desc]) => (
            <div key={title} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <span className="text-xs font-bold">{HAMBATAN_SHORT[title].substring(0,2)}</span>
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground mb-1">{title}</div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
