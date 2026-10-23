import React, { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, Bot, ShieldCheck, AlertCircle } from "lucide-react";

export interface CaptchaData {
  num1: number;
  num2: number;
  op: "+" | "-" | "×";
  answer: number;
  displayText: string;
}

export function generateMathCaptcha(): CaptchaData {
  const operations: Array<"+" | "-" | "×"> = ["+", "-", "×"];
  const op = operations[Math.floor(Math.random() * operations.length)];
  let num1 = 0;
  let num2 = 0;
  let answer = 0;

  if (op === "+") {
    num1 = Math.floor(Math.random() * 15) + 3; // 3 - 17
    num2 = Math.floor(Math.random() * 12) + 2; // 2 - 13
    answer = num1 + num2;
  } else if (op === "-") {
    num1 = Math.floor(Math.random() * 15) + 12; // 12 - 26
    num2 = Math.floor(Math.random() * 9) + 2;  // 2 - 10
    answer = num1 - num2;
  } else {
    // Perkalian kecil
    num1 = Math.floor(Math.random() * 6) + 2; // 2 - 7
    num2 = Math.floor(Math.random() * 5) + 2; // 2 - 6
    answer = num1 * num2;
  }

  return {
    num1,
    num2,
    op,
    answer,
    displayText: `${num1} ${op} ${num2} = ?`,
  };
}

export function useMathCaptcha() {
  const [captcha, setCaptcha] = useState<CaptchaData>(generateMathCaptcha);
  const [inputVal, setInputVal] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setCaptcha(generateMathCaptcha());
    setInputVal("");
    setError(null);
  }, []);

  const verify = useCallback((): boolean => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setError("Silakan isi jawaban verifikasi aritmatika!");
      return false;
    }
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed !== captcha.answer) {
      setError(`Jawaban salah! Silakan hitung ulang.`);
      refresh();
      return false;
    }
    setError(null);
    return true;
  }, [inputVal, captcha.answer, refresh]);

  return {
    captcha,
    inputVal,
    setInputVal,
    error,
    setError,
    refresh,
    verify,
  };
}

interface MathCaptchaBoxProps {
  captcha: CaptchaData;
  inputVal: string;
  setInputVal: (val: string) => void;
  onRefresh: () => void;
  error?: string | null;
  dark?: boolean;
  label?: string;
}

export function MathCaptchaBox({
  captcha,
  inputVal,
  setInputVal,
  onRefresh,
  error,
  dark = false,
  label = "Verifikasi Anti-Bot AI (Aritmatika)",
}: MathCaptchaBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Bersihkan canvas
    ctx.clearRect(0, 0, width, height);

    // Latar belakang dengan sudut melengkung
    ctx.fillStyle = dark ? "#1e293b" : "#f1f5f9";
    ctx.fillRect(0, 0, width, height);

    // Garis noise anti-OCR (membingungkan bot OCR tapi tetap terbaca manusia)
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = dark
        ? `rgba(56, 189, 248, ${0.15 + Math.random() * 0.25})`
        : `rgba(2, 132, 199, ${0.2 + Math.random() * 0.25})`;
      ctx.lineWidth = 1.2 + Math.random() * 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 20, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height,
        width - Math.random() * 20, Math.random() * height
      );
      ctx.stroke();
    }

    // Titik-titik noise
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = dark
        ? `rgba(148, 163, 184, ${0.25 + Math.random() * 0.3})`
        : `rgba(100, 116, 139, ${0.25 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        0.8 + Math.random() * 1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Tulis persamaan matematika
    ctx.font = "bold 21px 'Courier New', monospace";
    ctx.fillStyle = dark ? "#38bdf8" : "#0284c7";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    ctx.save();
    ctx.translate(width / 2, height / 2);
    // Kemiringan halus (-3 sampai +3 derajat)
    const angle = (Math.random() - 0.5) * 0.1;
    ctx.rotate(angle);
    ctx.fillText(captcha.displayText, 0, 0);
    ctx.restore();
  }, [captcha, dark]);

  return (
    <div
      className={`rounded-2xl p-3 border transition-all ${
        dark
          ? "bg-slate-900/60 border-sky-500/20 text-slate-200"
          : "bg-muted/40 border-border text-foreground"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
          <Bot className="w-3.5 h-3.5 text-primary" />
          {label}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className={`text-[11px] font-medium flex items-center gap-1 hover:underline cursor-pointer ${
            dark ? "text-sky-400" : "text-primary"
          }`}
          title="Ganti soal perhitungan aritmatika"
        >
          <RefreshCw className="w-3 h-3" />
          Acak Soal
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Gambar Canvas Captcha (Anti-Bot Scraper) */}
        <div
          className={`relative rounded-xl overflow-hidden border shadow-inner shrink-0 ${
            dark ? "border-sky-500/30" : "border-border"
          }`}
        >
          <canvas
            ref={canvasRef}
            width={150}
            height={40}
            className="block cursor-pointer select-none"
            onClick={onRefresh}
            title="Klik untuk acak soal"
          />
        </div>

        {/* Input Jawaban */}
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="numeric"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Jawaban?"
            className={`w-full py-2 px-3 text-center rounded-xl text-sm font-mono font-bold outline-none transition-all border ${
              error
                ? "border-rose-500 bg-rose-500/10 focus:ring-2 focus:ring-rose-500/40"
                : dark
                ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
                : "bg-background border-border text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/40"
            }`}
          />
        </div>
      </div>

      {error ? (
        <div className="mt-2 text-[11px] text-rose-500 dark:text-rose-400 font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-muted-foreground italic">
          Ketik hasil hitungan di atas untuk memastikan verifikasi pengguna manusia.
        </p>
      )}
    </div>
  );
}
