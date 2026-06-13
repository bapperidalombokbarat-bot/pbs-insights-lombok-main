import { useState, useEffect } from "react";
import { Outlet } from "@tanstack/react-router";
import { useYear } from "@/lib/YearContext";
import logo from "@/assets/logo-lobar.png";
import logoKemdikbud from "@/assets/logo-kemdikbud.png";
import { NavigationFAB } from "./NavigationFAB";
import { ThemeToggle } from "./ThemeToggle";
import { Intro } from "./Intro";

export default function Layout() {
  const [showIntro, setShowIntro] = useState(true);
  const { selectedYear, setSelectedYear } = useYear();

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem("pbs_has_seen_intro");
    if (hasSeenIntro) {
      setShowIntro(false);
    }
  }, []);

  const handleEnter = () => {
    sessionStorage.setItem("pbs_has_seen_intro", "true");
    setShowIntro(false);
  };

  if (showIntro) {
    return <Intro onEnter={handleEnter} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header 
        className="fixed top-0 left-0 right-0 pt-8 pb-4 z-30 flex items-center justify-between px-6 md:px-12 shadow-lg"
        style={{ background: "linear-gradient(90deg, oklch(0.28 0.07 260) 0%, oklch(0.42 0.16 260) 100%)" }}
      >
        <div className="flex items-center gap-4 md:gap-5">
          <img src={logo} alt="Logo Lombok Barat" className="w-16 h-16 md:w-20 md:h-20 object-contain bg-white/95 rounded-2xl p-2 shadow-inner" />
          <div className="text-white">
            <h1 className="text-xl md:text-3xl font-black leading-tight tracking-wider">
              PEDULI
            </h1>
            <p className="text-[10px] md:text-xs text-white/80 font-medium tracking-wide leading-snug mt-1 mb-1.5">
              Sistem Data <span className="text-white font-black text-[11px] md:text-sm">PE</span>serta <span className="text-white font-black text-[11px] md:text-sm">D</span>idik Inkl<span className="text-white font-black text-[11px] md:text-sm">U</span>si <br className="md:hidden" /> <span className="text-white font-black text-[11px] md:text-sm">L</span>ombok Barat <span className="text-white font-black text-[11px] md:text-sm">I</span>nteraktif
            </p>
            <p className="text-[10px] md:text-xs text-white font-bold uppercase tracking-widest pt-1 border-t border-white/20 inline-block">
              Kabupaten Lombok Barat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <img src={logoKemdikbud} alt="Logo Kemendikdasmen" className="w-10 h-10 md:w-14 md:h-14 object-contain drop-shadow-[0_0_3px_rgba(255,255,255,0.8)] hidden sm:block" />
          <div className="hidden sm:flex items-center bg-white/10 text-white border border-white/20 rounded-full backdrop-blur-sm px-1">
            <span className="text-[10px] md:text-xs font-bold pl-3 pr-2 py-2">KEMENDIKDASMEN</span>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white/20 hover:bg-white/30 transition-colors border-none text-xs font-black outline-none cursor-pointer rounded-full px-3 py-1 mr-0.5 text-white shadow-inner appearance-none text-center"
              style={{ backgroundImage: "none" }}
            >
              {[2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y} className="text-foreground bg-background">{y}</option>
              ))}
            </select>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="pt-32 md:pt-[200px] min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <NavigationFAB />
      
      <footer className="py-8 px-6 text-center text-[11px] text-muted-foreground border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground/70 tracking-tighter text-lg italic">PEDULI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>v1.0.2 · 2026</span>
          </div>
          <p>© 2026 Pemerintah Kabupaten Lombok Barat · Bidang Pendidikan Dasar</p>
        </div>
      </footer>
    </div>
  );
}
