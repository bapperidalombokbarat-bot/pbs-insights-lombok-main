import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useMathCaptcha, MathCaptchaBox } from "@/components/MathCaptcha";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, KeyRound, Check, LogOut, User, Lock, Sparkles } from "lucide-react";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ROLES_INFO = [
  {
    username: "bapperida",
    nama: "Bapperida Kab. Lombok Barat",
    role: "BAPPERIDA",
    badge: "Super Admin & TKPKD",
    avatar: "🏛️",
    desc: "Akses penuh manajemen data, pemutakhiran master, dan koordinasi kebijakan.",
    color: "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-700 dark:text-blue-400"
  },
  {
    username: "dikes",
    nama: "Dinas Kesehatan & PPKB",
    role: "DIKES",
    badge: "Medis & Rujukan FKTP",
    avatar: "🩺",
    desc: "Hak verifikasi pemeriksaan klinis dokter, diagnosa medis, tindakan, dan rujukan FKTP.",
    color: "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  },
  {
    username: "dikbud",
    nama: "Dinas Pendidikan & Kebudayaan",
    role: "DIKBUD",
    badge: "Pendidikan & BSKM",
    avatar: "🎓",
    desc: "Hak verifikasi usulan Beasiswa BSKM, Guru Pendamping Khusus (GPK), dan sekolah inklusi.",
    color: "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
  },
  {
    username: "dinsos",
    nama: "Dinas Sosial",
    role: "DINSOS",
    badge: "Bansos & Alat Bantu",
    avatar: "🤝",
    desc: "Hak verifikasi bantuan alat bantu khusus disabilitas (Kursi Roda, ABD) & Bansos DTSEN.",
    color: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400"
  },
  {
    username: "inovasi",
    nama: "Kemitraan INOVASI NTB",
    role: "INOVASI",
    badge: "M&E & Policy Advisor",
    avatar: "🌏",
    desc: "Akses analitik agregat, pemantauan iklim inklusi, dan kajian kebijakan (Privacy Protected).",
    color: "border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 text-teal-700 dark:text-teal-400"
  }
];

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { user, login, quickLogin, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  const {
    captcha,
    inputVal: captchaInput,
    setInputVal: setCaptchaInput,
    error: captchaError,
    refresh: refreshCaptcha,
    verify: verifyCaptcha,
  } = useMathCaptcha();

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCaptcha()) {
      return;
    }
    if (!username || !password) {
      setError("Silakan isi username dan password.");
      return;
    }
    setError(null);
    setIsLoading(true);
    const res = await login(username, password);
    setIsLoading(false);
    if (res.success) {
      onOpenChange(false);
      setUsername("");
      setPassword("");
      refreshCaptcha();
    } else {
      setError(res.message || "Gagal masuk.");
      refreshCaptcha();
    }
  };

  const handleSelectOpd = (roleUser: string) => {
    setUsername(roleUser);
    setPassword("");
    setError(null);
    setIsManualMode(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
              🔑
            </span>
            <DialogTitle className="text-xl font-bold">
              {user ? "Profil & Sesi Akses OPD" : "Pilih Akses Instansi / Masuk"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Sistem Data Terpadu Peserta Didik Inklusi (PEDULI) Kabupaten Lombok Barat
          </DialogDescription>
        </DialogHeader>

        {user ? (
          /* Tampilan saat sudah login */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl border border-border bg-muted/30 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-xl bg-card border border-border shadow-sm">
                  {user.avatar || "👤"}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base text-foreground">{user.nama_lengkap}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/15 text-primary border border-primary/20">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{user.instansi}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Keterangan Peran:</span> {user.keterangan}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Sesi Anda aktif. Hak akses penyuntingan data telah disesuaikan dengan instansi Anda.</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  logout();
                  onOpenChange(false);
                }}
                className="rounded-xl flex items-center gap-1.5 font-bold text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar (Logout)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        ) : (
          /* Tampilan saat belum login */
          <div className="space-y-4 py-2">
            {!isManualMode ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Pilih Instansi untuk Akses Cepat
                  </span>
                  <button
                    onClick={() => setIsManualMode(true)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Gunakan Password Manual →
                  </button>
                </div>

                <MathCaptchaBox
                  captcha={captcha}
                  inputVal={captchaInput}
                  setInputVal={setCaptchaInput}
                  onRefresh={refreshCaptcha}
                  error={captchaError}
                />

                <div className="grid grid-cols-1 gap-2.5">
                  {ROLES_INFO.map((r) => (
                    <button
                      key={r.username}
                      type="button"
                      onClick={() => handleSelectOpd(r.username)}
                      disabled={isLoading}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${r.color}`}
                    >
                      <span className="text-2xl mt-0.5">{r.avatar}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-foreground">{r.nama}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-background/80 border border-current shadow-xs">
                            {r.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {r.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={handleManualLogin} className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {username ? `Masuk Akun @${username}` : "Masuk dengan Akun Instansi"}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setIsManualMode(false); setUsername(""); setPassword(""); }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    ← Kembali ke Pilihan Instansi
                  </button>
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Username Akun</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: bapperida / dikes / dikbud / dinsos / inovasi"
                    className="w-full p-2.5 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun..."
                    className="w-full p-2.5 bg-background border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 outline-none"
                    autoFocus
                  />
                </div>

                <MathCaptchaBox
                  captcha={captcha}
                  inputVal={captchaInput}
                  setInputVal={setCaptchaInput}
                  onRefresh={refreshCaptcha}
                  error={captchaError}
                />

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManualMode(false)}
                    className="rounded-xl text-xs"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading}
                    className="rounded-xl text-xs font-bold bg-primary text-primary-foreground px-4"
                  >
                    {isLoading ? "Memproses..." : "Masuk"}
                  </Button>
                </div>
              </form>
            )}

            <div className="p-3 rounded-xl bg-muted/40 border border-border/70 text-[10.5px] text-muted-foreground leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Tata kelola akses peran mengacu pada pembagian kewenangan kolaborasi lintas sektor dan kepatuhan terhadap Undang-Undang Perlindungan Data Pribadi (UU PDP).
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
