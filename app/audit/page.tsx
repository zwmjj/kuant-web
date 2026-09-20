"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import NavShell from "@/components/NavShell";
import { getAudit, type AuditStrategy, type AuditCheck, type AuditData } from "@/lib/api";

const RATING_COLORS: Record<string, string> = {
  A: "bg-emerald-500", B: "bg-blue-500", C: "bg-amber-500", D: "bg-red-500",
};

const RATING_BAR_COLORS: Record<string, string> = {
  A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#ef4444",
};

const GATE_NAMES = [
  "Sharpe > 1.0",
  "MDD > -25%",
  "Decay < 50%",
  "OOS > 0.5",
  "Calmar > 0.5",
  "DSR z > 1.0",
];

type SortKey = "name" | "rating" | "gates" | "sharpe" | "is_sharpe" | "oos_sharpe" | "decay" | "mdd" | "calmar" | "alpha" | "r2";

export default function AuditPage() {
  const router = useRouter();
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [riskMatrix, setRiskMatrix] = useState<any>(null);
  const [sortKey, setSortKey] = useState<SortKey>("sharpe");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    getAudit()
      .then(setData)
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  // Fetch risk matrix when strategy selected
  useEffect(() => {
    if (!selectedStrategy) { setRiskMatrix(null); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`/api/audit/risk-matrix/${encodeURIComponent(selectedStrategy)}`,
      { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (!d.error) setRiskMatrix(d); else setRiskMatrix(null); })
      .catch(() => setRiskMatrix(null));
  }, [selectedStrategy]);

  const ratingDist = useMemo(() => {
    if (!data) return { A: 0, B: 0, C: 0, D: 0 };
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    data.strategies.forEach(s => { counts[s.rating] = (counts[s.rating] || 0) + 1; });
    return counts;
  }, [data]);

  const maxRatingCount = useMemo(() => Math.max(...Object.values(ratingDist), 1), [ratingDist]);

  if (loading || !data) {
    return <NavShell><div className="flex items-center justify-center h-[80vh] text-slate-400">Loading audit...</div></NavShell>;
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortAsc(!sortAsc); }
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...data.strategies].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortAsc ? cmp : -cmp;
  });

  const selected = selectedStrategy ? data.strategies.find(s => s.name === selectedStrategy) : null;

  // Compute gate pass/fail for a strategy
  const computeGates = (s: AuditStrategy): boolean[] => [
    s.sharpe > 1.0,
    s.mdd > -0.25,
    s.decay < 0.5,
    s.oos_sharpe > 0.5,
    s.calmar > 0.5,
    (s as unknown as Record<string, number>).sortino > 1.0,
  ];

  const selectedGates = selected ? computeGates(selected) : null;
  const passCount = selectedGates ? selectedGates.filter(Boolean).length : 0;
  const failCount = selectedGates ? selectedGates.filter(g => !g).length : 0;

  const SortHeader = ({ label, k, align = "right" }: { label: string; k: SortKey; align?: string }) => (
    <th
      className={`p-3 font-medium cursor-pointer hover:text-indigo-500 transition select-none ${align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right"}`}
      onClick={() => handleSort(k)}
    >
      {label}{sortKey === k ? (sortAsc ? " \u25B2" : " \u25BC") : ""}
    </th>
  );

  // The strategy table is driven by final_push_results.json, which is not
  // committed to kuant-api. When it is absent the endpoint returns an empty
  // list and this page used to render a dashboard with no rows in it and a
  // "Last audit: live" header -- indistinguishable from a strategy set that
  // genuinely passed nothing. Say which one it is.
  const noStrategyData = !data.strategies || data.strategies.length === 0;

  return (
    <NavShell>
      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Audit Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {/* The API returns the literal string "live" here when it has no
                  dated result file, which read as a timestamp. Say what it is. */}
              Phase 3 + Phase 4 compliance.{" "}
              {data.date === "live" ? "Computed on request." : `Last audit: ${data.date}`}
            </p>
          </div>
          {/* Summary badges */}
          <div className="flex gap-2">
            {(["A", "B", "C", "D"] as const).map(r => (
              <div key={r} className="text-center">
                <div className={`${RATING_COLORS[r]} text-white text-lg font-bold rounded-lg w-10 h-10 flex items-center justify-center`}>
                  {data.summary[r.toLowerCase() as keyof typeof data.summary]}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{r}</div>
              </div>
            ))}
          </div>
        </div>

        {noStrategyData && (
          <div className="mb-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="font-semibold mb-1.5">No strategy results on this deployment</div>
            <div className="text-xs leading-relaxed opacity-90">
              The gate dashboard and the ranking table below are driven by
              <code className="mx-1">final_push_results.json</code>, which is not committed
              to <code>kuant-api</code>. The endpoint answered normally and returned an
              empty list. The Phase 3 / Phase 4 check results further down are static and
              are unaffected.
              <br />
              <br />
              An empty table here means the results file is absent, not that no strategy
              passed.
            </div>
          </div>
        )}

        {/* Strategy Selector + Gate Dashboard */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-5">
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gate Dashboard</h3>
            <select
              value={selectedStrategy || ""}
              onChange={e => setSelectedStrategy(e.target.value || null)}
              className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Select a strategy...</option>
              {data.strategies.map(s => (
                <option key={s.name} value={s.name}>{s.name} ({s.rating})</option>
              ))}
            </select>
          </div>
          {selected && selectedGates ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex gap-2">
                  {selectedGates.map((pass, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${pass ? "bg-emerald-500" : "bg-red-500"}`}>
                        {pass ? "\u2713" : "\u2717"}
                      </div>
                      <div className="text-[9px] text-slate-400 text-center max-w-[60px] leading-tight">{GATE_NAMES[i]}</div>
                    </div>
                  ))}
                </div>
                <div className="ml-auto flex gap-3 text-xs">
                  <span className="text-emerald-600 font-bold">{passCount} pass</span>
                  <span className="text-red-500 font-bold">{failCount} fail</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                <span className="font-medium">{selected.name}</span> &mdash;
                Rating <span className={`font-bold ${selected.rating === "A" ? "text-emerald-600" : selected.rating === "B" ? "text-blue-600" : selected.rating === "C" ? "text-amber-600" : "text-red-500"}`}>{selected.rating}</span>,
                Sharpe {selected.sharpe.toFixed(2)}, OOS {selected.oos_sharpe.toFixed(2)}, Sortino {selected.sortino.toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Select a strategy above to see its detailed gate results.</div>
          )}
        </div>

        {/* Risk Assessment Matrix (Likelihood × Impact) */}
        {riskMatrix?.risk_assessment && (() => {
          const ra = riskMatrix.risk_assessment;
          const rm = riskMatrix.risk_matrix || {};
          const ms = rm.monthly_stats || {};
          const LEVEL_COLORS: Record<string, string> = {
            HIGH: "bg-red-500", MEDIUM: "bg-amber-500", LOW: "bg-emerald-500",
          };
          const SCORE_BG: Record<number, string> = {
            9: "bg-red-600 text-white", 6: "bg-red-400 text-white",
            4: "bg-amber-400 text-slate-900", 3: "bg-amber-300 text-slate-900",
            2: "bg-emerald-200 text-slate-900", 1: "bg-emerald-100 text-slate-900",
          };
          return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Risk Assessment — {String(riskMatrix.name)}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`${LEVEL_COLORS[ra.overall_level]} text-white text-[10px] font-bold px-2 py-0.5 rounded`}>
                    {ra.overall_level}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Score: {ra.total_score}/{ra.max_score} ({ra.risk_pct}%)</span>
                </div>
              </div>

              {/* Risk table */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="text-left p-2 font-medium">Risk</th>
                      <th className="text-center p-2 font-medium w-24">Likelihood</th>
                      <th className="text-center p-2 font-medium w-20">Impact</th>
                      <th className="text-center p-2 font-medium w-20">Score</th>
                      <th className="text-center p-2 font-medium w-20">Level</th>
                      <th className="text-left p-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ra.risks.map((risk: any) => (
                      <tr key={risk.risk_id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{risk.risk_name}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3].map(n => (
                              <div key={n} className={`w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold ${
                                n <= risk.likelihood ? "bg-amber-400 text-slate-900" : "bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-600"
                              }`}>{n}</div>
                            ))}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3].map(n => (
                              <div key={n} className={`w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold ${
                                n <= risk.impact ? "bg-red-400 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-600"
                              }`}>{n}</div>
                            ))}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                            SCORE_BG[risk.score] || "bg-slate-200 text-slate-700"
                          }`}>{risk.score}</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`${LEVEL_COLORS[risk.level]} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>
                            {risk.level}
                          </span>
                        </td>
                        <td className="p-2 text-slate-500 dark:text-slate-400 text-[11px]">{risk.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quantitative risk metrics */}
              {rm.var_95 != null && (
                <div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Quantitative Metrics</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { l: "VaR 95%", v: `${(rm.var_95 * 100).toFixed(1)}%`, c: "text-red-500" },
                      { l: "CVaR 99%", v: `${(rm.cvar_99 * 100).toFixed(1)}%`, c: "text-red-600" },
                      { l: "Mkt Corr", v: rm.market_correlation?.toFixed(2), c: "text-slate-700 dark:text-slate-200" },
                      { l: "P/L Ratio", v: rm.profit_loss_ratio?.toFixed(2), c: "text-emerald-600" },
                      { l: "Max Loss Streak", v: `${rm.max_consecutive_loss}mo`, c: "text-amber-500" },
                      { l: "Win Rate", v: `${(ms.pct_positive * 100).toFixed(0)}%`, c: "text-slate-700 dark:text-slate-200" },
                      { l: "Best Month", v: `${(ms.best_month * 100).toFixed(1)}%`, c: "text-emerald-600" },
                      { l: "Worst Month", v: `${(ms.worst_month * 100).toFixed(1)}%`, c: "text-red-500" },
                    ].map(({ l, v, c }) => (
                      <div key={l} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                        <div className="text-[9px] text-slate-400 dark:text-slate-500">{l}</div>
                        <div className={`text-sm font-bold ${c}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Rating Distribution Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Rating Distribution</h3>
          <div className="space-y-2">
            {(["A", "B", "C", "D"] as const).map(r => (
              <div key={r} className="flex items-center gap-3">
                <span className={`${RATING_COLORS[r]} text-white text-[10px] font-bold w-6 h-6 rounded flex items-center justify-center`}>{r}</span>
                <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${(ratingDist[r] / maxRatingCount) * 100}%`,
                      backgroundColor: RATING_BAR_COLORS[r],
                      minWidth: ratingDist[r] > 0 ? "20px" : "0",
                    }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-bold text-white drop-shadow">
                    {ratingDist[r] > 0 ? ratingDist[r] : ""}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 w-8 text-right">{ratingDist[r]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost model info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cost Model</h3>
          <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span>Model: <b>{data.cost_model.model}</b></span>
            <span>Commission: <b>{data.cost_model.commission}bps</b></span>
            <span>Spread: <b>{data.cost_model.spread}bps</b></span>
            <span>Impact k: <b>{data.cost_model.impact}</b></span>
            <span>Borrow: <b>{data.cost_model.borrow}bps/yr</b></span>
            <span>SEC: <b>{data.cost_model.sec_fee}bps</b></span>
          </div>
        </div>

        {/* Phase 3 + 4 checks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {[
            { title: "Phase 3: Backtest Quality", checks: data.phase3_checks },
            { title: "Phase 4: Independent Review", checks: data.phase4_checks },
          ].map(({ title, checks }) => (
            <div key={title} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-bold mb-3">{title}</h3>
              <div className="space-y-2">
                {checks.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${
                      c.status === "PASS" ? "bg-emerald-500" : c.status === "WARN" ? "bg-amber-500" : "bg-red-500"
                    }`}>{c.status === "PASS" ? "\u2713" : c.status === "WARN" ? "!" : "\u2717"}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{c.name}</span>
                    <span className="text-slate-400 dark:text-slate-500 flex-1 text-right truncate">{c.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Strategy table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-[0_1px_0_0] shadow-slate-200 dark:shadow-slate-700">
              <tr className="text-xs text-slate-500">
                <SortHeader label="Strategy" k="name" align="left" />
                <SortHeader label="Rating" k="rating" align="center" />
                <SortHeader label="Gates" k="gates" align="center" />
                <SortHeader label="Sharpe" k="sharpe" />
                <SortHeader label="IS" k="is_sharpe" />
                <SortHeader label="OOS" k="oos_sharpe" />
                <SortHeader label="Decay" k="decay" />
                <SortHeader label="MaxDD" k="mdd" />
                <SortHeader label="Calmar" k="calmar" />
                <SortHeader label="Alpha" k="alpha" />
                <SortHeader label="R&sup2;" k="r2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr
                  key={s.name}
                  onClick={() => setSelectedStrategy(s.name)}
                  className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${
                    selectedStrategy === s.name
                      ? "bg-indigo-50 dark:bg-indigo-900/30"
                      : i % 2 === 1
                        ? "bg-slate-50/50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
                        : "hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
                  }`}
                >
                  <td className="p-3 font-medium text-xs">{s.name}</td>
                  <td className="p-3 text-center">
                    <span className={`${RATING_COLORS[s.rating]} text-white text-[10px] font-bold px-2 py-0.5 rounded`}>{s.rating}</span>
                  </td>
                  <td className="p-3 text-center text-xs">{s.gates}/6</td>
                  <td className={`p-3 text-right font-mono text-xs ${s.sharpe >= 1.0 ? "text-emerald-600 font-bold" : ""}`}>{s.sharpe.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono text-xs">{s.is_sharpe.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono text-xs">{s.oos_sharpe.toFixed(2)}</td>
                  <td className={`p-3 text-right font-mono text-xs ${s.decay > 0.3 ? "text-red-500" : ""}`}>{(s.decay * 100).toFixed(0)}%</td>
                  <td className="p-3 text-right font-mono text-xs text-red-500">{(s.mdd * 100).toFixed(0)}%</td>
                  <td className="p-3 text-right font-mono text-xs">{s.calmar.toFixed(2)}</td>
                  <td className={`p-3 text-right font-mono text-xs ${s.alpha > 0 ? "text-emerald-600" : "text-red-500"}`}>{(s.alpha*100).toFixed(1)}%</td>
                  <td className={`p-3 text-right font-mono text-xs ${s.r2 > 0.75 ? "text-red-500" : ""}`}>{s.r2.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </NavShell>
  );
}
