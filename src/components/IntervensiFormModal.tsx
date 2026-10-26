import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  saveVervalIntervensi,
  searchSiswaMaster,
  VervalItemInput,
  VervalHambatanInput,
  HAMBATAN_COLS,
} from "@/lib/db";
import {
  User,
  School,
  HeartPulse,
  Stethoscope,
  GraduationCap,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  MapPin,
  Sparkles,
  Building2,
  Users,
} from "lucide-react";

export const PUSKESMAS_LIST = [
  "UPT PUSKESMAS GERUNG",
  "PUSKESMAS KEDIRI",
  "UPT PUSKESMAS NARMADA",
  "PUSKESMAS LABUAPI",
  "PUSKESMAS GUNUNGSARI",
  "PUSKESMAS LINGSAR",
  "PUSKESMAS MENINTING",
  "PUSKESMAS SEKOTONG",
  "PUSKESMAS JEMBATAN KEMBAR",
  "PUSKESMAS KURIPAN",
  "PUSKESMAS BANYUMULEK",
  "PUSKESMAS DASAN TAPEN",
  "PUSKESMAS EYAT MAYANG",
  "PUSKESMAS PELANGAN",
  "PUSKESMAS PENIMBUNG",
  "PUSKESMAS PERAMPUAN",
  "PUSKESMAS SIGERONGAN",
  "PUSKESMAS SURANADI",
  "UPT PUSKESMAS SEDAU",
  "UPT PUSKESMAS SESELA",
];

export const KECAMATAN_LIST = [
  "Batu Layar",
  "Gerung",
  "Gunung Sari",
  "Kediri",
  "Kuripan",
  "Labuapi",
  "Lembar",
  "Lingsar",
  "Narmada",
  "Sekotong",
];

const REKOMENDASI_ALAT_DEFAULT: Record<string, string> = {
  "KESULITAN PENGLIHATAN": "Kacamata Refraksi, Magnifier, Buku Braille",
  "KESULITAN PENDENGARAN": "Hearing Aid (Alat Bantu Dengar), Visual Alert",
  "KESULITAN MOTORIK KASAR": "Kursi Roda Standard, Kruk / Walker",
  "KESULITAN GERAK DAN KOORDINASI JARI": "Adaptor Pensil, Keyboard Adaptif",
  "KESULITAN BERBICARA": "Communication Board, Aplikasi Text-to-Speech",
  "KESULITAN KEMAMPUAN FUNGSI INTELEKTUAL": "Guru Pembimbing Khusus (GPK), Media Manipulatif",
  "KESULITAN MEMBACA DISELEKSIA": "Software Font Dyslexia, Reading Tracker",
  "KESULITAN PERILAKU SOSIALISASI": "Kartu Skenario Sosial, Pendampingan Khusus",
  "KESULITAN ATENSI": "Noise Cancelling Headphone, Stress Ball",
  "KESULITAN EMOSI": "Weighted Blanket, Visual Timer, Terapi Psikologis",
};

interface IntervensiFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: any | null;
  onSuccess: () => void;
}

export function IntervensiFormModal({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: IntervensiFormModalProps) {
  const isEdit = !!initialData?.id;
  const [activeTab, setActiveTab] = useState<"identitas" | "kesejahteraan" | "kesehatan" | "hambatan">("identitas");

  // Form State
  const [formData, setFormData] = useState<VervalItemInput>({
    nisn: "",
    nik_siswa: "",
    nama_siswa: "",
    sumber_instansi: "DIKBUD",
    satuan_pendidikan: "",
    kecamatan: "Gerung",
    jenjang: "SD",
    tingkat_kelas: "Kelas 1",
    jenis_kelamin: "L",
    alamat_siswa: "",
    alamat_sekolah: "",
    nama_ibu: "",
    nik_ibu: "",
    nama_ayah: "",
    nik_ayah: "",
    status_patju360: "TRUE",
    metode_verval: "VERVAL PATJU 360",
    desil_nasional: "1",
    kategori_desil: "DESIL 1 (SANGAT MISKIN / EKSTREM)",
    desil_awal: "1",
    pkh: "TIDAK",
    bansos_sembako: "TIDAK",
    beasiswa_bskm: "TIDAK",
    pbi_jk: "YA",
    status_medis: "TIDAK ADA PENYAKIT KRONIS",
    disabilitas_dtsen: "TIDAK TERCATAT DI DTSEN (TERVERIFIKASI PBS)",
    puskesmas_terdekat: "UPT PUSKESMAS GERUNG",
    jarak_km: 2.0,
    dokter_pemeriksa: "",
    diagnosa: "",
    tindakan: "",
    status_rujukan: "Belum Ada Rujukan",
    keterangan: "",
    hambatan: [],
  });

  // Master Siswa Search
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFromMaster, setSelectedFromMaster] = useState(false);

  // Saving State
  const [isSaving, setIsSaving] = useState(false);

  // Inisialisasi data saat modal dibuka
  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setFormData({
        id: initialData.id,
        siswa_id: initialData.siswa_id,
        nisn: initialData.nisn || "",
        nik_siswa: initialData.nik_siswa || "",
        nama_siswa: initialData.nama_siswa || "",
        sumber_instansi: initialData.sumber_instansi || "DIKBUD",
        satuan_pendidikan: initialData.satuan_pendidikan || "",
        kecamatan: initialData.kecamatan || "Gerung",
        jenjang: initialData.jenjang || "SD",
        tingkat_kelas: initialData.tingkat_kelas || "Kelas 1",
        jenis_kelamin: initialData.jenis_kelamin || "L",
        alamat_siswa: initialData.alamat_siswa || "",
        alamat_sekolah: initialData.alamat_sekolah || "",
        nama_ibu: initialData.nama_ibu || "",
        nik_ibu: initialData.nik_ibu || "",
        nama_ayah: initialData.nama_ayah || "",
        nik_ayah: initialData.nik_ayah || "",
        status_patju360: initialData.status_patju360 || "TRUE",
        metode_verval: initialData.metode_verval || "VERVAL PATJU 360",
        desil_nasional: initialData.desil_nasional || "1",
        kategori_desil: initialData.kategori_desil || "DESIL 1 (SANGAT MISKIN / EKSTREM)",
        desil_awal: initialData.desil_awal || "1",
        pkh: initialData.pkh || "TIDAK",
        bansos_sembako: initialData.bansos_sembako || "TIDAK",
        beasiswa_bskm: initialData.beasiswa_bskm || "TIDAK",
        pbi_jk: initialData.pbi_jk || "YA",
        status_medis: initialData.status_medis || "TIDAK ADA PENYAKIT KRONIS",
        disabilitas_dtsen: initialData.disabilitas_dtsen || "",
        puskesmas_terdekat: initialData.puskesmas_terdekat || "UPT PUSKESMAS GERUNG",
        jarak_km: initialData.jarak_km != null ? Number(initialData.jarak_km) : 2.0,
        dokter_pemeriksa: initialData.dokter_pemeriksa || "",
        diagnosa: initialData.diagnosa || "",
        tindakan: initialData.tindakan || "",
        status_rujukan: initialData.status_rujukan || "Belum Ada Rujukan",
        keterangan: initialData.keterangan || "",
        hambatan: Array.isArray(initialData.hambatanList)
          ? initialData.hambatanList.map((h: any) => ({
              id: h.id,
              jenis_hambatan: h.jenis_hambatan,
              klasifikasi: h.klasifikasi || "BERAT",
              tipe_alat_rekomendasi: h.tipe_alat_rekomendasi || "",
            }))
          : [],
      });
      setSelectedFromMaster(true);
    } else {
      // Default untuk tambah data baru
      setFormData({
        nisn: "",
        nik_siswa: "",
        nama_siswa: "",
        sumber_instansi: "DIKBUD",
        satuan_pendidikan: "",
        kecamatan: "Gerung",
        jenjang: "SD",
        tingkat_kelas: "Kelas 1",
        jenis_kelamin: "L",
        alamat_siswa: "",
        alamat_sekolah: "",
        nama_ibu: "",
        nik_ibu: "",
        nama_ayah: "",
        nik_ayah: "",
        status_patju360: "TRUE",
        metode_verval: "VERVAL PATJU 360",
        desil_nasional: "1",
        kategori_desil: "DESIL 1 (SANGAT MISKIN / EKSTREM)",
        desil_awal: "1",
        pkh: "TIDAK",
        bansos_sembako: "TIDAK",
        beasiswa_bskm: "TIDAK",
        pbi_jk: "YA",
        status_medis: "TIDAK ADA PENYAKIT KRONIS",
        disabilitas_dtsen: "TIDAK TERCATAT DI DTSEN (TERVERIFIKASI PBS)",
        puskesmas_terdekat: "UPT PUSKESMAS GERUNG",
        jarak_km: 2.0,
        dokter_pemeriksa: "",
        diagnosa: "",
        tindakan: "",
        status_rujukan: "Belum Ada Rujukan",
        keterangan: "",
        hambatan: [
          {
            jenis_hambatan: "KESULITAN PENGLIHATAN",
            klasifikasi: "BERAT",
            tipe_alat_rekomendasi: "Kacamata Refraksi",
          },
        ],
      });
      setSearchKeyword("");
      setSearchResults([]);
      setSelectedFromMaster(false);
    }
    setActiveTab("identitas");
  }, [open, initialData]);

  // Efek pencarian master siswa
  useEffect(() => {
    if (isEdit || !searchKeyword || searchKeyword.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await searchSiswaMaster(searchKeyword.trim());
        setSearchResults(res || []);
      } catch (err) {
        console.error("Gagal mencari master siswa:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchKeyword, isEdit]);

  const handleSelectSiswa = (siswa: any) => {
    const isMadrasah =
      siswa.satuan_pendidikan?.toUpperCase().includes("MI ") ||
      siswa.satuan_pendidikan?.toUpperCase().includes("MTS ") ||
      siswa.satuan_pendidikan?.toUpperCase().includes("RA ") ||
      siswa.satuan_pendidikan?.toUpperCase().includes("MA ");

    setFormData((prev) => ({
      ...prev,
      siswa_id: siswa.id,
      nisn: siswa.nisn || "",
      nama_siswa: siswa.nama_siswa || "",
      satuan_pendidikan: siswa.satuan_pendidikan || "",
      kecamatan: siswa.kecamatan || prev.kecamatan,
      jenjang: siswa.jenjang || prev.jenjang,
      tingkat_kelas: siswa.tingkat_kelas || prev.tingkat_kelas,
      jenis_kelamin: siswa.jenis_kelamin || prev.jenis_kelamin,
      sumber_instansi: isMadrasah ? "KEMENAG" : "DIKBUD",
    }));

    setSelectedFromMaster(true);
    setSearchResults([]);
    setSearchKeyword("");
    toast.success(`Data siswa "${siswa.nama_siswa}" berhasil dimuat.`);
  };

  const handleDesilChange = (val: string) => {
    let kat = "";
    if (val === "1") kat = "DESIL 1 (SANGAT MISKIN / EKSTREM)";
    else if (val === "2") kat = "DESIL 2 (SANGAT MISKIN)";
    else if (val === "3") kat = "DESIL 3 (HAMPIR MISKIN)";
    else if (val === "4") kat = "DESIL 4 (RENTAN MISKIN)";
    else if (val === "BELUM ADA DESIL") kat = "BELUM ADA DESIL";
    else if (Number(val) >= 5) kat = `DESIL ${val} (MAMPU)`;

    setFormData((prev) => ({
      ...prev,
      desil_nasional: val,
      kategori_desil: kat,
    }));
  };

  const handleAddHambatan = () => {
    const defaultJenis = "KESULITAN PENGLIHATAN";
    setFormData((prev) => ({
      ...prev,
      hambatan: [
        ...(prev.hambatan || []),
        {
          jenis_hambatan: defaultJenis,
          klasifikasi: "BERAT",
          tipe_alat_rekomendasi: REKOMENDASI_ALAT_DEFAULT[defaultJenis] || "Alat Bantu Khusus",
        },
      ],
    }));
  };

  const handleRemoveHambatan = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      hambatan: prev.hambatan?.filter((_, i) => i !== index),
    }));
  };

  const handleHambatanChange = (index: number, field: keyof VervalHambatanInput, value: string) => {
    setFormData((prev) => {
      const updated = [...(prev.hambatan || [])];
      updated[index] = { ...updated[index], [field]: value };

      // Jika jenis hambatan berubah, beri rekomendasi alat otomatis bila belum diisi
      if (field === "jenis_hambatan") {
        const u = value.toUpperCase();
        if (REKOMENDASI_ALAT_DEFAULT[u]) {
          updated[index].tipe_alat_rekomendasi = REKOMENDASI_ALAT_DEFAULT[u];
        }
      }

      return { ...prev, hambatan: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nama_siswa.trim()) {
      toast.error("Nama siswa wajib diisi.");
      setActiveTab("identitas");
      return;
    }

    if (!formData.nisn.trim()) {
      toast.error("NISN siswa wajib diisi.");
      setActiveTab("identitas");
      return;
    }

    try {
      setIsSaving(true);
      await saveVervalIntervensi(formData);

      toast.success(
        isEdit
          ? "Data intervensi siswa berhasil diperbarui."
          : "Data intervensi baru berhasil ditambahkan ke PATJU 360."
      );

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Gagal menyimpan data intervensi:", err);
      toast.error("Gagal menyimpan data: " + (err?.message || "Terjadi kesalahan internal"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              {isEdit ? <GraduationCap className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                {isEdit ? "Perbarui Data Intervensi Prioritas" : "Tambah Data Intervensi Siswa Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEdit
                  ? `Memperbarui data intervensi PATJU 360 untuk ${formData.nama_siswa} (NISN: ${formData.nisn})`
                  : "Mendaftarkan peserta didik baru ke program afirmasi dan intervensi PATJU 360"}
              </DialogDescription>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-4 p-1 bg-muted/60 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setActiveTab("identitas")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "identitas"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="w-3.5 h-3.5 text-primary" />
              <span>1. Identitas & Sekolah</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("kesejahteraan")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "kesejahteraan"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>2. Bansos & DTSEN</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("kesehatan")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "kesehatan"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Rekam Medis & FKTP</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("hambatan")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "hambatan"
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
              <span>4. Hambatan & Alat ({formData.hambatan?.length || 0})</span>
            </button>
          </div>
        </DialogHeader>

        {/* Content Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: IDENTITAS & SEKOLAH */}
          {activeTab === "identitas" && (
            <div className="space-y-4">
              {!isEdit && (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-sky-600" />
                      Cari Siswa Terdaftar di Master Data (Opsional)
                    </span>
                    {selectedFromMaster && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Terhubung Master
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Ketik Nama Siswa atau NISN untuk auto-fill data sekolah..."
                      className="w-full p-2.5 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-sky-500/30"
                    />
                    {isSearching && (
                      <Loader2 className="w-4 h-4 text-sky-600 animate-spin absolute right-3 top-3" />
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-card shadow-lg">
                      {searchResults.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSiswa(s)}
                          className="p-2.5 hover:bg-muted/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-foreground">{s.nama_siswa}</div>
                            <div className="text-[10.5px] text-muted-foreground">
                              NISN: {s.nisn} · {s.satuan_pendidikan} ({s.kecamatan})
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-primary">
                            Pilih
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Nama Siswa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama_siswa}
                    onChange={(e) => setFormData({ ...formData, nama_siswa: e.target.value.toUpperCase() })}
                    placeholder="Nama lengkap siswa"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.jenis_kelamin || "L"}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    NISN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value.trim() })}
                    placeholder="10 digit NISN"
                    className="w-full p-2 text-xs font-mono bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    NIK Siswa
                  </label>
                  <input
                    type="text"
                    value={formData.nik_siswa || ""}
                    onChange={(e) => setFormData({ ...formData, nik_siswa: e.target.value.trim() })}
                    placeholder="16 digit NIK Siswa"
                    className="w-full p-2 text-xs font-mono bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Instansi Pembina
                  </label>
                  <select
                    value={formData.sumber_instansi || "DIKBUD"}
                    onChange={(e) => setFormData({ ...formData, sumber_instansi: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="DIKBUD">DIKBUD (Sekolah Formal / Swasta)</option>
                    <option value="KEMENAG">KEMENAG (Madrasah MI / MTs / RA)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Satuan Pendidikan (Sekolah)
                  </label>
                  <input
                    type="text"
                    value={formData.satuan_pendidikan || ""}
                    onChange={(e) => setFormData({ ...formData, satuan_pendidikan: e.target.value.toUpperCase() })}
                    placeholder="Contoh: SDN 1 GERUNG / MTs AL-IKHLAS"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Kecamatan
                  </label>
                  <select
                    value={formData.kecamatan || "Gerung"}
                    onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  >
                    {KECAMATAN_LIST.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Jenjang Pendidikan
                  </label>
                  <select
                    value={formData.jenjang || "SD"}
                    onChange={(e) => setFormData({ ...formData, jenjang: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="TK">TK / PAUD</option>
                    <option value="RA">RA</option>
                    <option value="SD">SD</option>
                    <option value="SD/MI">SD/MI</option>
                    <option value="MI">MI</option>
                    <option value="SMP">SMP</option>
                    <option value="SMP/MTS">SMP/MTs</option>
                    <option value="MTS">MTs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Tingkat Kelas
                  </label>
                  <input
                    type="text"
                    value={formData.tingkat_kelas || ""}
                    onChange={(e) => setFormData({ ...formData, tingkat_kelas: e.target.value })}
                    placeholder="Contoh: Kelas 1 / Kelas 4"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Metode Verifikasi
                  </label>
                  <input
                    type="text"
                    value={formData.metode_verval || "VERVAL PATJU 360"}
                    onChange={(e) => setFormData({ ...formData, metode_verval: e.target.value })}
                    placeholder="Contoh: PADAN NIK / VERVAL LAPANGAN"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Alamat Tempat Tinggal Siswa
                  </label>
                  <input
                    type="text"
                    value={formData.alamat_siswa || ""}
                    onChange={(e) => setFormData({ ...formData, alamat_siswa: e.target.value })}
                    placeholder="Dusun / RT / Desa tempat tinggal siswa"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Nama Ibu Kandung
                  </label>
                  <input
                    type="text"
                    value={formData.nama_ibu || ""}
                    onChange={(e) => setFormData({ ...formData, nama_ibu: e.target.value })}
                    placeholder="Nama ibu siswa"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    NIK Ibu Kandung
                  </label>
                  <input
                    type="text"
                    value={formData.nik_ibu || ""}
                    onChange={(e) => setFormData({ ...formData, nik_ibu: e.target.value.trim() })}
                    placeholder="16 digit NIK Ibu"
                    className="w-full p-2 text-xs font-mono bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Nama Ayah Kandung
                  </label>
                  <input
                    type="text"
                    value={formData.nama_ayah || ""}
                    onChange={(e) => setFormData({ ...formData, nama_ayah: e.target.value })}
                    placeholder="Nama ayah siswa"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    NIK Ayah Kandung
                  </label>
                  <input
                    type="text"
                    value={formData.nik_ayah || ""}
                    onChange={(e) => setFormData({ ...formData, nik_ayah: e.target.value.trim() })}
                    placeholder="16 digit NIK Ayah"
                    className="w-full p-2 text-xs font-mono bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KESEJAHTERAAN SOSIAL & DTSEN */}
          {activeTab === "kesejahteraan" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                Data kesejahteraan sosial disinkronkan dengan basis data DTSEN Kemensos & Tim Koordinasi Penanggulangan Kemiskinan Daerah (TKPKD) Lombok Barat.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Desil Nasional DTSEN
                  </label>
                  <select
                    value={formData.desil_nasional || "1"}
                    onChange={(e) => handleDesilChange(e.target.value)}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="1">Desil 1 (Ekstrem / Prioritas Tertinggi)</option>
                    <option value="2">Desil 2 (Sangat Miskin)</option>
                    <option value="3">Desil 3 (Hampir Miskin)</option>
                    <option value="4">Desil 4 (Rentan Miskin)</option>
                    <option value="5">Desil 5</option>
                    <option value="6">Desil 6</option>
                    <option value="7">Desil 7</option>
                    <option value="8">Desil 8</option>
                    <option value="9">Desil 9</option>
                    <option value="10">Desil 10</option>
                    <option value="BELUM ADA DESIL">Belum Ada Desil</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Kategori Desil
                  </label>
                  <input
                    type="text"
                    value={formData.kategori_desil || ""}
                    onChange={(e) => setFormData({ ...formData, kategori_desil: e.target.value })}
                    placeholder="Contoh: DESIL 1 (SANGAT MISKIN / EKSTREM)"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Penerima Bansos PKH
                  </label>
                  <select
                    value={formData.pkh || "TIDAK"}
                    onChange={(e) => setFormData({ ...formData, pkh: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="YA">YA (Menerima PKH)</option>
                    <option value="TIDAK">TIDAK Menerima</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Bansos Sembako (BPNT)
                  </label>
                  <select
                    value={formData.bansos_sembako || "TIDAK"}
                    onChange={(e) => setFormData({ ...formData, bansos_sembako: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="YA">YA (Menerima Sembako)</option>
                    <option value="TIDAK">TIDAK Menerima</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Beasiswa Afirmasi BSKM
                  </label>
                  <select
                    value={formData.beasiswa_bskm?.startsWith("YA") ? "YA" : "TIDAK"}
                    onChange={(e) => setFormData({ ...formData, beasiswa_bskm: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="YA">SUDAH Menerima BSKM</option>
                    <option value="TIDAK">BELUM Menerima (Prioritas Usulan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Jaminan BPJS PBI-JK (Kesehatan)
                  </label>
                  <select
                    value={formData.pbi_jk === "YA" ? "YA" : "TIDAK"}
                    onChange={(e) => setFormData({ ...formData, pbi_jk: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="YA">TERCOVER PBI-JK</option>
                    <option value="TIDAK">BELUM Tercover (Prioritas Jaminan)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Catatan Ragam Disabilitas di DTSEN
                  </label>
                  <input
                    type="text"
                    value={formData.disabilitas_dtsen || ""}
                    onChange={(e) => setFormData({ ...formData, disabilitas_dtsen: e.target.value })}
                    placeholder="Contoh: TIDAK TERCATAT DI DTSEN (TERVERIFIKASI PBS) / BERJALAN (BERAT)"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REKAM MEDIS & FKTP */}
          {activeTab === "kesehatan" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                Pencatatan rujukan FKTP, pemeriksaan dokter, dan status klinis terintegrasi dengan jaringan 20 Puskesmas & RSUD Tripat Lombok Barat.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Puskesmas Terdekat (FKTP)
                  </label>
                  <select
                    value={formData.puskesmas_terdekat || "UPT PUSKESMAS GERUNG"}
                    onChange={(e) => setFormData({ ...formData, puskesmas_terdekat: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {PUSKESMAS_LIST.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Jarak Rumah ke FKTP (KM)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.jarak_km ?? ""}
                    onChange={(e) => setFormData({ ...formData, jarak_km: parseFloat(e.target.value) || 0 })}
                    placeholder="Contoh: 2.5"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Status Medis / Riwayat Penyakit Kronis
                  </label>
                  <input
                    type="text"
                    value={formData.status_medis || ""}
                    onChange={(e) => setFormData({ ...formData, status_medis: e.target.value })}
                    placeholder="Contoh: TIDAK ADA PENYAKIT KRONIS / HIPERTENSI / MASALAH JANTUNG"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Dokter / Tenaga Medis Pemeriksa
                  </label>
                  <input
                    type="text"
                    value={formData.dokter_pemeriksa || ""}
                    onChange={(e) => setFormData({ ...formData, dokter_pemeriksa: e.target.value })}
                    placeholder="Contoh: dr. Ahmad, Sp.A / dr. Umum Puskesmas..."
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Diagnosa Klinis Medis
                  </label>
                  <input
                    type="text"
                    value={formData.diagnosa || ""}
                    onChange={(e) => setFormData({ ...formData, diagnosa: e.target.value })}
                    placeholder="Contoh: Low Vision Berat + Miopia Tingkat Tinggi / Cerebral Palsy Spastik"
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Tindakan Medis / Rencana Terapi
                  </label>
                  <textarea
                    rows={2}
                    value={formData.tindakan || ""}
                    onChange={(e) => setFormData({ ...formData, tindakan: e.target.value })}
                    placeholder="Contoh: Pemeriksaan refraksi mata di RSUD Tripat, peresepan kacamata minus, fisioterapi rutin..."
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Status Rujukan FKTP
                  </label>
                  <select
                    value={formData.status_rujukan || "Belum Ada Rujukan"}
                    onChange={(e) => setFormData({ ...formData, status_rujukan: e.target.value })}
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="Belum Ada Rujukan">Belum Ada Rujukan</option>
                    <option value="Penanganan Selesai di FKTP (Puskesmas)">Penanganan Selesai di FKTP (Puskesmas)</option>
                    <option value="Rujuk RSUD Patut Patuh Patju (Tripat)">Rujuk RSUD Patut Patuh Patju (Tripat)</option>
                    <option value="Rujuk RSUP NTB">Rujuk RSUP NTB</option>
                    <option value="Kunjungan Rumah (Home Care)">Kunjungan Rumah (Home Care)</option>
                    <option value="Kontrol Rutin Berkala">Kontrol Rutin Berkala</option>
                    <option value="Rekomendasi Alat Bantu Khusus">Rekomendasi Alat Bantu Khusus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Catatan Keterangan Intervensi
                  </label>
                  <input
                    type="text"
                    value={formData.keterangan || ""}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Catatan tindak lanjut untuk OPD pendamping..."
                    className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HAMBATAN & REKOMENDASI ALAT */}
          {activeTab === "hambatan" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Daftar Hambatan &amp; Kebutuhan Alat Bantu
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Tentukan hambatan fungsional yang dialami siswa dan rekomendasi alat bantu yang dibutuhkan.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddHambatan}
                  className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1 rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Hambatan
                </Button>
              </div>

              {(!formData.hambatan || formData.hambatan.length === 0) ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Belum ada data hambatan khusus yang ditambahkan untuk siswa ini.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddHambatan}
                    className="mt-3 text-xs font-bold rounded-xl"
                  >
                    + Tambah Hambatan Pertama
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.hambatan.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-border bg-card/60 shadow-sm space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          Hambatan #{idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveHambatan(idx)}
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg"
                          title="Hapus hambatan ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                            Jenis Hambatan
                          </label>
                          <select
                            value={h.jenis_hambatan}
                            onChange={(e) => handleHambatanChange(idx, "jenis_hambatan", e.target.value)}
                            className="w-full p-2 text-xs bg-background border border-border rounded-lg"
                          >
                            {HAMBATAN_COLS.map((col) => (
                              <option key={col} value={col.toUpperCase()}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                            Klasifikasi Keparahan
                          </label>
                          <select
                            value={h.klasifikasi || "BERAT"}
                            onChange={(e) => handleHambatanChange(idx, "klasifikasi", e.target.value)}
                            className="w-full p-2 text-xs bg-background border border-border rounded-lg"
                          >
                            <option value="BERAT">BERAT (Prioritas Utama)</option>
                            <option value="SEDANG">SEDANG</option>
                            <option value="RINGAN">RINGAN</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                            Rekomendasi Alat Bantu
                          </label>
                          <input
                            type="text"
                            value={h.tipe_alat_rekomendasi || ""}
                            onChange={(e) => handleHambatanChange(idx, "tipe_alat_rekomendasi", e.target.value)}
                            placeholder="Contoh: Kacamata Refraksi / Kursi Roda"
                            className="w-full p-2 text-xs bg-background border border-border rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {activeTab !== "identitas" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "hambatan") setActiveTab("kesehatan");
                    else if (activeTab === "kesehatan") setActiveTab("kesejahteraan");
                    else if (activeTab === "kesejahteraan") setActiveTab("identitas");
                  }}
                  className="rounded-xl text-xs font-bold"
                >
                  ← Sebelumnya
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs font-bold"
              >
                Batal
              </Button>

              {activeTab !== "hambatan" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "identitas") setActiveTab("kesejahteraan");
                    else if (activeTab === "kesejahteraan") setActiveTab("kesehatan");
                    else if (activeTab === "kesehatan") setActiveTab("hambatan");
                  }}
                  className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Selanjutnya →
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 px-4"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      {isEdit ? "Simpan Perubahan Data" : "Simpan Data Baru"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}