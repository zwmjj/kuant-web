"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { SensitivityResult } from "@/lib/api";

type Props = { data: SensitivityResult; currentValue?: number };

const CHARTS: { key: string; label: string; color: string; fmt: (v: number) => string }[] = [
  { key: "sharpe", label: "Sharpe Ratio", color: "#6366f1", fmt: (v) => v.toFixed(2) },
  { key: "sortino", label: "Sortino Ratio", color: "#8b5cf6", fmt: (v) => v.toFixed(2) },
  { key: "cagr", label: "CAGR (%)", color: "#059669", fmt: (v) => `${v.toFixed(1)}%` },
  { key: "mdd", label: "Max Drawdown (%)", color: "#dc2626", fmt: (v) => `${v.toFixed(1)}%` },
];

const PARAM_LABELS: Record<string, string> = {
  w_mom: "Momentum Weight", w_accel: "Acceleration Weight",
  w_quality: "Quality Weight", w_vol: "Low-Vol Weight",
  long_n: "Long Count", short_n: "Short Count",
  turnover_penalty: "Turnover Penalty", cost_bps: "Cost (bps)",
};

export default function SensitivityPanel({ data, currentValue }: Props) {
  if (!data.results.length) return <div className="text-slate-400 p-4">No results</div>;

  const paramLabel = PARAM_LABELS[data.param_name] || data.param_name;

  return (
    <div>
      <div className="text-xs font-bold text-slate-500 mb-3">
        Sensitivity to <span className="text-indigo-600">{paramLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {CHARTS.map((c) => (
          <div key={c.key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800">
            <div className="text-[10px] font-bold text-slate-500 mb-1">{c.label}</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.results} margin={{ top: 5, right: 15, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="value" tick={{ fontSize: 10 }} label={{ value: paramLabel, fontSize: 10, position: "insideBottom", offset: -2 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: unknown) => c.fmt(Number(v))} labelFormatter={(l) => `${paramLabel}: ${l}`} />
                {currentValue !== undefined && (
                  <ReferenceLine x={currentValue} stroke="#f59e0b" strokeDasharray="5 5"
                    label={{ value: "Current", fill: "#f59e0b", fontSize: 9 }} />
                )}
                {c.key === "sharpe" && <ReferenceLine y={1} stroke="#05966950" strokeDasharray="3 3" />}
                {c.key === "sortino" && <ReferenceLine y={1.5} stroke="#05966950" strokeDasharray="3 3" />}
                <Line type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} dot={{ r: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Data table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="text-right p-1.5">{paramLabel}</th>
              <th className="text-right p-1.5">Sharpe</th>
              <th className="text-right p-1.5">Sortino</th>
              <th className="text-right p-1.5">CAGR</th>
              <th className="text-right p-1.5">MaxDD</th>
              <th className="text-right p-1.5">Calmar</th>
              <th className="text-right p-1.5">Alpha</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((r) => (
              <tr key={r.value}
                className={`border-b border-slate-100 dark:border-slate-700 ${currentValue !== undefined && r.value === currentValue ? "bg-amber-50 font-bold" : "hover:bg-slate-50"}`}>
                <td className="p-1.5 text-right">{r.value}</td>
                <td className="p-1.5 text-right">{r.sharpe}</td>
                <td className="p-1.5 text-right">{r.sortino}</td>
                <td className="p-1.5 text-right">{r.cagr}%</td>
                <td className="p-1.5 text-right text-red-500">{r.mdd}%</td>
                <td className="p-1.5 text-right">{r.calmar}</td>
                <td className="p-1.5 text-right">{r.alpha}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
