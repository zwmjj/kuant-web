"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStrategies, type Strategy } from "@/lib/api";
import NavShell from "@/components/NavShell";

const CAT_COLORS: Record<string, string> = {
  "Price Momentum": "#6366f1",
  "Fundamental Value": "#ec4899",
  "Quality & Profitability": "#8b5cf6",
  "Low Volatility": "#06b6d4",
  Liquidity: "#14b8a6",
  "Earnings Surprise": "#f59e0b",
  "Multi-Factor": "#a855f7",
  "Alternative Data": "#f97316",
  "Macro & Regime": "#64748b",
  "A-Share": "#ef4444",
  "HK": "#f59e0b",
};

export default function StrategiesPage() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    getStrategies()
      .then(({ strategies: s }) => setStrategies(s))
      .catch(() => setStrategies([]))
      .finally(() => setLoading(false));
  }, [router]);

  const grouped: Record<string, Strategy[]> = {};
  strategies.forEach((s) => { if (!grouped[s.cat]) grouped[s.cat] = []; grouped[s.cat].push(s); });

  if (loading) {
    return <NavShell><div className="flex items-center justify-center h-[80vh] text-slate-400">Loading...</div></NavShell>;
  }

  return (
    <NavShell>
      <div className="max-w-6xl mx-auto px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Strategy Library</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {strategies.length} strategies across {Object.keys(grouped).length} categories.
            Click to run backtest.
          </p>
        </div>
        {Object.entries(grouped).map(([cat, strats]) => (
          <div key={cat} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[cat] || "#64748b" }} />
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wide">{cat}</h2>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{strats.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {strats.map((s) => {
                const disabled = !!s.needs_data;
                return (
                  <button key={s.id} disabled={disabled} onClick={() => router.push(`/backtest?s=${s.id}`)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      disabled
                        ? "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-50 cursor-not-allowed"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                    }`}>
                    <div className="flex items-start gap-2">
                      <span className="text-2xl leading-none">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{s.name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">{s.desc}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">IC {s.ic}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{s.hold}</span>
                      {s.tags.map((t) => (
                        <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded ${
                          t.startsWith("Needs") ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                            : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400"
                        }`}>{t}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </NavShell>
  );
}
