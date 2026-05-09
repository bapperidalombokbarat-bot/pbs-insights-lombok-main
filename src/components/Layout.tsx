import { useState, useEffect } from "react";
import { Outlet } from "@tanstack/react-router";
import logo from "@/assets/logo-lobar.png";
import { NavigationFAB } from "./NavigationFAB";
import { ThemeToggle } from "./ThemeToggle";
import { Intro } from "./Intro";

export default function Layout() {
  const [showIntro, setShowIntro] = useState(true);

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
        className="fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-6 md:px-12 shadow-lg"
        style={{ background: "linear-gradient(90deg, oklch(0.28 0.07 260) 0%, oklch(0.42 0.16 260) 100%)" }}
      >
        <div className="flex items-center gap-4">
          <img src={logo} alt="Logo Lombok Barat" className="w-10 h-10 object-contain bg-white/95 rounded-lg p-1 shadow-inner" />
          <div className="text-white">
            <h1 className="text-sm md:text-base font-bold leading-tight">
              PBS Dashboard
            </h1>
            <p className="text-[10px] md:text-xs text-white/60 font-medium uppercase tracking-wider">Kabupaten Lombok Barat · NTB</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] md:text-xs font-bold px-4 py-1.5 bg-white/10 text-white border border-white/20 rounded-full hidden sm:block backdrop-blur-sm">
            KEMENDIKDASMEN 2026
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <NavigationFAB />
      
      <footer className="py-8 px-6 text-center text-[11px] text-muted-foreground border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground/70 tracking-tighter text-lg italic">PBS INSIGHTS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>v1.0.2 · 2026</span>
          </div>
          <p>© 2026 Pemerintah Kabupaten Lombok Barat · Bidang Pendidikan Dasar</p>
        </div>
      </footer>
    </div>
  );
}
