import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, BarChart3, Map, Activity, Footprints, Users, Database } from "lucide-react";
import { Button } from "./ui/button";
import { DataUpdateDialog } from "./DataUpdateDialog";

const NAV = [
  { to: "/", label: "Dashboard Utama", icon: <BarChart3 className="w-5 h-5" /> },
  { to: "/spm", label: "Capaian SPM", icon: <Activity className="w-5 h-5" /> },
  { to: "/kecamatan", label: "Peta Kecamatan", icon: <Map className="w-5 h-5" /> },
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
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-5">
      {/* Menu items overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/20 backdrop-blur-[2px] z-[-1]" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu items */}
      <div 
        className={`flex flex-col items-end gap-4 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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

      <DataUpdateDialog open={showUpdate} onOpenChange={setShowUpdate} />
    </div>
  );
}
