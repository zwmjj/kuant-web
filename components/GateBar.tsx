"use client";
import type { GateCheck } from "@/lib/api";

export default function GateBar({ gates, passed, total }: { gates: GateCheck[]; passed: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
      {gates.map((g, i) => (
        <span key={i} className={`text-[11px] font-bold px-3 py-1 rounded-full border
          ${g.passed
            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800"}`}>
          {g.passed ? "✓" : "✗"} {g.name}
        </span>
      ))}
      <span className={`text-[11px] font-bold ml-2 ${passed === total ? "text-emerald-600" : "text-slate-500"}`}>
        {passed === total ? "✓ Strategy Approved" : `${passed}/${total}`}
      </span>
    </div>
  );
}
