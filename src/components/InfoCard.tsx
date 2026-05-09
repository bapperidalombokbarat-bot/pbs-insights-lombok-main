import { fmt } from "@/lib/db";

type Color = "primary" | "secondary" | "success" | "warning" | "danger";
const MAP: Record<Color, { border: string; bg: string }> = {
  primary:   { border: "oklch(0.5 0.18 260)",  bg: "oklch(0.95 0.05 260)" },
  secondary: { border: "oklch(0.55 0.22 295)", bg: "oklch(0.95 0.06 295)" },
  success:   { border: "oklch(0.62 0.15 160)", bg: "oklch(0.93 0.08 160)" },
  warning:   { border: "oklch(0.7 0.18 45)",   bg: "oklch(0.93 0.10 60)" },
  danger:    { border: "oklch(0.58 0.22 25)",  bg: "oklch(0.93 0.10 25)" },
};

export default function InfoCard({
  label, value, sub, icon, color = "primary",
}: { label: string; value: number | string | null; sub?: string; icon: string; color?: Color }) {
  return (
    <div 
      className="info-card" 
      style={{ 
        ["--accent-color" as any]: `var(--color-${color})`,
      }}
    >
      <div className="min-w-0">
        <div className="value">{typeof value === "number" ? fmt(value) : (value ?? "—")}</div>
        <div className="label">{label}</div>
        {sub && <div className="sub truncate" title={sub}>{sub}</div>}
      </div>
      <div 
        className="icon-box"
        style={{ 
          backgroundColor: `color-mix(in oklch, var(--color-${color}), transparent 85%)`,
          color: `var(--color-${color})`
        }}
      >
        {icon}
      </div>
    </div>
  );
}
