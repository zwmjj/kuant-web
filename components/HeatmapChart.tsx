"use client";
import type { BacktestResult } from "@/lib/api";

type Props = { data: BacktestResult["heatmap"] };

function getColor(val: number | null, isDark: boolean): string {
  if (val === null) return isDark ? "#334155" : "#f1f5f9";
  if (val > 5) return "#16a34a";
  if (val > 2) return isDark ? "#166534" : "#4ade80";
  if (val > 0) return isDark ? "#14532d" : "#bbf7d0";
  if (val > -2) return isDark ? "#7f1d1d" : "#fecaca";
  if (val > -5) return isDark ? "#991b1b" : "#f87171";
  return "#dc2626";
}

function getTextColor(val: number | null): string {
  if (val === null) return "#94a3b8";
  return Math.abs(val) > 3 ? "white" : "#1e293b";
}

export default function HeatmapChart({ data }: Props) {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs w-full">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left text-slate-500 dark:text-slate-400 font-semibold">Year</th>
            {data.months.map((m) => (
              <th key={m} className="px-1.5 py-1.5 text-center text-slate-500 dark:text-slate-400 font-medium">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.years.map((year, yi) => (
            <tr key={year}>
              <td className="px-2 py-1 font-bold text-slate-700">{year}</td>
              {data.values[yi]?.map((val, mi) => (
                <td key={mi}
                  className="px-1 py-1 text-center"
                  style={{ backgroundColor: getColor(val, isDark), color: getTextColor(val) }}
                  title={val !== null ? `${val.toFixed(1)}%` : "N/A"}>
                  {val !== null ? val.toFixed(1) : "\u2014"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
