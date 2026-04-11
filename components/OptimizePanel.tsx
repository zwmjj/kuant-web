"use client";
import type { OptimizeResult, OptimizeEntry } from "@/lib/api";

type Props = { data: OptimizeResult };

function heatColor(v: number, min: number, max: number): string {
  if (max === min) return "#e2e8f0";
  const t = (v - min) / (max - min);
  if (t > 0.75) return "#16a34a";
  if (t > 0.5) return "#4ade80";
  if (t > 0.25) return "#fde047";
  return "#f87171";
}

export default function OptimizePanel({ data }: Props) {
  if (!data.best) return <div className="text-slate-400 p-4">No results</div>;

  const b = data.best;

  // Build heatmap grid
  const hm = data.heatmap;
  const moms = [...new Set(hm.map((h) => h.w_mom))].sort((a, b) => a - b);
  const accels = [...new Set(hm.map((h) => h.w_accel))].sort((a, b) => a - b);
  const scoreMap = new Map(hm.map((h) => [`${h.w_mom}_${h.w_accel}`, h.score]));
  const scores = hm.map((h) => h.score);
  const sMin = Math.min(...scores);
  const sMax = Math.max(...scores);

  return (
    <div>
      {/* Best result highlight */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-4">
        <div className="text-xs font-bold text-indigo-500 tracking-wider mb-2">BEST CONFIGURATION</div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div><span className="text-slate-400 dark:text-slate-500">Mom</span> <span className="font-bold">{b.w_mom}</span></div>
          <div><span className="text-slate-400 dark:text-slate-500">Accel</span> <span className="font-bold">{b.w_accel}</span></div>
          <div><span className="text-slate-400 dark:text-slate-500">Quality</span> <span className="font-bold">{b.w_quality}</span></div>
          <div><span className="text-slate-400 dark:text-slate-500">Vol</span> <span className="font-bold">{b.w_vol}</span></div>
        </div>
        <div className="grid grid-cols-5 gap-3 mt-3 text-center">
          {[
            ["Sharpe", b.sharpe], ["Sortino", b.sortino], ["CAGR", `${b.cagr}%`],
            ["MaxDD", `${b.mdd}%`], ["Alpha", `${b.alpha}%`],
          ].map(([l, v]) => (
            <div key={String(l)}>
              <div className="text-[10px] text-slate-400">{l}</div>
              <div className="font-bold text-sm">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Top-10 table */}
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2">Top 10 ({data.total_evaluated} evaluated)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="text-left p-1.5">#</th>
                  <th className="text-right p-1.5">Mom</th>
                  <th className="text-right p-1.5">Acc</th>
                  <th className="text-right p-1.5">Qua</th>
                  <th className="text-right p-1.5">Vol</th>
                  <th className="text-right p-1.5">SR</th>
                  <th className="text-right p-1.5">CAGR</th>
                  <th className="text-right p-1.5">MDD</th>
                </tr>
              </thead>
              <tbody>
                {data.top_10.map((r: OptimizeEntry, i: number) => (
                  <tr key={i} className={`border-b border-slate-100 ${i === 0 ? "bg-indigo-50 font-bold" : "hover:bg-slate-50"}`}>
                    <td className="p-1.5">{i + 1}</td>
                    <td className="p-1.5 text-right">{r.w_mom}</td>
                    <td className="p-1.5 text-right">{r.w_accel}</td>
                    <td className="p-1.5 text-right">{r.w_quality}</td>
                    <td className="p-1.5 text-right">{r.w_vol}</td>
                    <td className="p-1.5 text-right">{r.sharpe}</td>
                    <td className="p-1.5 text-right">{r.cagr}%</td>
                    <td className="p-1.5 text-right text-red-500">{r.mdd}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Heatmap: w_mom vs w_accel */}
        <div>
          <div className="text-xs font-bold text-slate-500 mb-2">Score Heatmap (Mom x Accel)</div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[10px] w-full">
              <thead>
                <tr>
                  <th className="p-1 text-slate-400 dark:text-slate-500">Mom\Acc</th>
                  {accels.map((a) => (
                    <th key={a} className="p-1 text-center text-slate-500">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moms.map((m) => (
                  <tr key={m}>
                    <td className="p-1 font-bold text-slate-600">{m}</td>
                    {accels.map((a) => {
                      const v = scoreMap.get(`${m}_${a}`);
                      return (
                        <td key={a} className="p-1 text-center"
                          style={{
                            backgroundColor: v !== undefined ? heatColor(v, sMin, sMax) : "#f1f5f9",
                            color: v !== undefined && (v - sMin) / (sMax - sMin || 1) > 0.5 ? "white" : "#1e293b",
                          }}
                          title={v !== undefined ? `Score: ${v}` : "N/A"}>
                          {v !== undefined ? v : "\u2014"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
