import { useState } from "react";
import * as XLSX from "xlsx/xlsx.mjs";
import { HAMBATAN_COLS, run, saveDb } from "@/lib/db";
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
          let countSiswa = 0;
          let countRapor = 0;

          const parseVal = (v: any) => {
            if (v === null || v === undefined || v === "") return null;
            if (typeof v === "number") return v;
            const s = v.toString().trim().replace(",", ".");
            if (s === "-" || s === "" || isNaN(Number(s))) return null;
            return parseFloat(s);
          };

          // 1. CEK DATA REKAPITULASI PBS
          const pbsSheetName = workbook.SheetNames.find(n => n.includes("Rekapitulasi"));
          if (pbsSheetName) {
            setProgress("Memproses data Rekapitulasi PBS...");
            const sheet = workbook.Sheets[pbsSheetName];
            const rows = XLSX.utils.sheet_to_json(sheet) as any[];
            
            await run("DELETE FROM hambatan_siswa");
            await run("DELETE FROM siswa");

            for (const [idx, row] of (rows as any[]).entries()) {
              const id = idx + 1;
              const nama = row["Nama Peserta Didik"] || row["Nama Siswa"] || row["Nama"] || row["nama_siswa"];
              if (!nama) continue;

              const nisn = row["NISN"] || row["nisn"] || "";
              const sekolah = row["Satuan Pendidikan"] || row["Sekolah"] || row["satuan_pendidikan"] || "";
              const kecamatan = row["Kecamatan"] || row["kecamatan"] || "";
              const jenjang = row["Jenjang"] || row["jenjang"] || "";
              const kelas = row["Kelas"] || row["Tingkat Kelas"] || row["tingkat_kelas"] || "";
              const jk = row["Jenis Kelamin"] || row["jenis_kelamin"] || "";

              await run(`
                INSERT INTO siswa (id, nama_siswa, nisn, satuan_pendidikan, kecamatan, jenjang, tingkat_kelas, jenis_kelamin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [id, nama, nisn, sekolah, kecamatan, jenjang, kelas, jk]);

              const difficulties: { col: string, val: string }[] = [];
              let totalScore = 0;

              HAMBATAN_COLS.forEach(col => {
                let val = row[col];
                if (val && val !== "Tidak ada" && val !== "-" && val !== "Tidak Ada Kesulitan" && val !== "Tidak ada kesulitan") {
                  let score = 0;
                  if (val === "Sedikit Kesulitan" || val === "Ringan") score = 1;
                  else if (val === "Banyak Kesulitan" || val === "Sedang") score = 3;
                  else if (val === "Tidak Bisa Sama Sekali" || val === "Berat") score = 4;
                  
                  totalScore += score;
                  difficulties.push({ col, val });
                }
              });

              let finalCategory = "Ringan";
              if (totalScore >= 9) finalCategory = "Berat";
              else if (totalScore >= 4) finalCategory = "Sedang";
              else if (totalScore >= 1) finalCategory = "Ringan";

              for (const h of difficulties) {
                if (totalScore >= 1) {
                  await run(`
                    INSERT INTO hambatan_siswa (siswa_id, jenis_hambatan, tingkat_hambatan)
                    VALUES (?, ?, ?)
                  `, [id, h.col, finalCategory]);
                }
              }
              countSiswa++;
            }
          }

          // 2. CEK DATA RAPOR PENDIDIKAN (SPM)
          const dasmenSheet = workbook.SheetNames.find(n => n.includes("DASMEN"));
          const paudSheet = workbook.SheetNames.find(n => n.includes("PAUD"));

          if (dasmenSheet || paudSheet) {
            setProgress("Memproses data Rapor Pendidikan (SPM)...");
            await run("CREATE TABLE IF NOT EXISTS rapor_spm (npsn TEXT, nama_satuan TEXT, jenis_satuan TEXT, kecamatan TEXT, jenjang TEXT, indikator TEXT, skor REAL, label TEXT)");
            await run("DELETE FROM rapor_spm");

            if (dasmenSheet) {
              const data = XLSX.utils.sheet_to_json(workbook.Sheets[dasmenSheet], { header: 1 }) as any[][];
              const dasmenIndicators = [
                { name: 'Literasi', labelIdx: 35, valIdx: 37 },
                { name: 'Numerasi', labelIdx: 44, valIdx: 46 },
                { name: 'Karakter', labelIdx: 55, valIdx: 57 },
                { name: 'Kualitas Pembelajaran', labelIdx: 91, valIdx: 93 },
                { name: 'Iklim Keamanan', labelIdx: 112, valIdx: 114 },
                { name: 'Iklim Kebinekaan', labelIdx: 132, valIdx: 134 },
                { name: 'Iklim Inklusivitas', labelIdx: 139, valIdx: 141 }
              ];
              for (let i = 6; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[0]) continue;
                for (const ind of dasmenIndicators) {
                  const score = parseVal(row[ind.valIdx]);
                  await run(`
                    INSERT INTO rapor_spm (npsn, nama_satuan, jenis_satuan, kecamatan, jenjang, indikator, skor, label)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `, [row[0], row[1], row[2], row[5], 'DASMEN', ind.name, score, row[ind.labelIdx] || 'N/A']);
                }
                countRapor++;
              }
            }

            if (paudSheet) {
              const data = XLSX.utils.sheet_to_json(workbook.Sheets[paudSheet], { header: 1 }) as any[][];
              const paudIndicators = [
                { name: 'Perencanaan Pembelajaran', labelIdx: 6, valIdx: 8 },
                { name: 'Proses Belajar', labelIdx: 13, valIdx: 15 },
                { name: 'Kemampuan Fondasi', labelIdx: 26, valIdx: 28 },
                { name: 'Kebiasaan Anak Hebat', labelIdx: 42, valIdx: 44 },
                { name: 'Sarana Prasarana', labelIdx: 53, valIdx: 55 },
                { name: 'Iklim Keamanan', labelIdx: 65, valIdx: 67 },
                { name: 'Iklim Inklusivitas & Kebinekaan', labelIdx: 75, valIdx: 77 },
                { name: 'Refleksi & Perbaikan Pembelajaran', labelIdx: 83, valIdx: 85 },
                { name: 'Kepemimpinan Instruksional', labelIdx: 90, valIdx: 92 },
                { name: 'Kemitraan Orang Tua', labelIdx: 97, valIdx: 99 },
                { name: 'Layanan Holistik Integratif', labelIdx: 101, valIdx: 103 }
              ];
              for (let i = 6; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[0]) continue;
                for (const ind of paudIndicators) {
                  const score = parseVal(row[ind.valIdx]);
                  await run(`
                    INSERT INTO rapor_spm (npsn, nama_satuan, jenis_satuan, kecamatan, jenjang, indikator, skor, label)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `, [row[0], row[1], row[2], row[5], 'PAUD', ind.name, score, row[ind.labelIdx] || 'N/A']);
                }
                countRapor++;
              }
            }
          }

          if (countSiswa === 0 && countRapor === 0) {
            throw new Error("Format file tidak dikenali sebagai Rekapitulasi PBS maupun Rapor Pendidikan.");
          }

          await saveDb(); // Simpan ke IndexedDB
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
