import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { query, fmt, HAMBATAN_SHORT } from "@/lib/db";
import InfoCard from "@/components/InfoCard";

export const Route = createFileRoute("/alat-bantu")({
  head: () => ({ meta: [{ title: "PBS Dashboard | Alat Bantu | Lombok Barat" }] }),
  component: AlatBantuPage,
});

const KAT_ICON: Record<string, string> = {
  Optik: "👓", Auditori: "🦻", Mobilitas: "🦽", Komunikasi: "🗣️",
  Literasi: "📖", Teknologi: "💻", Terapi: "🧠", SDM: "👨‍🏫",
  Akademis: "📚", "Motorik Halus": "✋", Sensorik: "🎲", Manajemen: "⏱️",
  Psikologis: "💚", "Alat Bantu": "🧰",
};

const KAT_IMG: Record<string, string> = {
  Mobilitas: "/illustrations/wheelchair.png",
  Auditori: "/illustrations/hearing_aid.png",
  Literasi: "/illustrations/literacy.png",
  SDM: "/illustrations/gpk.png",
  Optik: "/illustrations/optik.png",
  Teknologi: "/illustrations/teknologi.png",
  Komunikasi: "/illustrations/komunikasi.png",
  Manajemen: "/illustrations/manajemen.png",
  Sensorik: "/illustrations/sensorik.png",
  Psikologis: "/illustrations/psikologis.png",
};

const NAME_IMG: Record<string, string> = {
  "Kursi Roda Standard": "/illustrations/wheelchair.png",
  "Kruk / Walker": "/illustrations/crutches.png",
  "Kacamata Refraksi": "/illustrations/glasses.png",
  "Hearing Aid (Alat Bantu Dengar)": "/illustrations/hearing_aid.png",
  "Buku Braille / Audio Book": "/illustrations/braille.png",
  "Guru Pembimbing Khusus (GPK)": "/illustrations/gpk.png",
  "Adaptor Pensil": "/illustrations/pencil_adaptor.png",
  "Media Manipulatif": "/illustrations/manipulative.png",
  "Magnifier (Kaca Pembesar)": "/illustrations/magnifier.png",
  "Reading Tracker": "/illustrations/reading_tracker.png",
  "Fidget Spinner / Stress Ball": "/illustrations/fidget.png",
  "Noise Cancelling Headphone": "/illustrations/headphones.png",
  "Visual Timer": "/illustrations/timer.png",
  "Weighted Blanket": "/illustrations/blanket.png",
};

function AlatBantuPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["alat-bantu"],
    queryFn: async () => {
      const perHambatan = await query<any>(`
        SELECT jenis_hambatan,
          COUNT(DISTINCT CASE WHEN tingkat_hambatan='Ringan' THEN siswa_id END) AS ringan,
          COUNT(DISTINCT CASE WHEN tingkat_hambatan='Sedang' THEN siswa_id END) AS sedang,
          COUNT(DISTINCT CASE WHEN tingkat_hambatan='Berat'  THEN siswa_id END) AS berat,
          COUNT(DISTINCT siswa_id) AS total
        FROM hambatan_siswa GROUP BY jenis_hambatan ORDER BY total DESC
      `);
      const alat = await query<any>(`SELECT * FROM alat_bantu ORDER BY kategori, nama_alat`);
      const prioritas = (await query<any>(`SELECT COUNT(DISTINCT siswa_id) AS n FROM hambatan_siswa WHERE tingkat_hambatan IN ('Sedang','Berat')`))[0].n;
      const totalAlat = (await query<any>(`SELECT COUNT(*) AS n FROM alat_bantu`))[0].n;
      const topSekolah = (await query<any>(`
        SELECT s.satuan_pendidikan, s.kecamatan, COUNT(DISTINCT h.siswa_id) AS n
        FROM siswa s JOIN hambatan_siswa h ON s.id=h.siswa_id
        WHERE h.tingkat_hambatan IN ('Sedang','Berat')
        GROUP BY s.satuan_pendidikan ORDER BY n DESC LIMIT 1
      `))[0];
      
      // Query Presisi: Menghitung berapa banyak siswa unik yang membutuhkan tiap kategori alat
      const kebutuhanKategori = await query<any>(`
        SELECT a.kategori, COUNT(DISTINCT h.siswa_id) AS total_siswa
        FROM hambatan_siswa h
        JOIN alat_bantu a ON h.jenis_hambatan = a.jenis_hambatan
        GROUP BY a.kategori
      `);

      return { perHambatan, alat, prioritas, totalAlat, topSekolah, kebutuhanKategori };
    },
  });

  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading || !data) return <div className="h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const alatByHambatan: Record<string, any[]> = {};
  data.alat.forEach((a: any) => {
    (alatByHambatan[a.jenis_hambatan] ||= []).push(a);
  });

  const kategoriMap: Record<string, { count: number; siswa: number }> = {};
  data.alat.forEach((a: any) => {
    if (!kategoriMap[a.kategori]) {
      const totalSiswa = data.kebutuhanKategori.find((k: any) => k.kategori === a.kategori)?.total_siswa || 0;
      kategoriMap[a.kategori] = { count: 0, siswa: totalSiswa };
    }
    kategoriMap[a.kategori].count += 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Estimasi Kebutuhan Alat Bantu</h2>
        <p className="text-sm text-muted-foreground mt-1">Rekomendasi alat bantu berdasarkan jenis & tingkat hambatan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard label="Jenis Alat Bantu" value={data.totalAlat} sub="Tersedia di katalog" icon="🧰" color="primary" />
        <InfoCard label="Siswa Prioritas Intervensi" value={data.prioritas} sub="Hambatan Sedang + Berat" icon="🎯" color="warning" />
        <InfoCard label="Sekolah Kebutuhan Tertinggi" value={data.topSekolah?.n || 0} sub={data.topSekolah?.satuan_pendidikan} icon="🏫" color="danger" />
      </div>

      <div className="chart-card">
        <h3>Estimasi Kebutuhan Alat Bantu per Jenis Hambatan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Jenis Hambatan</th>
                <th className="text-right px-3 py-2">Ringan</th>
                <th className="text-right px-3 py-2">Sedang</th>
                <th className="text-right px-3 py-2">Berat</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Alat Bantu Direkomendasikan</th>
              </tr>
            </thead>
            <tbody>
              {data.perHambatan.map((r: any) => {
                const isOpen = expanded === r.jenis_hambatan;
                const prio = (r.sedang + r.berat) > 50;
                return (
                  <Fragment key={r.jenis_hambatan}>
                    <tr 
                      className={`border-t border-border cursor-pointer transition-colors hover:bg-muted/80 group ${prio ? 'bg-warning/5 dark:bg-warning/10' : ''}`} 
                      onClick={() => setExpanded(isOpen ? null : r.jenis_hambatan)}
                    >
                      <td className="px-3 py-2 font-medium text-foreground">{HAMBATAN_SHORT[r.jenis_hambatan]}</td>
                      <td className="px-3 py-2 text-right"><span className="badge-pill badge-ringan">{fmt(r.ringan)}</span></td>
                      <td className="px-3 py-2 text-right"><span className="badge-pill badge-sedang">{fmt(r.sedang)}</span></td>
                      <td className="px-3 py-2 text-right"><span className="badge-pill badge-berat">{fmt(r.berat)}</span></td>
                      <td className="px-3 py-2 text-right font-bold text-foreground">{fmt(r.total)}</td>
                      <td className="px-3 py-2 text-[11px] flex items-center justify-between gap-2">
                        <div className="truncate max-w-[220px] text-foreground/70 group-hover:text-foreground transition-colors italic">
                          {(alatByHambatan[r.jenis_hambatan] || []).map(a => a.nama_alat).join(", ")}
                        </div>
                        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-primary text-white rotate-0' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                          <span className="text-[10px]">{isOpen ? "▼" : "▶"}</span>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/20 dark:bg-muted/10">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(alatByHambatan[r.jenis_hambatan] || []).map(a => (
                              <div key={a.id} className={`p-4 rounded-xl border shadow-sm transition-all overflow-hidden ${a.kategori === 'SDM' ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 ring-1 ring-primary/20' : 'bg-card border-border'}`}>
                                <div className="flex gap-4">
                                  {(NAME_IMG[a.nama_alat] || KAT_IMG[a.kategori]) && (
                                    <div className="w-16 h-16 shrink-0 rounded-lg bg-white dark:bg-muted p-1 border border-border/50 shadow-inner">
                                      <img src={NAME_IMG[a.nama_alat] || KAT_IMG[a.kategori]} alt={a.nama_alat} className="w-full h-full object-contain" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="font-bold text-sm text-foreground">{a.nama_alat}</div>
                                      {a.kategori === 'SDM' && <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">PENTING</span>}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-2">
                                      <span className="opacity-70">{KAT_ICON[a.kategori] || "🧰"}</span> {a.kategori}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{a.deskripsi}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Kategori Alat Bantu</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(kategoriMap).map(([kat, v]) => (
            <div key={kat} className="chart-card flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">{KAT_ICON[kat] || "🧰"}</div>
              <div>
                <div className="font-semibold">{kat}</div>
                <div className="text-xs text-muted-foreground">{v.count} alat · {fmt(v.siswa)} siswa</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
