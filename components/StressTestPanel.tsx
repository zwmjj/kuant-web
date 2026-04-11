"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { StressTestResult, StressScenario } from "@/lib/api";

type Props = { data: StressTestResult };

function retColor(v: number): string {
  if (v > 5) return "#059669";
  if (v > 0) return "#4ade80";
  if (v > -10) return "#f59e0b";
  return "#dc2626";
}

export default function StressTestPanel({ data }: Props) {
  if (data.error) return <div className="text-red-500 p-4">{data.error}</div>;
  if (!data.scenarios.length) return <div className="text-slate-400 p-4">No scenarios</div>;

  const available = data.scenarios.filter((s) => s.available);

  return (
    <div>
      {/* Summary table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left p-2">Scenario</th>
              <th className="text-left p-2">Period</th>
              <th className="text-right p-2">Mo</th>
              <th className="text-right p-2">Strategy</th>
              <th className="text-right p-2">SPY</th>
              <th className="text-right p-2">Excess</th>
              <th className="text-right p-2">Max DD</th>
            </tr>
          </thead>
          <tbody>
            {data.scenarios.map((s: StressScenario) => (
              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="p-2 font-bold">{s.name}</td>
                <td className="p-2 text-slate-500">{s.period}</td>
                {s.available ? (
                  <>
                    <td className="p-2 text-right">{s.months}</td>
                    <td className="p-2 text-right font-bold" style={{ color: retColor(s.strat_return!) }}>
                      {s.strat_return!.toFixed(1)}%
                    </td>
                    <td className="p-2 text-right text-slate-500">{s.spy_return!.toFixed(1)}%</td>
                    <td className={`p-2 text-right font-bold ${s.excess! >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {s.excess! >= 0 ? "+" : ""}{s.excess!.toFixed(1)}%
                    </td>
                    <td className="p-2 text-right text-red-500">{s.mdd!.toFixed(1)}%</td>
                  </>
                ) : (
                  <td colSpan={5} className="p-2 text-slate-400 italic">No data for this period</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mini equity charts */}
      {available.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2">Equity During Crises (Strategy vs SPY)</div>
          <div className="grid grid-cols-2 gap-3">
            {available.filter((s) => s.equity && s.equity.dates.length > 0).map((s) => {
              const chartData = s.equity!.dates.map((d, i) => ({
                date: d,
                Strategy: s.equity!.strategy[i],
                SPY: s.equity!.spy[i] ?? undefined,
              }));
              return (
                <div key={s.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800">
                  <div className="text-[10px] font-bold text-slate-600 mb-1">{s.name} ({s.period})</div>
                  <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={chartData} margin={{ top: 2, right: 10, bottom: 2, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 8 }} tickFormatter={(v) => v.slice(5, 7)} />
                      <YAxis tick={{ fontSize: 9 }} domain={["auto", "auto"]} tickFormatter={(v) => `${(v * 100 - 100).toFixed(0)}%`} />
                      <Tooltip formatter={(v: unknown) => `${((Number(v) - 1) * 100).toFixed(1)}%`} />
                      <Line type="monotone" dataKey="Strategy" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls />
                      <Line type="monotone" dataKey="SPY" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
