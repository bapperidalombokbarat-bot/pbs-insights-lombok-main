import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { query, queryOne, fmt, HAMBATAN_SHORT } from "@/lib/db";
import InfoCard from "@/components/InfoCard";
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
  blue: ["#1a56db", "#3b82f6", "#60a5fa", "#93c5fd"],
};

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const summary = await queryOne<any>(`
        SELECT
          (SELECT COUNT(*) FROM siswa) AS total_siswa,
          (SELECT COUNT(DISTINCT satuan_pendidikan) FROM siswa) AS total_sekolah,
          (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa) AS total_berkebutuhan,
          (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa WHERE tingkat_hambatan='Ringan') AS ringan,
          (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa WHERE tingkat_hambatan='Sedang') AS sedang,
          (SELECT COUNT(DISTINCT siswa_id) FROM hambatan_siswa WHERE tingkat_hambatan='Berat') AS berat
      `);
      const perKec = await query<any>(
        `SELECT kecamatan, COUNT(*) AS total FROM siswa GROUP BY kecamatan ORDER BY total DESC`
      );
      const perJenis = await query<any>(
        `SELECT jenis_hambatan, COUNT(DISTINCT siswa_id) AS total FROM hambatan_siswa GROUP BY jenis_hambatan ORDER BY total DESC`
      );
      const perJenjang = await query<any>(
        `SELECT jenjang, COUNT(*) AS total FROM siswa GROUP BY jenjang`
      );
      const kelamin = await query<any>(`
        SELECT s.jenis_kelamin AS k,
          COUNT(DISTINCT s.id) AS total,
          COUNT(DISTINCT h.siswa_id) AS berkebutuhan
        FROM siswa s LEFT JOIN hambatan_siswa h ON h.siswa_id=s.id
        GROUP BY s.jenis_kelamin
      `);
      return { summary, perKec, perJenis, perJenjang, kelamin };
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard Utama</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ringkasan data PBS Kabupaten Lombok Barat
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <InfoCard label="Total Siswa" value={s.total_siswa} sub={`dari ${fmt(s.total_sekolah)} sekolah`} icon="👥" color="primary" />
        <InfoCard label="Total Sekolah" value={s.total_sekolah} sub="Satuan pendidikan" icon="🏫" color="secondary" />
        <InfoCard label="Siswa Berkebutuhan" value={s.total_berkebutuhan} sub={`${((s.total_berkebutuhan/s.total_siswa)*100).toFixed(1)}% dari total`} icon="⚠️" color="warning" />
        <InfoCard label="Hambatan Ringan" value={s.ringan} sub="Sedikit kesulitan" icon="🟢" color="success" />
        <InfoCard label="Hambatan Berat" value={s.berat} sub="Tidak bisa sama sekali" icon="🔴" color="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-card">
          <h3>Distribusi Siswa per Kecamatan</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data.perKec} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
              <YAxis dataKey="kecamatan" type="category" tick={{ fontSize: 12, fill: "var(--chart-text)" }} width={90} />
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                formatter={(v: number) => fmt(v)} 
              />
              <Bar dataKey="total" fill="var(--primary)" radius={[0, 6, 6, 0]}>
                <LabelList dataKey="total" position="right" formatter={(v: number) => fmt(v)} style={{ fontSize: 11, fill: "var(--foreground)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Proporsi Hambatan per Tingkat Keparahan</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={85} outerRadius={130} paddingAngle={2}>
                  {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--foreground)" }}
                  formatter={(v: number) => fmt(v)} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  iconType="circle" 
                  formatter={(value) => <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 500 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: -30 }}>
              <div className="text-3xl font-bold text-foreground">{fmt(totalHambatan)}</div>
              <div className="text-xs text-muted-foreground">Total Hambatan</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="chart-card">
          <h3>Jenis Hambatan Terbanyak</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.perJenis.map(d => ({ ...d, label: HAMBATAN_SHORT[d.jenis_hambatan] }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--chart-text)" }} angle={-30} textAnchor="end" height={70} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                formatter={(v: number) => fmt(v)} 
              />
              <Bar dataKey="total" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Distribusi Jenjang Pendidikan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.perJenjang} dataKey="total" nameKey="jenjang" cx="50%" cy="50%" outerRadius={110} label={(e: any) => `${e.jenjang}: ${fmt(e.total)}`}>
                {data.perJenjang.map((_, i) => <Cell key={i} fill={[COLORS.primary, COLORS.secondary, COLORS.success][i % 3]} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                itemStyle={{ color: "var(--foreground)" }}
                formatter={(v: number) => fmt(v)} 
              />
              <Legend 
                verticalAlign="bottom" 
                iconType="circle" 
                formatter={(value) => <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 500 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Jenis Kelamin · Total vs Berkebutuhan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.kelamin}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="k" tick={{ fontSize: 12, fill: "var(--chart-text)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--chart-text)" }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                itemStyle={{ color: "var(--foreground)" }}
                formatter={(v: number) => fmt(v)} 
              />
              <Legend 
                verticalAlign="bottom" 
                formatter={(value) => <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 500 }}>{value}</span>}
              />
              <Bar dataKey="total" name="Total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="berkebutuhan" name="Berkebutuhan" fill="var(--warning)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm">Memuat database PBS…</div>
      </div>
    </div>
  );
}
