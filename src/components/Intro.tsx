import { useState, useEffect } from "react";
import logoBlue from "@/assets/logo-lobar-blue.png";
import logoKemdikbud from "@/assets/logo-kemdikbud.png";
import { useMathCaptcha, MathCaptchaBox } from "./MathCaptcha";
import { useAuth } from "@/lib/AuthContext";
import { ROLES_INFO } from "./LoginDialog";
import { 
  Sparkles, KeyRound, Eye, ShieldAlert, ArrowRight, 
  Lock, CheckCircle2, UserCheck, AlertCircle, Check 
} from "lucide-react";
import { Button } from "./ui/button";

interface IntroProps {
  onEnter: () => void;
}

export function Intro({ onEnter }: IntroProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"quick" | "manual">("quick");
  const [selectedRole, setSelectedRole] = useState<typeof ROLES_INFO[0] | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { user, login, loginAsGuest, logout } = useAuth();
  const {
    captcha,
    inputVal,
    setInputVal,
    error: captchaError,
    refresh,
    verify,
  } = useMathCaptcha();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSelectRole = (r: typeof ROLES_INFO[0]) => {
    setSelectedRole(r);
    setUsername(r.username);
    setPassword("");
    setLoginError(null);
  };

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!verify()) {
      return;
    }
    const targetUser = username.trim();
    if (!targetUser || !password) {
      setLoginError("Silakan isi nama akun dan password.");
      return;
    }
    setIsLoading(true);
    setLoginError(null);
    const res = await login(targetUser, password);
    setIsLoading(false);
    if (res.success) {
      onEnter();
    } else {
      setLoginError(res.message || "Password atau username salah! Akses ditolak.");
      refresh();
    }
  };

  const handleGuestClick = () => {
    if (!verify()) {
      return;
    }
    loginAsGuest();
    onEnter();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0a0f1d] text-slate-100 font-['Poppins'] p-3 sm:p-6">
      {/* Latar Belakang Data Animasi & Grid */}
      <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56, 189, 248, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Animasi Gradient Latar */}
      <div className="absolute -top-[120px] -left-[120px] w-[500px] h-[500px] bg-[#0284c7] rounded-full blur-[140px] opacity-25 animate-pulse pointer-events-none" />
      <div className="absolute -bottom-[150px] -right-[120px] w-[600px] h-[600px] bg-[#3b82f6] rounded-full blur-[150px] opacity-25 animate-pulse delay-1000 pointer-events-none" />

      {/* Konten Utama Dialog Portal */}
      <div 
        className={`relative z-10 w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-3xl p-5 sm:p-8 md:p-10 bg-slate-900/85 backdrop-blur-2xl border border-sky-500/20 shadow-[0_0_50px_rgba(2,132,199,0.2)] transition-all duration-700 ease-out transform ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Ornamen Sudut */}
        <div className="absolute top-[-2px] left-[-2px] w-8 h-8 border-t-2 border-l-2 border-sky-400 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-[-2px] right-[-2px] w-8 h-8 border-t-2 border-r-2 border-sky-400 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-[-2px] left-[-2px] w-8 h-8 border-b-2 border-l-2 border-sky-400 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-[-2px] right-[-2px] w-8 h-8 border-b-2 border-r-2 border-sky-400 rounded-br-xl pointer-events-none" />

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src={logoBlue} 
              alt="Logo Lombok Barat" 
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]"
            />
            <div className="text-left">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-sky-400 block">
                Kabupaten Lombok Barat
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white">
                PEDULI
              </h1>
            </div>
            <img 
              src={logoKemdikbud} 
              alt="Kemendikdasmen" 
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain opacity-80 hidden sm:block drop-shadow"
            />
          </div>

          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl mx-auto leading-relaxed">
            Sistem Data <span className="text-white font-bold">PE</span>serta <span className="text-white font-bold">D</span>idik Inkl<span className="text-white font-bold">U</span>si <span className="text-white font-bold">L</span>ombok Barat <span className="text-white font-bold">I</span>nteraktif
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-500/30 text-[10.5px] text-sky-300 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            Integrasi PATJU 360 &amp; Keamanan Akses Berbasis Peran (RBAC)
          </div>
        </div>

        {/* Jika Sesi Sudah Aktif Dari Sesi Sebelumnya */}
        {user && (
          <div className="mb-6 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-left">
              <span className="text-2xl p-2 rounded-xl bg-slate-800 border border-slate-700">
                {user.avatar || "👤"}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{user.nama_lengkap}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-400 text-slate-900">
                    {user.role}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">{user.instansi}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={onEnter}
                className="flex-1 sm:flex-initial rounded-xl font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs px-4 py-2 cursor-pointer"
              >
                Lanjut ke Dashboard →
              </Button>
              <Button
                variant="outline"
                onClick={logout}
                className="rounded-xl text-xs border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Ganti Akun
              </Button>
            </div>
          </div>
        )}

        {/* Form & Verifikasi Anti-Bot */}
        <div className="space-y-4">
          {/* Kotak Captcha Aritmatika */}
          <MathCaptchaBox
            captcha={captcha}
            inputVal={inputVal}
            setInputVal={setInputVal}
            onRefresh={refresh}
            error={captchaError}
            dark={true}
            label="1. Verifikasi Anti-Bot AI (Wajib Diselesaikan)"
          />

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Tab Pemilih Mode Masuk */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 pt-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              2. Pilih Akun Instansi &amp; Masukkan Password
            </span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-800/80 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => { setActiveTab("quick"); setSelectedRole(null); setPassword(""); setLoginError(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "quick"
                    ? "bg-sky-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Pilih Akun OPD
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("manual"); setSelectedRole(null); setPassword(""); setLoginError(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "manual"
                    ? "bg-sky-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Ketik Manual
              </button>
            </div>
          </div>

          {/* TAB 1: PILIH AKUN OPD */}
          {activeTab === "quick" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {ROLES_INFO.map((r) => {
                  const isSelected = selectedRole?.username === r.username;
                  return (
                    <button
                      key={r.username}
                      type="button"
                      onClick={() => handleSelectRole(r)}
                      disabled={isLoading}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start gap-3 cursor-pointer group shadow-sm disabled:opacity-50 ${
                        isSelected
                          ? "bg-sky-950/70 border-2 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
                          : "bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-500"
                      }`}
                    >
                      <span className="text-2xl mt-0.5 p-1 rounded-xl bg-slate-900/80 border border-slate-700 group-hover:scale-105 transition-transform">
                        {r.avatar}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-bold text-xs truncate ${isSelected ? "text-sky-300" : "text-white"}`}>
                            {r.nama}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-0.5 text-[9px] font-black text-sky-400 bg-sky-950 px-1.5 py-0.5 rounded-md border border-sky-400/40">
                              <Check className="w-2.5 h-2.5" /> Terpilih
                            </span>
                          )}
                        </div>
                        <span className="inline-block mt-0.5 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-900/60 text-slate-300 border border-slate-700">
                          {r.badge}
                        </span>
                        <p className="text-[10.5px] text-slate-400 mt-1 leading-snug line-clamp-2">
                          {r.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Box Input Password Saat Akun Dipilih */}
              {selectedRole ? (
                <div className="p-4 rounded-2xl bg-sky-950/60 border border-sky-400/30 text-left space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedRole.avatar}</span>
                      <div>
                        <span className="font-bold text-xs text-white block">
                          Masukkan Password untuk {selectedRole.nama}
                        </span>
                        <span className="text-[10px] text-sky-400">Akun: @{selectedRole.username}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedRole(null); setPassword(""); }}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Batal Pilih
                    </button>
                  </div>

                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password akun instansi..."
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleLoginSubmit();
                      }}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleLoginSubmit()}
                    disabled={isLoading || !password}
                    className="w-full rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 py-2.5 shadow-lg cursor-pointer"
                  >
                    {isLoading ? "Memverifikasi..." : `Masuk sebagai ${selectedRole.role} →`}
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-400">
                  👆 Silakan klik salah satu akun instansi di atas untuk memasukkan password.
                </div>
              )}

              {/* Tombol Tamu / Publik */}
              <button
                type="button"
                onClick={handleGuestClick}
                disabled={isLoading}
                className="w-full text-left p-3.5 rounded-2xl bg-slate-800/30 hover:bg-slate-800/60 border border-dashed border-slate-700 hover:border-slate-500 transition-all flex items-start gap-3 cursor-pointer group disabled:opacity-50"
              >
                <span className="text-2xl mt-0.5 p-1 rounded-xl bg-slate-900/80 border border-slate-700">
                  👁️
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-200 group-hover:text-white">
                      Mode Publik / Tamu Umum (Read-Only)
                    </span>
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      Tanpa Password
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                    Akses peninjauan umum data agregat dan grafik publik. Hak edit rekam medis klinis &amp; upload data dinonaktifkan, serta NIK/NISN disamarkan sesuai UU PDP.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* TAB 2: MANUAL LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 pt-1 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username Instansi
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: bapperida / dikes / dikbud / dinsos / inovasi"
                  className="w-full p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun..."
                  className="w-full p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleGuestClick}
                  className="text-xs text-slate-400 hover:text-sky-300 underline cursor-pointer"
                >
                  Masuk sebagai Tamu (Read-Only)
                </button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 px-6 py-2 shadow-lg hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] cursor-pointer"
                >
                  {isLoading ? "Memproses Masuk..." : "Masuk ke Dashboard →"}
                </Button>
              </div>
            </form>
          )}

          {/* Footer Informasi Regulasi */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10.5px] text-slate-400">
            <span>&copy; 2026 Pemerintah Kabupaten Lombok Barat · Bapperida P2M</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="w-3 h-3 text-sky-400" /> Kepatuhan UU Perlindungan Data Pribadi (UU PDP)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
