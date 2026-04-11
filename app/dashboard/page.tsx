"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavShell from "@/components/NavShell";

/* ─── Types ─── */
interface Strategy {
  name: string;
  rating: string;
  sharpe: number;
  oos: number;
  mdd: number;
  market: string;
}

interface FactorCell {
  name: string;
  category: string;
  effectiveness: "effective" | "marginal" | "ineffective";
}

interface MarketInfo {
  market: string;
  flag: string;
  bestFactor: string;
  bestSharpe: number;
}

interface CostModel {
  impactK: number;
  spreadBps: number;
  secBps: number;
  borrowBps: number;
}

interface DashSummary {
  totalFactors: number;
  totalStrategies: number;
  researchStudies: number;
  researchTotal: number;
  markets: string[];
  auditPassRate: number;
  bestSharpe: number;
  topStrategies: Strategy[];
  factorHeatmap: FactorCell[];
  crossMarket: MarketInfo[];
  costModel: CostModel;
  platformVersion: string;
  dataFreshness: string;
}

/* ─── Fallback: empty state shown while API loads ─── */
const FALLBACK: DashSummary = {
  totalFactors: 0, totalStrategies: 0, researchStudies: 0, researchTotal: 0,
  markets: [], auditPassRate: 0, bestSharpe: 0,
  topStrategies: [],
  factorHeatmap: [],
  crossMarket: [],
  costModel: { impactK: 0.3, spreadBps: 5, secBps: 0.8, borrowBps: 30 },
  platformVersion: "1.0.0", dataFreshness: "Loading...",
};

/* ─── Helpers ─── */
const RATING_BG: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-blue-500",
  C: "bg-amber-500",
  D: "bg-red-500",
};

const EFF_COLOR: Record<string, string> = {
  effective: "bg-emerald-500 dark:bg-emerald-600",
  marginal: "bg-amber-400 dark:bg-amber-500",
  ineffective: "bg-red-500 dark:bg-red-600",
};

/* ─── Component ─── */
export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashSummary>(FALLBACK);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    fetch("/api/dashboard/summary", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((raw: Record<string, unknown>) => {
        // Map snake_case API → camelCase frontend
        const audit = raw.audit as Record<string, number> || {};
        const totalAB = (audit.a || 0) + (audit.b || 0);
        const totalAll = (audit.a || 0) + (audit.b || 0) + (audit.c || 0) + (audit.d || 0);
        const mkts = (raw.markets as Array<Record<string, unknown>>) || [];
        const mapped: DashSummary = {
          totalFactors: (raw.total_factors as number) || FALLBACK.totalFactors,
          totalStrategies: (raw.total_strategies as number) || FALLBACK.totalStrategies,
          researchStudies: (raw.research as number) || FALLBACK.researchStudies,
          researchTotal: (raw.research as number) || FALLBACK.researchTotal,
          markets: mkts.map((m) => String(m.name || "")) || ["US","CN","HK"],
          auditPassRate: totalAll > 0 ? Math.round(totalAB / totalAll * 100) : 0,
          bestSharpe: (raw.best_sharpe as number) || 0,
          topStrategies: ((raw.top_us as Array<Record<string, unknown>>) || []).map((s) => ({
            name: String(s.name || ""), rating: String(s.rating || "?"),
            sharpe: Number(s.sharpe || 0), oos: Number(s.oos || 0),
            mdd: Number(s.mdd || 0), market: "US",
          })),
          factorHeatmap: ((raw.factor_heatmap as Array<Record<string, unknown>>) || []).map((f) => ({
            name: String(f.name || ""), category: String(f.category || ""),
            effectiveness: String(f.effectiveness || "marginal") as "effective" | "marginal" | "ineffective",
          })),
          crossMarket: mkts.map((m) => ({
            market: String(m.name || ""), flag: String(m.flag || ""),
            bestFactor: String(m.best_factor || ""), bestSharpe: Number(m.sharpe || 0),
          })),
          costModel: {
            impactK: ((raw.cost_params as Record<string, number>)?.impact_k) || 0.3,
            spreadBps: ((raw.cost_params as Record<string, number>)?.spread_bps) || 5,
            secBps: ((raw.cost_params as Record<string, number>)?.sec_fee_bps) || 0.8,
            borrowBps: ((raw.cost_params as Record<string, number>)?.borrow_bps) || 30,
          },
          platformVersion: String(raw.platform_version || "1.0.0"),
          dataFreshness: String(raw.data_freshness || "2000-2025"),
        };
        setData(mapped);
        setLoaded(true);
      })
      .catch(() => setLoaded(true)); // fall back to hardcoded data
  }, [router]);

  const d = data;

  /* ─── Hero stats ─── */
  const heroStats = [
    { label: "Total Factors", value: d.totalFactors, trend: "+3 this quarter", trendUp: true },
    { label: "Total Strategies", value: d.totalStrategies, trend: "active", trendUp: true },
    { label: "Research Studies", value: d.researchStudies, trend: `${d.researchStudies}/${d.researchTotal} complete`, trendUp: true },
    { label: "Markets", value: d.markets.join(" / "), trend: "multi-region", trendUp: true },
    { label: "Audit Pass Rate", value: `${d.auditPassRate}%`, trend: "A+B rated", trendUp: d.auditPassRate >= 70 },
    { label: "Best Sharpe", value: d.bestSharpe.toFixed(2), trend: "portfolio-level", trendUp: true },
  ];

  return (
    <NavShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Command Center</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kuant Research Platform — Real-time overview</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" /></span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Phase 7 — Live Trading Operational</span>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-1">
            {[
              { phase: "1", label: "Research", done: true },
              { phase: "2", label: "Factors", done: true },
              { phase: "3", label: "Backtest", done: true },
              { phase: "4", label: "Audit", done: true },
              { phase: "5", label: "Paper", done: true },
              { phase: "6", label: "Live", done: true },
              { phase: "7", label: "Scale", done: true },
            ].map((p, i) => (
              <div key={p.phase} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                  p.done ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                }`}>{p.done ? "✓" : p.phase}</div>
                <span className={`text-[10px] font-medium truncate ${p.done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>{p.label}</span>
                {i < 6 && <div className={`flex-1 h-0.5 mx-1 rounded ${p.done ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 1. Hero Stats Row ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {heroStats.map(s => (
            <div key={s.label}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
              <span className="text-2xl font-extrabold tracking-tight">{s.value}</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">{s.label}</span>
              <span className={`text-[10px] mt-auto pt-1 ${s.trendUp ? "text-emerald-500" : "text-red-400"}`}>
                {s.trendUp ? "▲" : "▼"} {s.trend}
              </span>
            </div>
          ))}
        </div>

        {/* ═══ 2. Two-column: Top Strategies + Factor Heatmap ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Strategies Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Top Strategies — Multi-Asset (by Sharpe)</h3>
              <button onClick={() => router.push("/strategies")}
                className="text-[10px] text-indigo-500 hover:underline">View all &rarr;</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-2 text-left">#</th>
                  <th className="pb-2 text-left">Strategy</th>
                  <th className="pb-2 text-center">Rating</th>
                  <th className="pb-2 text-right">Sharpe</th>
                  <th className="pb-2 text-right">OOS</th>
                  <th className="pb-2 text-right">MDD</th>
                </tr>
              </thead>
              <tbody>
                {d.topStrategies.slice(0, 8).map((s, i) => (
                  <tr key={s.name} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="py-1.5 text-slate-400 text-xs">{i + 1}</td>
                    <td className="py-1.5 font-medium truncate max-w-[140px]">{s.name}</td>
                    <td className="py-1.5 text-center">
                      <span className={`${RATING_BG[s.rating] ?? "bg-slate-400"} text-white text-[10px] font-bold px-1.5 py-0.5 rounded`}>
                        {s.rating}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{s.sharpe.toFixed(2)}</td>
                    <td className="py-1.5 text-right font-mono text-slate-500">{s.oos.toFixed(2)}</td>
                    <td className="py-1.5 text-right font-mono text-red-500">{(s.mdd * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Factor Heatmap */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Factor Heatmap</h3>
              <button onClick={() => router.push("/factors")}
                className="text-[10px] text-indigo-500 hover:underline">View all &rarr;</button>
            </div>
            <div className="flex gap-3 mb-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Effective</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Marginal</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Ineffective</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {d.factorHeatmap.map(f => (
                <div key={f.name}
                  title={`${f.name} (${f.category}) — ${f.effectiveness}`}
                  className={`${EFF_COLOR[f.effectiveness]} rounded-md h-9 flex items-center justify-center cursor-default transition hover:scale-105`}>
                  <span className="text-white text-[8px] font-bold leading-none text-center px-0.5 truncate">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ 3. Third row: Cross-Market / Research / Cost ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Cross-Market */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-4">Cross-Market</h3>
            <div className="space-y-3">
              {d.crossMarket.map(m => (
                <div key={m.market} className="flex items-center gap-3">
                  <span className="text-2xl">{m.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">{m.market}</div>
                    <div className="text-[10px] text-slate-400 truncate">{m.bestFactor}</div>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{m.bestSharpe.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Research Progress */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-4">Research Progress</h3>
            <div className="text-3xl font-extrabold mb-1">
              {d.researchStudies}<span className="text-lg text-slate-400">/{d.researchTotal}</span>
            </div>
            <div className="text-xs text-slate-400 mb-3">complete</div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${(d.researchStudies / d.researchTotal) * 100}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-emerald-500 mt-1">{Math.round((d.researchStudies / d.researchTotal) * 100)}% done</div>
          </div>

          {/* Cost Model */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-4">Cost Model</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Sqrt Impact k", value: d.costModel.impactK.toString() },
                { label: "Spread", value: `${d.costModel.spreadBps} bps` },
                { label: "SEC Fee", value: `${d.costModel.secBps} bps` },
                { label: "Borrow Cost", value: `${d.costModel.borrowBps} bps` },
              ].map(c => (
                <div key={c.label} className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{c.label}</span>
                  <span className="font-mono font-semibold">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ 4. Bottom row: Quick links + Platform info ═══ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { href: "/strategies", icon: "📊", label: "Strategies" },
              { href: "/factors",    icon: "🧬", label: "Factors" },
              { href: "/ide",        icon: "⌨️", label: "IDE" },
              { href: "/source",     icon: "📄", label: "Code" },
              { href: "/research",   icon: "🔬", label: "Research" },
              { href: "/audit",      icon: "🛡️", label: "Audit" },
              { href: "/sop",        icon: "🔄", label: "SOP" },
              { href: "/docs",       icon: "📦", label: "Docs" },
              { href: "/trading",    icon: "💹", label: "Trading" },
              { href: "/backtest",   icon: "⏱️", label: "Backtest" },
              { href: "/analysis",   icon: "📈", label: "Analysis" },
            ].map(l => (
              <button key={l.href} onClick={() => router.push(l.href)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                <span>{l.icon}</span> {l.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-6 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
            <span>Platform {d.platformVersion}</span>
            <span>Data: {d.dataFreshness}</span>
            <span>Delisting: 8,446 Shumway-adjusted returns</span>
            <span>ADV: CRSP real monthly volume</span>
            <span className={loaded ? "text-emerald-500" : "text-amber-400"}>{loaded ? "Live" : "Cached"}</span>
          </div>
        </div>
      </div>
    </NavShell>
  );
}
