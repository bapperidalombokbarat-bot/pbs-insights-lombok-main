import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteVervalIntervensi } from "@/lib/db";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface IntervensiDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
  onSuccess: () => void;
}

export function IntervensiDeleteModal({
  open,
  onOpenChange,
  item,
  onSuccess,
}: IntervensiDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteVervalIntervensi(item.id);
      toast.success(`Data intervensi siswa "${item.nama_siswa}" berhasil dihapus.`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Gagal menghapus intervensi:", err);
      toast.error("Gagal menghapus data: " + (err?.message || "Terjadi kesalahan internal"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-2xl bg-card border-border shadow-2xl p-6">
        <AlertDialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Hapus Data Intervensi Siswa?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Anda akan menghapus data tindak lanjut intervensi prioritas PATJU 360 untuk siswa:
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="my-3 p-3.5 rounded-xl bg-muted/60 border border-border text-xs space-y-1">
          <div className="font-bold text-foreground text-sm">{item.nama_siswa}</div>
          <div className="text-muted-foreground font-mono text-[11px]">
            NISN: {item.nisn} · {item.satuan_pendidikan} ({item.kecamatan})
          </div>
          <div className="text-muted-foreground text-[10.5px]">
            Desil: <span className="font-semibold text-foreground">{item.desil_nasional || "Belum Ada"}</span> · Instansi: <span className="font-semibold text-foreground">{item.sumber_instansi}</span>
          </div>
        </div>

        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
          ⚠️ Catatan: Data rekomendasi alat bantu dan rekam medis klinis siswa ini di daftar prioritas akan dihapus. Data master siswa di Dapodik/PBS tetap dipertahankan.
        </p>

        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className="rounded-xl text-xs font-bold"
          >
            Batal
          </AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Ya, Hapus Data
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}