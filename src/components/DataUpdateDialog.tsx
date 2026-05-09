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
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet) as any[];

          if (rows.length === 0) {
            throw new Error("File excel kosong atau tidak valid.");
          }

          setProgress(`Memproses ${rows.length} data siswa...`);
          
          const db = await getDb();
          
          // 1. Bersihkan data lama
          db.run("DELETE FROM hambatan_siswa");
          db.run("DELETE FROM siswa");

          // 2. Siapkan statement
          const insertSiswa = db.prepare(`
            INSERT INTO siswa (id, nama_siswa, nisn, satuan_pendidikan, kecamatan, jenjang, tingkat_kelas, jenis_kelamin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const insertHambatan = db.prepare(`
            INSERT INTO hambatan_siswa (siswa_id, jenis_hambatan, tingkat_hambatan)
            VALUES (?, ?, ?)
          `);

          let count = 0;
          for (const row of rows) {
            const id = count + 1;
            const nama = row["Nama Peserta Didik"] || row["Nama"] || row["nama_siswa"] || row["Nama Siswa"];
            const nisn = row["NISN"] || row["nisn"] || "";
            const sekolah = row["Satuan Pendidikan"] || row["Sekolah"] || row["satuan_pendidikan"] || "";
            const kecamatan = row["Kecamatan"] || row["kecamatan"] || "";
            const jenjang = row["Jenjang"] || row["jenjang"] || "";
            const kelas = row["Kelas"] || row["Tingkat Kelas"] || row["tingkat_kelas"] || "";
            const jk = row["Jenis Kelamin"] || row["jenis_kelamin"] || "";

            if (!nama) continue;

            insertSiswa.run([id, nama, nisn, sekolah, kecamatan, jenjang, kelas, jk]);

            // Cek hambatan
            HAMBATAN_COLS.forEach(col => {
              const val = row[col];
              if (val && val !== "Tidak ada" && val !== "-" && val !== "Tidak Ada Kesulitan" && val !== "Tidak ada kesulitan") {
                insertHambatan.run([id, col, val]);
              }
            });

            count++;
            if (count % 100 === 0) {
              setProgress(`Menyimpan data lokal... (${count}/${rows.length})`);
            }
          }

          insertSiswa.free();
          insertHambatan.free();

          // Catatan: Di sql.js (browser), perubahan ini hanya ada di memori.
          // Jika ingin permanen di lokal saat dev, Anda harus mendownload file DB-nya.
          
          await queryClient.invalidateQueries();
          
          setStatus("success");
          toast.success(`Berhasil mengupdate ${count} data siswa (Lokal).`);
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
