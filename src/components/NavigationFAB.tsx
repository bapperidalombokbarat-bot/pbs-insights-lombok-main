import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, BarChart3, Map, Activity, Footprints, Users, Database } from "lucide-react";
import { Button } from "./ui/button";
import { DataUpdateDialog } from "./DataUpdateDialog";

const NAV = [
  { to: "/", label: "Dashboard Utama", icon: <BarChart3 className="w-5 h-5" /> },
  { to: "/spm", label: "Rapor Pendidikan", icon: <Activity className="w-5 h-5" /> },
  { to: "/kecamatan", label: "Analis per Kecamatan", icon: <Map className="w-5 h-5" /> },
  { to: "/hambatan", label: "Analisa Hambatan", icon: <Activity className="w-5 h-5" /> },
  { to: "/alat-bantu", label: "Kebutuhan Alat", icon: <Footprints className="w-5 h-5" /> },
  { to: "/siswa", label: "Daftar Siswa", icon: <Users className="w-5 h-5" /> },
  { to: "#update", label: "Update Data", icon: <Database className="w-5 h-5" />, isAction: true },
];

export function NavigationFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const loc = useLocation();

  return (
    <>
      {/* Desktop Sub-Header Navigation */}
      <div 
        className="fixed top-[128px] left-0 right-0 h-14 z-20 hidden lg:flex items-center justify-center gap-3 shadow-md border-b border-black/10"
        style={{ background: "linear-gradient(90deg, oklch(0.32 0.08 260) 0%, oklch(0.46 0.17 260) 100%)" }}
      >
        {NAV.map((n) => {
          const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
          
          let shortLabel = n.label;
          if (n.to === "/") shortLabel = "Dashboard Utama";
          else if (n.to === "/spm") shortLabel = "Rapor Pendidikan";
          else if (n.to === "/kecamatan") shortLabel = "Pemetaan Kecamatan";
          else if (n.to === "/hambatan") shortLabel = "Jenis Hambatan";
          else if (n.to === "/alat-bantu") shortLabel = "Alat Bantu Khusus";
          else if (n.to === "/siswa") shortLabel = "Data Siswa";
          else if (n.to === "#update") shortLabel = "Unggah Data";

          const buttonClass = `px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 border border-transparent ${
            active 
              ? "bg-white/20 text-white border-white/10 shadow-sm" 
              : "text-white/75 hover:text-white hover:bg-white/10"
          }`;

          if ((n as any).isAction) {
            return (
              <button
                key={n.to}
                onClick={() => {
                  if (n.to === "#update") setShowUpdate(true);
                }}
                className={buttonClass + " cursor-pointer"}
              >
                <span className="opacity-95">{n.icon}</span>
                <span>{shortLabel}</span>
              </button>
            );
          }

          return (
            <Link
              key={n.to}
              to={n.to}
              className={buttonClass}
            >
              <span className="opacity-95">{n.icon}</span>
              <span>{shortLabel}</span>
            </Link>
          );
        })}
      </div>

      {/* Mobile/Tablet FAB Navigation */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-5 lg:hidden">
        {/* Menu items overlay */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-background/20 backdrop-blur-[2px] z-[-1]" 
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Menu items */}
        <div 
          className={`flex flex-col items-end gap-4 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] max-h-[calc(100vh-140px)] overflow-y-auto pr-2 scrollbar-none ${
            isOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-90 pointer-events-none"
          }`}
        >
          {NAV.map((n, idx) => {
            const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
            const content = (
              <>
                <span className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xl transition-all border backdrop-blur-md ${
                  active 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-card/90 text-foreground border-border group-hover:bg-accent"
                }`}>
                  {n.label}
                </span>
                <div 
                  className={`w-14 h-14 flex items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 ${
                    active 
                      ? "bg-primary text-primary-foreground scale-110 rotate-[5deg]" 
                      : "bg-card text-foreground hover:bg-accent border border-border group-hover:scale-105"
                  }`}
                  style={{ transitionDelay: `${isOpen ? (NAV.length - 1 - idx) * 40 : 0}ms` }}
                >
                  {n.icon}
                </div>
              </>
            );

            if ((n as any).isAction) {
              return (
                <div
                  key={n.to}
                  onClick={() => {
                    if (n.to === "#update") setShowUpdate(true);
                    setIsOpen(false);
                  }}
                  className="group flex items-center gap-4 outline-none cursor-pointer"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setIsOpen(false)}
                className="group flex items-center gap-4 outline-none"
              >
                {content}
              </Link>
            );
          })}
        </div>

        {/* Main FAB */}
        <Button
          size="icon"
          variant={isOpen ? "destructive" : "default"}
          className={`w-16 h-16 rounded-2xl shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 ${
            isOpen ? "rotate-180" : "bg-primary"
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </Button>
      </div>

      <DataUpdateDialog open={showUpdate} onOpenChange={setShowUpdate} />
    </>
  );
}
