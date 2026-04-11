"use client";
import { useState } from "react";

type Row = { metric: string; value: string; compare_value?: string };

export default function StatsTable({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState("");
  const filtered = rows.filter((r) => r.metric.toLowerCase().includes(filter.toLowerCase()));
  const hasCompare = rows.some((r) => r.compare_value);

  return (
    <div>
      <input
        type="text" placeholder="Filter metrics..." value={filter} onChange={(e) => setFilter(e.target.value)}
        className="w-full max-w-xs px-3 py-2 mb-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100
                   focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none"
      />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-semibold text-xs">Metric</th>
            <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-semibold text-xs">Value</th>
            {hasCompare && <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-semibold text-xs">Compare</th>}
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={i} className={`border-b border-slate-100 dark:border-slate-700 ${i % 2 ? "bg-slate-50/50 dark:bg-slate-700/30" : ""}`}>
              <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400">{r.metric}</td>
              <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">{r.value}</td>
              {hasCompare && <td className="py-1.5 px-3 font-medium text-pink-600 dark:text-pink-400">{r.compare_value || "\u2014"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
