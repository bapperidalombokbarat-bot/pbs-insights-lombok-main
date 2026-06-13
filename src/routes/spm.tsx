import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useYear } from "@/lib/YearContext";
import { query, fmt } from "@/lib/db";
import InfoCard from "@/components/InfoCard";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/spm")({
  head: () => ({ meta: [{ title: "PEDULI | Rapor Pendidikan | Lombok Barat" }] }),
  component: SPMPage,
});

function SPMPage() {
  const [kec, setKec] = useState<string>("Semua");
  const [jenjang, setJenjang] = useState<string>("Semua");
  const [selectedSekolah, setSelectedSekolah] = useState<any>(null);
  const { selectedYear } = useYear();

  const { data, isLoading } = useQuery({
    queryKey: ["spm-data", kec, jenjang, selectedYear],
    queryFn: async () => {
      if (selectedYear !== "2026") {
        return { total: 0, rataDelta: 0, distribusi: [], domainData: [], list: [] };
      }
      
      const where: string[] = []; 
      const args: any[] = [];
      
      if (kec !== "Semua") { where.push("kecamatan=?"); args.push(kec); }
      if (jenjang !== "Semua") { where.push("jenjang=?"); args.push(jenjang); }
      const w = where.length ? "WHERE " + where.join(" AND ") : "";

      const [kecList, stats, sekolah] = await Promise.all([
        query<any>(`SELECT DISTINCT kecamatan FROM rapor_spm ORDER BY kecamatan`),
        
        query<any>(`
          SELECT indikator, domain, 
                 AVG(delta) as avg_delta,
                 SUM(CASE WHEN label IN ('Perlu Intervensi Khusus', 'Dasar', 'Kurang', 'Merintis', 'Perlu Upaya') THEN 1 ELSE 0 END) as rentan_count,
                 COUNT(*) as total_sekolah
          FROM rapor_spm
          ${w}
          GROUP BY indikator, domain
          ORDER BY rentan_count DESC
        `, args),

        query<any>(`
          SELECT r.npsn, r.nama_satuan, r.jenis_satuan, r.kecamatan, r.jenjang,
                 AVG(r.delta) as school_avg_delta,
                 SUM(CASE WHEN r.label IN ('Perlu Intervensi Khusus', 'Dasar', 'Kurang', 'Merintis', 'Perlu Upaya') THEN 1 ELSE 0 END) as rentan_count,
                 GROUP_CONCAT(r.indikator || '|' || r.label || '|' || COALESCE(r.delta, 0) || '|' || COALESCE(r.domain, '-')) as raw_scores,
                 COALESCE(pbs.total_pbs, 0) as pbs_siswa_count
          FROM rapor_spm r
          LEFT JOIN (
            SELECT s.satuan_pendidikan, COUNT(DISTINCT h.siswa_id) as total_pbs
            FROM siswa s JOIN hambatan_siswa h ON s.id = h.siswa_id
            GROUP BY s.satuan_pendidikan
          ) pbs ON pbs.satuan_pendidikan = r.nama_satuan
          ${w ? w.replace(/kecamatan/g, 'r.kecamatan').replace(/jenjang/g, 'r.jenjang') : ""}
          GROUP BY r.npsn, r.nama_satuan, r.jenis_satuan, r.kecamatan, r.jenjang, pbs.total_pbs
          ORDER BY rentan_count DESC, school_avg_delta ASC
          LIMIT 500
        `, args)
      ]);

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
    if (name.includes('PAUD')) return "🧸";
    if (name.includes('Proses Belajar')) return "🎓";
    if (name.includes('Fondasi')) return "🧱";
    if (name.includes('Sarana')) return "🏫";
    if (name.includes('Kemitraan')) return "👨‍👩‍👧";
    return "📊";
  };

  const getLabelColor = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('tuntas') || l.includes('mahir') || l.includes('cakap') || l.includes('baik') || l.includes('membudaya')) return 'text-success bg-success/10 border-success/20';
    if (l.includes('dasar') || l.includes('kurang') || l.includes('merintis') || l.includes('perlu')) return 'text-danger bg-danger/10 border-danger/20';
    return 'text-muted-foreground bg-muted border-border';
  };

  // Process selected school raw scores
  const parsedScores = selectedSekolah?.raw_scores ? selectedSekolah.raw_scores.split(',').map((pair: string) => {
    const parts = pair.split('|');
    return { name: parts[0], label: parts[1], delta: parseFloat(parts[2]), domain: parts[3] };
  }) : [];
  
  // Check for Inclusivity Alert
  const hasPbs = selectedSekolah?.pbs_siswa_count > 0;
  const isInklusifRentan = parsedScores.some((s: any) => s.name.includes('Inklusivitas') && getLabelColor(s.label).includes('danger'));
  const pbsAlert = hasPbs && isInklusifRentan;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Rapor Pendidikan & PBS</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Analisis Rapor Pendidikan 2025 dan Korelasi dengan Profil Siswa Disabilitas
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1">Kecamatan</span>
            <select 
              value={kec} 
              onChange={(e) => { setKec(e.target.value); setPage(1); }} 
              className="border border-border bg-card text-foreground rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm"
            >
              <option value="Semua">Semua Kecamatan</option>
              {data.kecList.map((k: any) => (
                <option key={k.kecamatan} value={k.kecamatan}>{k.kecamatan}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1">Jenjang</span>
            <select 
              value={jenjang} 
              onChange={(e) => { setJenjang(e.target.value); setPage(1); }} 
              className="border border-border bg-card text-foreground rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm"
            >
              <option value="Semua">Semua Jenjang</option>
              <option value="DASMEN">Dasmen/Vokasi</option>
              <option value="PAUD">PAUD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Indikator Merah (Prioritas Intervensi) */}
      <div className="chart-card bg-danger/5 border-danger/10">
        <h3 className="text-danger flex items-center gap-2 mb-4">
          <span>🚨</span> Prioritas Intervensi (Indikator Paling Rentan)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.stats.slice(0, 3).map((st: any, i: number) => (
            <div key={i} className="bg-card p-4 rounded-xl border border-danger/20 shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-6xl opacity-5">{getIndicatorIcon(st.indikator)}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{st.domain || 'UMUM'}</div>
              <div className="font-bold text-foreground text-sm mb-2">{st.indikator}</div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-danger font-medium bg-danger/10 px-2 py-1 rounded-md">
                  {((st.rentan_count / st.total_sekolah) * 100).toFixed(1)}% Sekolah Rentan
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-md ${st.avg_delta > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {st.avg_delta > 0 ? '📈' : '📉'} {st.avg_delta > 0 ? '+' : ''}{(st.avg_delta ?? 0).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="!mb-0">Rincian Satuan Pendidikan & Korelasi PBS</h3>
            <p className="text-xs text-muted-foreground mt-1">Daftar sekolah diurutkan berdasarkan tingkat kerentanan indikator terbanyak.</p>
          </div>
          <input 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            placeholder="Cari nama sekolah..." 
            className="border border-border bg-background rounded-xl px-4 py-2 text-sm min-w-[240px] outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          />
        </div>
        
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left px-4 py-3">Nama Satuan</th>
                <th className="text-left px-4 py-3">Kecamatan</th>
                <th className="text-center px-4 py-3">Status Inklusi (PBS)</th>
                <th className="text-center px-4 py-3">Indikator Rentan</th>
                <th className="text-right px-4 py-3">Tren Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((s: any) => {
                const sScores = s.raw_scores ? s.raw_scores.split(',').map((p:string) => p.split('|')) : [];
                const sRentanInklusi = sScores.some((p:any[]) => p[0].includes('Inklusivitas') && getLabelColor(p[1]).includes('danger'));
                
                return (
                  <tr 
                    key={s.npsn} 
                    className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors group"
                    onClick={() => setSelectedSekolah(s)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold group-hover:text-primary transition-colors">
                        {s.nama_satuan}
                        {s.jenis_satuan?.includes('Kesetaraan') && <span className="ml-2 text-xs font-normal text-muted-foreground border border-border px-1.5 py-0.5 rounded-md">({s.jenis_satuan})</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">NPSN: {s.npsn} · <span className="uppercase">{s.jenis_satuan}</span></div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.kecamatan}</td>
                    <td className="px-4 py-3 text-center">
                      {s.pbs_siswa_count > 0 ? (
                        sRentanInklusi ? (
                          <span className="bg-danger/10 text-danger border border-danger/20 text-[10px] font-bold px-2 py-1 rounded-md flex items-center justify-center gap-1 w-max mx-auto">
                            🚨 Darurat ({s.pbs_siswa_count} Siswa)
                          </span>
                        ) : (
                          <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-1 rounded-md flex items-center justify-center gap-1 w-max mx-auto">
                            ✅ Inklusif ({s.pbs_siswa_count} Siswa)
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.rentan_count > 0 ? (
                        <span className="font-bold text-danger bg-danger/10 px-2 py-1 rounded-md">{s.rentan_count} Indikator</span>
                      ) : (
                        <span className="text-muted-foreground text-[10px] uppercase font-bold bg-muted px-2 py-1 rounded-md">Tuntas</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <div className="flex items-center justify-end gap-2">
                        <span className={s.school_avg_delta > 0 ? 'text-success' : s.school_avg_delta < 0 ? 'text-danger' : 'text-muted-foreground'}>
                          {s.school_avg_delta > 0 ? '+' : ''}{(s.school_avg_delta ?? 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">👁️</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pageData.length === 0 && <div className="text-center py-8 text-muted-foreground bg-muted/20 border border-dashed border-border rounded-lg mx-4 mt-4">Data tidak ditemukan.</div>}
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="text-[10px] text-muted-foreground font-bold uppercase">Halaman {page} dari {Math.max(1, Math.ceil(filteredSekolah.length / pageSize))}</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-all">←</button>
            <button disabled={page >= Math.ceil(filteredSekolah.length / pageSize)} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-all">→</button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedSekolah} onOpenChange={(open) => !open && setSelectedSekolah(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="flex items-start gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-2xl shrink-0">
                {selectedSekolah?.jenjang === 'DASMEN' ? '🏫' : '🧸'}
              </div>
              <div>
                <div className="text-xl font-bold leading-tight flex items-center gap-2">
                  {selectedSekolah?.nama_satuan}
                  {selectedSekolah?.jenis_satuan?.includes('Kesetaraan') && <span className="text-sm font-normal text-muted-foreground border border-border px-2 py-0.5 rounded-md">({selectedSekolah?.jenis_satuan})</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="bg-muted px-2 py-0.5 rounded uppercase font-semibold">{selectedSekolah?.jenis_satuan}</span>
                  <span>NPSN: {selectedSekolah?.npsn}</span>
                  <span>· {selectedSekolah?.kecamatan}</span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-6">
            {pbsAlert && (
              <div className="bg-danger/10 border border-danger/30 p-4 rounded-xl flex gap-3 items-start">
                <span className="text-2xl">🚨</span>
                <div>
                  <h4 className="text-danger font-bold text-sm">Peringatan Darurat Inklusi</h4>
                  <p className="text-xs text-danger/80 mt-1 leading-relaxed">
                    Sekolah ini menampung <strong>{selectedSekolah?.pbs_siswa_count} Siswa Berkebutuhan Khusus</strong>, 
                    namun Rapor Pendidikan menunjukkan indikator <strong>Iklim Inklusivitas yang Rentan</strong>. 
                    Prioritaskan intervensi untuk memastikan anak-anak mendapat akomodasi belajar yang layak.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border/50 flex flex-col justify-center shadow-sm">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1"><span>📈</span> Tren Capaian Keseluruhan</div>
                <div className={`text-3xl font-black ${(selectedSekolah?.school_avg_delta || 0) > 0 ? 'text-success' : 'text-danger'}`}>
                  {(selectedSekolah?.school_avg_delta || 0) > 0 ? '+' : ''}{(selectedSekolah?.school_avg_delta || 0).toFixed(2)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border/50 flex flex-col justify-center shadow-sm">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1"><span>⚠️</span> Indikator Rentan / Perlu Upaya</div>
                <div className="text-3xl font-black text-foreground">
                  {selectedSekolah?.rentan_count} <span className="text-sm font-normal text-muted-foreground">Indikator</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-primary rounded-full" />
                Rincian Domain & Indikator
              </h4>
              <div className="space-y-3">
                {parsedScores.map((s: any, idx: number) => {
                  const isRentan = getLabelColor(s.label).includes('danger');
                  return (
                    <div key={idx} className={`p-3 rounded-xl border ${isRentan ? 'border-danger/30 bg-danger/5' : 'border-border/50 bg-card'} hover:shadow-md transition-all flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isRentan ? 'bg-danger/10' : 'bg-muted/50'}`}>
                          {getIndicatorIcon(s.name)}
                        </div>
                        <div>
                          <div className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5">{s.domain}</div>
                          <div className="font-semibold text-sm leading-tight text-foreground">{s.name}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border ${getLabelColor(s.label)}`}>
                          {s.label}
                        </span>
                        <div className={`text-[10px] font-mono font-bold flex items-center gap-1 ${s.delta > 0 ? 'text-success' : s.delta < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                          {s.delta > 0 ? '▲' : s.delta < 0 ? '▼' : '▬'} {s.delta > 0 ? '+' : ''}{s.delta.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4 mt-2">
            <Button variant="outline" onClick={() => setSelectedSekolah(null)} className="rounded-xl px-6">Tutup</Button>
            {pbsAlert && <Button className="rounded-xl px-6 bg-danger hover:bg-danger/90 text-white">Buat Catatan Intervensi</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground space-y-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <div className="text-sm font-bold animate-pulse">Menganalisis Rapor Pendidikan 2025...</div>
    </div>
  );
}
