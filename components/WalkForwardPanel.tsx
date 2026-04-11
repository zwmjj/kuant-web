"use client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import type { WalkForwardResult } from "@/lib/api";

type Props = { data: WalkForwardResult };

export default function WalkForwardPanel({ data }: Props) {
  if (data.error) return <div className="text-red-500 p-4">{data.error}</div>;
  if (!data.windows.length) return <div className="text-slate-400 p-4">No results</div>;

  const s = data.summary;

  // Bar chart: IS vs OOS Sharpe per window
  const barData = data.windows.map((w) => ({
    name: `W${w.window}`,
    "IS Sharpe": w.is_sharpe,
    "OOS Sharpe": w.oos_sharpe,
    label: w.oos_period,
  }));

  // Equity chart
  const eqData = data.oos_equity.dates.map((d, i) => ({
    date: d, value: data.oos_equity.values[i],
  }));

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {[
          ["Windows", s.total_windows],
          ["Avg IS SR", s.avg_is_sharpe],
          ["Avg OOS SR", s.avg_oos_sharpe],
          ["Decay", s.decay],
          ["Decay Ratio", s.decay_ratio],
        ].map(([label, val]) => (
          <div key={String(label)} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center border border-slate-200 dark:border-slate-600">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">{label}</div>
            <div className="text-lg font-bold text-slate-900">{val}</div>
          </div>
        ))}
      </div>

      {/* IS vs OOS bar chart */}
      <div className="mb-4">
        <div className="text-xs font-bold text-slate-500 mb-2">IS vs OOS Sharpe by Window</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <ReferenceLine y={1} stroke="#059669" strokeDasharray="5 5" />
            <Bar dataKey="IS Sharpe" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="OOS Sharpe" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* OOS equity curve */}
      {eqData.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-500 mb-2">Concatenated OOS Equity</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={eqData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(0, 7)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(1)}x`} />
              <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(2)}x`} />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Window detail table */}
      <div className="text-xs font-bold text-slate-500 mb-2">Window Details</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">IS Period</th>
              <th className="text-left p-2">OOS Period</th>
              <th className="text-right p-2">Best Weights</th>
              <th className="text-right p-2">IS SR</th>
              <th className="text-right p-2">OOS SR</th>
              <th className="text-right p-2">OOS CAGR</th>
              <th className="text-right p-2">OOS MDD</th>
            </tr>
          </thead>
          <tbody>
            {data.windows.map((w) => (
              <tr key={w.window} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="p-2 font-bold">{w.window}</td>
                <td className="p-2 text-slate-500">{w.is_period}</td>
                <td className="p-2 text-slate-500">{w.oos_period}</td>
                <td className="p-2 text-right font-mono">
                  {w.best_params.w_mom}/{w.best_params.w_accel}/{w.best_params.w_quality}/{w.best_params.w_vol}
                </td>
                <td className="p-2 text-right">{w.is_sharpe}</td>
                <td className={`p-2 text-right font-bold ${w.oos_sharpe >= 1 ? "text-green-600" : "text-red-500"}`}>
                  {w.oos_sharpe}
                </td>
                <td className="p-2 text-right">{w.oos_cagr}%</td>
                <td className="p-2 text-right text-red-500">{w.oos_mdd}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
