"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import NavShell from "@/components/NavShell";
import { getFactors, type Factor, type FactorsData } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  effective: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  marginal: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  crowded: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  ineffective: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  effective: "bg-emerald-500",
  marginal: "bg-amber-500",
  crowded: "bg-orange-500",
  ineffective: "bg-red-500",
};

const CAT_COLORS: Record<string, string> = {
  "Momentum": "#6366f1", "Value": "#ec4899", "Quality": "#8b5cf6",
  "Investment": "#06b6d4", "Volatility": "#14b8a6", "Factor Model": "#f59e0b",
  "Interaction": "#a855f7", "Orthogonal": "#10b981", "Regime": "#64748b",
};

type SortKey = "name" | "category" | "sharpe" | "alpha" | "r2" | "oos_sharpe" | "decay" | "mdd" | "crowding" | "trend" | "status";

function CorrCell({ v }: { v: number | null }) {
  if (v == null) return <td className="text-[10px] text-center p-0.5 w-8 h-8 font-mono">—</td>;
  const abs = Math.abs(v);
  const r = v > 0 ? Math.round(abs * 200) : 0;
  const b = v < 0 ? Math.round(abs * 200) : 0;
  const a = Math.min(abs * 1.2, 0.7);
  return (
    <td className="text-[10px] text-center p-0.5 w-8 h-8 font-mono"
      style={{ backgroundColor: `rgba(${r},${Math.round(abs*50)},${b},${a})`, color: abs > 0.5 ? 'white' : undefined }}>
      {v.toFixed(2)}
    </td>
  );
}

function SharpeBar({ sharpe, maxSharpe }: { sharpe: number; maxSharpe: number }) {
  const pct = maxSharpe > 0 ? Math.max(0, Math.min(100, (sharpe / maxSharpe) * 100)) : 0;
  const color = sharpe >= 0.9 ? "#10b981" : sharpe >= 0.5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function FactorsPage() {
  const router = useRouter();
  const [data, setData] = useState<FactorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "table" | "corr" | "tiers">("grid");
  const [catFilter, setCatFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("sharpe");
  const [sortAsc, setSortAsc] = useState(false);
  const [collapsedTiers, setCollapsedTiers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    getFactors()
      .then(setData)
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const statusCounts = useMemo(() => {
    if (!data) return { effective: 0, marginal: 0, ineffective: 0, crowded: 0 };
    const counts = { effective: 0, marginal: 0, ineffective: 0, crowded: 0 };
    data.factors.forEach(f => { if (f.status in counts) counts[f.status as keyof typeof counts]++; });
    return counts;
  }, [data]);

  const maxSharpe = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.factors.map(f => f.sharpe), 0.01);
  }, [data]);

  if (loading || !data) {
    return <NavShell><div className="flex items-center justify-center h-[80vh] text-slate-400">Loading factors...</div></NavShell>;
  }

  const categories = [...new Set(data.factors.map(f => f.category))];
  const filtered = catFilter === "all" ? data.factors : data.factors.filter(f => f.category === catFilter);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortAsc(!sortAsc); }
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortAsc ? cmp : -cmp;
  });

  // Tier grouping
  const tier1 = sorted.filter(f => f.sharpe > 0.9);
  const tier2 = sorted.filter(f => f.sharpe >= 0.5 && f.sharpe <= 0.9);
  const tier3 = sorted.filter(f => f.sharpe < 0.5);

  const toggleTier = (tier: string) => setCollapsedTiers(prev => ({ ...prev, [tier]: !prev[tier] }));

  const SortHeader = ({ label, k, align = "right" }: { label: string; k: SortKey; align?: string }) => (
    <th
      className={`p-3 font-medium cursor-pointer hover:text-indigo-500 transition select-none ${align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right"}`}
      onClick={() => handleSort(k)}
    >
      {label}{sortKey === k ? (sortAsc ? " \u25B2" : " \u25BC") : ""}
    </th>
  );

  return (
    <NavShell>
      <div className="max-w-7xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Factor Library</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {data.factors.length} factors analyzed. Full-sample 2000-2025, real costs + delisting returns.
            </p>
          </div>
          <div className="flex gap-1">
            {(["grid", "table", "tiers", "corr"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  view === v ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
                {v === "grid" ? "Cards" : v === "table" ? "Table" : v === "tiers" ? "Tiers" : "Correlation"}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats Bar */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {([
            { key: "effective", label: "Effective", color: "bg-emerald-500" },
            { key: "marginal", label: "Marginal", color: "bg-amber-500" },
            { key: "ineffective", label: "Ineffective", color: "bg-red-500" },
            { key: "crowded", label: "Crowded", color: "bg-orange-500" },
          ] as const).map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
              <span className={`${color} text-white text-xs font-bold rounded-md px-2 py-0.5 min-w-[28px] text-center`}>
                {statusCounts[key]}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          <button onClick={() => setCatFilter("all")}
            className={`text-xs px-2.5 py-1 rounded-full transition ${catFilter === "all" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>
            All ({data.factors.length})
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`text-xs px-2.5 py-1 rounded-full transition ${catFilter === c ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>
              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: CAT_COLORS[c] || "#64748b" }} />
              {c}
            </button>
          ))}
        </div>

        {/* Grid View */}
        {view === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sorted.map(f => (
              <div key={f.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm">{f.name}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[f.status]}`}>
                    {f.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 line-clamp-2">{f.description}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">Sharpe</div>
                    <div className={`text-sm font-bold ${(f.sharpe ?? 0) >= 1.0 ? "text-emerald-600" : (f.sharpe ?? 0) >= 0.8 ? "text-amber-600" : "text-red-500"}`}>
                      {f.sharpe != null ? f.sharpe.toFixed(2) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Alpha</div>
                    <div className={`text-sm font-bold ${(f.alpha ?? 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {f.alpha != null ? (f.alpha * 100).toFixed(1) : "—"}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">R&sup2;</div>
                    <div className={`text-sm font-bold ${(f.r2 ?? 0) < 0.6 ? "text-emerald-600" : (f.r2 ?? 0) < 0.75 ? "text-amber-600" : "text-red-500"}`}>
                      {f.r2 != null ? f.r2.toFixed(2) : "—"}
                    </div>
                  </div>
                </div>
                {/* Sharpe sparkline bar */}
                <SharpeBar sharpe={f.sharpe} maxSharpe={maxSharpe} />
                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                  <div>
                    <div className="text-[10px] text-slate-400">OOS</div>
                    <div className="text-xs font-semibold">{f.oos_sharpe != null ? f.oos_sharpe.toFixed(2) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">MaxDD</div>
                    <div className="text-xs font-semibold text-red-500">{f.mdd != null ? (f.mdd * 100).toFixed(0) : "—"}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Trend</div>
                    <div className="text-xs font-semibold">{f.trend}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{f.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{f.source}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    f.crowding === "low" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600" :
                    f.crowding === "medium" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600" :
                    "bg-red-50 dark:bg-red-900/30 text-red-600"
                  }`}>Crowd: {f.crowding}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table View */}
        {view === "table" && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-[0_1px_0_0] shadow-slate-200 dark:shadow-slate-700">
                <tr className="text-xs text-slate-500">
                  <SortHeader label="Factor" k="name" align="left" />
                  <SortHeader label="Category" k="category" align="left" />
                  <SortHeader label="Sharpe" k="sharpe" />
                  <SortHeader label="Alpha" k="alpha" />
                  <SortHeader label="R&sup2;" k="r2" />
                  <th className="text-right p-3 font-medium">IS</th>
                  <SortHeader label="OOS" k="oos_sharpe" />
                  <SortHeader label="Decay" k="decay" />
                  <SortHeader label="MaxDD" k="mdd" />
                  <SortHeader label="Crowd" k="crowding" align="center" />
                  <SortHeader label="Trend" k="trend" align="center" />
                  <SortHeader label="Status" k="status" align="center" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((f, i) => (
                  <tr key={f.id} className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${
                    i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/50" : ""
                  }`}>
                    <td className="p-3 font-medium">{f.name}</td>
                    <td className="p-3 text-slate-500 text-xs">{f.category}</td>
                    <td className={`p-3 text-right font-mono font-bold ${(f.sharpe ?? 0) >= 1.0 ? "text-emerald-600" : ""}`}>{f.sharpe != null ? f.sharpe.toFixed(2) : "—"}</td>
                    <td className={`p-3 text-right font-mono ${(f.alpha ?? 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>{f.alpha != null ? (f.alpha*100).toFixed(1) : "—"}%</td>
                    <td className={`p-3 text-right font-mono ${(f.r2 ?? 0) > 0.75 ? "text-red-500" : ""}`}>{f.r2 != null ? f.r2.toFixed(2) : "—"}</td>
                    <td className="p-3 text-right font-mono">{f.sharpe != null ? f.sharpe.toFixed(2) : "—"}</td>
                    <td className="p-3 text-right font-mono">{f.oos_sharpe != null ? f.oos_sharpe.toFixed(2) : "—"}</td>
                    <td className={`p-3 text-right font-mono ${(f.decay ?? 0) > 0.3 ? "text-red-500" : ""}`}>{f.decay != null ? (f.decay*100).toFixed(0) : "—"}%</td>
                    <td className="p-3 text-right font-mono text-red-500">{f.mdd != null ? (f.mdd*100).toFixed(0) : "—"}%</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        f.crowding === "low" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" :
                        f.crowding === "medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
                        "bg-red-100 dark:bg-red-900/30 text-red-600"}`}>{f.crowding}</span>
                    </td>
                    <td className="p-3 text-center text-xs">{f.trend}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[f.status]}`}>{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tier View */}
        {view === "tiers" && (
          <div className="space-y-4">
            {([
              { key: "tier1", label: "Tier 1 - Elite", desc: "Sharpe > 0.9", factors: tier1, color: "bg-emerald-500", border: "border-emerald-300 dark:border-emerald-700" },
              { key: "tier2", label: "Tier 2 - Viable", desc: "Sharpe 0.5 - 0.9", factors: tier2, color: "bg-amber-500", border: "border-amber-300 dark:border-amber-700" },
              { key: "tier3", label: "Tier 3 - Weak", desc: "Sharpe < 0.5", factors: tier3, color: "bg-red-500", border: "border-red-300 dark:border-red-700" },
            ] as const).map(({ key, label, desc, factors: tierFactors, color, border }) => (
              <div key={key} className={`bg-white dark:bg-slate-800 rounded-xl border ${border} overflow-hidden`}>
                <button
                  onClick={() => toggleTier(key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className={`${color} text-white text-sm font-bold rounded-lg px-3 py-1`}>{tierFactors.length}</span>
                    <div className="text-left">
                      <div className="font-bold text-sm">{label}</div>
                      <div className="text-[11px] text-slate-400">{desc}</div>
                    </div>
                  </div>
                  <span className="text-slate-400 text-sm">{collapsedTiers[key] ? "\u25B6" : "\u25BC"}</span>
                </button>
                {!collapsedTiers[key] && tierFactors.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/80">
                          <th className="text-left p-2.5 pl-4 font-medium">Factor</th>
                          <th className="text-left p-2.5 font-medium">Category</th>
                          <th className="text-right p-2.5 font-medium">Sharpe</th>
                          <th className="text-right p-2.5 font-medium">Alpha</th>
                          <th className="text-right p-2.5 font-medium">OOS</th>
                          <th className="text-right p-2.5 font-medium">MaxDD</th>
                          <th className="text-center p-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tierFactors.map((f, i) => (
                          <tr key={f.id} className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${
                            i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/50" : ""
                          }`}>
                            <td className="p-2.5 pl-4 font-medium text-xs">{f.name}</td>
                            <td className="p-2.5 text-slate-500 text-xs">{f.category}</td>
                            <td className={`p-2.5 text-right font-mono text-xs font-bold ${(f.sharpe ?? 0) >= 1.0 ? "text-emerald-600" : ""}`}>{f.sharpe != null ? f.sharpe.toFixed(2) : "—"}</td>
                            <td className={`p-2.5 text-right font-mono text-xs ${(f.alpha ?? 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>{f.alpha != null ? (f.alpha*100).toFixed(1) : "—"}%</td>
                            <td className="p-2.5 text-right font-mono text-xs">{f.oos_sharpe != null ? f.oos_sharpe.toFixed(2) : "—"}</td>
                            <td className="p-2.5 text-right font-mono text-xs text-red-500">{f.mdd != null ? (f.mdd*100).toFixed(0) : "—"}%</td>
                            <td className="p-2.5 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[f.status]}`}>{f.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!collapsedTiers[key] && tierFactors.length === 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-4 text-xs text-slate-400 text-center">
                    No factors in this tier (with current filter).
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Correlation View */}
        {view === "corr" && data.correlation && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 overflow-x-auto">
            <h3 className="text-sm font-bold mb-3">Factor Return Correlation Matrix</h3>
            <table className="mx-auto">
              <thead>
                <tr>
                  <th></th>
                  {data.correlation.labels.map(l => (
                    <th key={l} className="text-[9px] text-slate-500 p-1 -rotate-45 origin-bottom-left w-8">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.correlation.labels.map((label, i) => (
                  <tr key={label}>
                    <td className="text-[10px] text-right pr-2 text-slate-500 font-medium">{label}</td>
                    {data.correlation.values[i].map((v, j) => (
                      <CorrCell key={j} v={v} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-slate-400 mt-3 text-center">
              Red = positive correlation, Blue = negative. Low correlation pairs offer better diversification.
            </p>
          </div>
        )}
      </div>
    </NavShell>
  );
}
