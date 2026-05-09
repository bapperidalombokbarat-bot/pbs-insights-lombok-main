import { useState, useEffect } from "react";
import logoBlue from "@/assets/logo-lobar-blue.png";

interface IntroProps {
  onEnter: () => void;
}

export function Intro({ onEnter }: IntroProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0f172a] text-slate-100 font-['Poppins']">
      {/* Latar Belakang Data Animasi */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56, 189, 248, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Animasi Gradient Latar */}
      <div className="absolute -top-[100px] -left-[100px] w-[400px] h-[400px] bg-[#0284c7] rounded-full blur-[100px] opacity-30 animate-pulse pointer-events-none" />
      <div className="absolute -bottom-[200px] -right-[100px] w-[500px] h-[500px] bg-[#3b82f6] rounded-full blur-[100px] opacity-30 animate-pulse delay-1000 pointer-events-none" />

      {/* Konten Utama */}
      <div 
        className={`relative z-10 p-8 md:p-14 rounded-3xl w-full max-w-lg text-center mx-4 bg-slate-800/40 backdrop-blur-2xl border border-white/10 shadow-2xl transition-all duration-1000 ease-out transform ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        {/* Ornamen Sudut */}
        <div className="absolute top-[-2px] left-[-2px] w-8 h-8 border-t-2 border-l-2 border-sky-400 rounded-tl-xl" />
        <div className="absolute top-[-2px] right-[-2px] w-8 h-8 border-t-2 border-r-2 border-sky-400 rounded-tr-xl" />
        <div className="absolute bottom-[-2px] left-[-2px] w-8 h-8 border-b-2 border-l-2 border-sky-400 rounded-bl-xl" />
        <div className="absolute bottom-[-2px] right-[-2px] w-8 h-8 border-b-2 border-r-2 border-sky-400 rounded-br-xl" />

        {/* Header Label */}
        <div className="animate-text-1 inline-block mb-8 px-4 py-1.5 rounded-full bg-blue-900/50 border border-blue-400/30 text-blue-300 text-xs md:text-sm font-semibold tracking-wider uppercase">
            Data PBS Kemendikdasmen
        </div>

        {/* Animasi Logo */}
        <div className="logo-wrapper mx-auto mb-8 w-32 h-32 md:w-40 md:h-40 flex items-center justify-center relative">
            <div className="logo-glow absolute inset-0 bg-sky-400/20 blur-3xl rounded-full" />
            <img 
                src={logoBlue} 
                alt="Logo Kabupaten Lombok Barat" 
                className="main-logo max-h-full max-w-full object-contain relative z-10"
            />
        </div>

        {/* Judul Aplikasi */}
        <h1 className="animate-text-2 text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-300">
            Dashboard PBS
        </h1>
        
        {/* Subjudul Daerah */}
        <h2 className="animate-text-3 text-lg md:text-xl text-slate-400 mb-10 font-light">
            Kabupaten Lombok Barat
        </h2>

        {/* Tombol / Indikator Masuk */}
        <div className="animate-button">
            <button 
                onClick={onEnter}
                className="group relative px-8 py-3 w-full bg-gradient-to-r from-blue-600 to-sky-500 rounded-lg font-semibold text-white overflow-hidden shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] hover:-translate-y-1"
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    Masuk ke Dashboard
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </span>
                {/* Efek kilau pada tombol */}
                <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer transition-transform duration-1000"></div>
            </button>
        </div>

        {/* Footer Kecil */}
        <div className="animate-button mt-8 text-xs text-slate-500">
            Sistem Informasi Pengelolaan Data Pendidikan<br/>
            &copy; 2026 Kemendikdasmen
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
            100% { transform: translateX(100%); }
        }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
        }
        @keyframes pulseGlow {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0.8; }
        }
        @keyframes fadeUpContainer {
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUpText {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-text-1 { opacity: 0; animation: fadeUpText 0.8s ease forwards 0.5s; }
        .animate-text-2 { opacity: 0; animation: fadeUpText 0.8s ease forwards 0.7s; }
        .animate-text-3 { opacity: 0; animation: fadeUpText 0.8s ease forwards 0.9s; }
        .animate-button { opacity: 0; animation: fadeUpText 0.8s ease forwards 1.1s; }
        
        .logo-wrapper { animation: float 4s ease-in-out infinite; }
        .logo-glow { animation: pulseGlow 2s infinite alternate; }
        .group:hover .group-hover\\:animate-shimmer { animation: shimmer 1s infinite; }
      `}} />
    </div>
  );
}
