"use client";
import { useEffect, useState } from "react";
import type { KPI } from "@/lib/api";

// Colors that are "neutral" (not green/red) — need theme-aware switching
const NEUTRAL_COLORS = new Set(["#e2e8f0", "#0f172a", "#000000", "#000", "black"]);

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export default function KpiGrid({ kpis }: { kpis: KPI[] }) {
  const isDark = useIsDark();

  const resolveColor = (color: string) => {
    if (NEUTRAL_COLORS.has(color) || !color) {
      return isDark ? "#e2e8f0" : "#0f172a"; // light text on dark, dark text on light
    }
    return color; // green/red/etc stay as-is
  };

  return (
    <div className="grid grid-cols-6 gap-2 mb-3">
      {kpis.map((k, i) => (
        <div key={i} className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-center
                                shadow-sm hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
             title={k.tooltip}>
          <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{k.label}</div>
          <div className="text-base font-extrabold tabular-nums" style={{ color: resolveColor(k.color) }}>{k.value}</div>
          {k.vs_text && <div className="text-[9px] text-slate-400 mt-0.5">{k.vs_text}</div>}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500
                          opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl" />
        </div>
      ))}
    </div>
  );
}
