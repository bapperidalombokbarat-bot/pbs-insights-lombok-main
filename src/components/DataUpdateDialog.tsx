import { useState } from "react";
import * as XLSX from "xlsx/xlsx.mjs";
import { getDb, HAMBATAN_COLS } from "@/lib/db";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "./ui/dialog";
import { Button } from "./ui/button";
import { FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DataUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataUpdateDialog({ open, onOpenChange }: DataUpdateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [progress, setProgress] = useState("");
  const queryClient = useQueryClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("processing");
    setProgress("Membaca file excel...");

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const db = await getDb();
          let countSiswa = 0;
          let countRapor = 0;

          const parseVal = (v: any) => {
            if (v === null || v === undefined || v === "") return 0;
            if (typeof v === "number") return v;
            return parseFloat(v.toString().replace(",", "."));
          };

          // 1. CEK DATA REKAPITULASI PBS
          const pbsSheetName = workbook.SheetNames.find(n => n.includes("Rekapitulasi"));
          if (pbsSheetName) {
            setProgress("Memproses data Rekapitulasi PBS...");
            const sheet = workbook.Sheets[pbsSheetName];
            const rows = XLSX.utils.sheet_to_json(sheet) as any[];
            
            db.run("DELETE FROM hambatan_siswa");
            db.run("DELETE FROM siswa");

            const insertSiswa = db.prepare(`
              INSERT INTO siswa (id, nama_siswa, nisn, satuan_pendidikan, kecamatan, jenjang, tingkat_kelas, jenis_kelamin)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertHambatan = db.prepare(`
              INSERT INTO hambatan_siswa (siswa_id, jenis_hambatan, tingkat_hambatan)
              VALUES (?, ?, ?)
            `);

            rows.forEach((row, idx) => {
              const id = idx + 1;
              const nama = row["Nama Peserta Didik"] || row["Nama Siswa"] || row["Nama"] || row["nama_siswa"];
              if (!nama) return;

              const nisn = row["NISN"] || row["nisn"] || "";
              const sekolah = row["Satuan Pendidikan"] || row["Sekolah"] || row["satuan_pendidikan"] || "";
              const kecamatan = row["Kecamatan"] || row["kecamatan"] || "";
              const jenjang = row["Jenjang"] || row["jenjang"] || "";
              const kelas = row["Kelas"] || row["Tingkat Kelas"] || row["tingkat_kelas"] || "";
              const jk = row["Jenis Kelamin"] || row["jenis_kelamin"] || "";

              insertSiswa.run([id, nama, nisn, sekolah, kecamatan, jenjang, kelas, jk]);

              const difficulties: { col: string, val: string }[] = [];
              let banyakKesulitanCount = 0;

              HAMBATAN_COLS.forEach(col => {
                let val = row[col];
                if (val && val !== "Tidak ada" && val !== "-" && val !== "Tidak Ada Kesulitan" && val !== "Tidak ada kesulitan") {
                  if (val === "Banyak Kesulitan") banyakKesulitanCount++;
                  difficulties.push({ col, val });
                }
              });

              difficulties.forEach(h => {
                let finalVal = h.val;
                // Mapping Ringan
                if (finalVal === "Sedikit Kesulitan" || finalVal === "Ringan") {
                  finalVal = "Ringan";
                } 
                // Mapping Sedang & Upgrade ke Berat jika Akumulatif (Minimal 70% / 7 Indikator)
                else if (finalVal === "Banyak Kesulitan" || finalVal === "Sedang") {
                  finalVal = banyakKesulitanCount >= 7 ? "Berat" : "Sedang";
                } 
                // Mapping Berat Langsung
                else if (finalVal === "Tidak Bisa Sama Sekali" || finalVal === "Berat") {
                  finalVal = "Berat";
                }
                
                insertHambatan.run([id, h.col, finalVal]);
              });
              countSiswa++;
            });
            insertSiswa.free();
            insertHambatan.free();
          }

          // 2. CEK DATA RAPOR PENDIDIKAN (SPM)
          const dasmenSheet = workbook.SheetNames.find(n => n.includes("DASMEN"));
          const paudSheet = workbook.SheetNames.find(n => n.includes("PAUD"));

          if (dasmenSheet || paudSheet) {
            setProgress("Memproses data Rapor Pendidikan (SPM)...");
            db.run("CREATE TABLE IF NOT EXISTS rapor_spm (npsn TEXT, nama_satuan TEXT, jenis_satuan TEXT, kecamatan TEXT, jenjang TEXT, indikator TEXT, skor REAL, label TEXT)");
            db.run("DELETE FROM rapor_spm");

            const insertRapor = db.prepare(`
              INSERT INTO rapor_spm (npsn, nama_satuan, jenis_satuan, kecamatan, jenjang, indikator, skor, label)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            if (dasmenSheet) {
              const data = XLSX.utils.sheet_to_json(workbook.Sheets[dasmenSheet], { header: 1 }) as any[][];
              const dasmenIndicators = [
                { name: 'Literasi', labelIdx: 35, valIdx: 37 },
                { name: 'Numerasi', labelIdx: 44, valIdx: 46 },
                { name: 'Karakter', labelIdx: 55, valIdx: 57 },
                { name: 'Kualitas Pembelajaran', labelIdx: 90, valIdx: 92 },
                { name: 'Iklim Keamanan', labelIdx: 111, valIdx: 113 },
                { name: 'Iklim Kebinekaan', labelIdx: 134, valIdx: 136 },
                { name: 'Iklim Inklusivitas', labelIdx: 138, valIdx: 140 }
              ];
              for (let i = 6; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[0]) continue;
                dasmenIndicators.forEach(ind => {
                  insertRapor.run([row[0], row[1], row[2], row[5], 'DASMEN', ind.name, parseVal(row[ind.valIdx]), row[ind.labelIdx] || 'N/A']);
                });
                countRapor++;
              }
            }

            if (paudSheet) {
              const data = XLSX.utils.sheet_to_json(workbook.Sheets[paudSheet], { header: 1 }) as any[][];
              const paudIndicators = [
                { name: 'Perencanaan Pembelajaran', labelIdx: 6, valIdx: 8 },
                { name: 'Proses Belajar', labelIdx: 13, valIdx: 15 },
                { name: 'Kemampuan Fondasi', labelIdx: 26, valIdx: 28 },
                { name: 'Sarana Prasarana', labelIdx: 53, valIdx: 55 },
                { name: 'Iklim Keamanan', labelIdx: 65, valIdx: 67 },
                { name: 'Layanan Holistik Integratif', labelIdx: 99, valIdx: 101 }
              ];
              for (let i = 6; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[0]) continue;
                paudIndicators.forEach(ind => {
                  insertRapor.run([row[0], row[1], row[2], row[5], 'PAUD', ind.name, parseVal(row[ind.valIdx]), row[ind.labelIdx] || 'N/A']);
                });
                countRapor++;
              }
            }
            insertRapor.free();
          }

          if (countSiswa === 0 && countRapor === 0) {
            throw new Error("Format file tidak dikenali sebagai Rekapitulasi PBS maupun Rapor Pendidikan.");
          }

          await queryClient.invalidateQueries();
          setStatus("success");
          
          let msg = "Berhasil memperbarui: ";
          if (countSiswa > 0) msg += `${countSiswa} Siswa PBS. `;
          if (countRapor > 0) msg += `${countRapor} Sekolah Rapor Pendidikan. `;
          toast.success(msg);
        } catch (err: any) {
          console.error(err);
          setStatus("error");
          toast.error("Gagal memproses data: " + err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setStatus("error");
      toast.error("Gagal membaca file.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Data PBS (Lokal)</DialogTitle>
          <DialogDescription>
            Upload file Excel untuk memproses data di memori browser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-xl bg-muted/30 min-h-[200px]">
          {status === "idle" && (
            <>
              <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4 text-center px-6">
                Pilih file Excel rekapitulasi PBS.
              </p>
              <input 
                type="file" 
                id="excel-upload" 
                accept=".xlsx, .xls" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              <Button asChild>
                <label htmlFor="excel-upload" className="cursor-pointer">Pilih File</label>
              </Button>
            </>
          )}

          {status === "processing" && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium">{progress}</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center text-center px-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
              <p className="text-sm font-bold text-green-600 mb-1">Berhasil!</p>
              <p className="text-xs text-muted-foreground mb-4">Data di browser telah diperbarui.</p>
              <Button onClick={() => onOpenChange(false)}>Tutup</Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center text-center px-6">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-sm font-bold text-destructive mb-1">Error</p>
              <p className="text-xs text-muted-foreground mb-4">Pastikan format file sesuai.</p>
              <Button variant="outline" onClick={() => setStatus("idle")}>Coba Lagi</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
