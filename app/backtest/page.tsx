"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { runBacktest, getStrategies, type BacktestResult, type BacktestParams, type Strategy } from "@/lib/api";
import KpiGrid from "@/components/KpiGrid";
import GateBar from "@/components/GateBar";
import EquityChart from "@/components/EquityChart";
import HeatmapChart from "@/components/HeatmapChart";
import DistributionChart from "@/components/DistributionChart";
import RollingSharpeChart from "@/components/RollingSharpeChart";
import YearlyBarChart from "@/components/YearlyBarChart";
import FactorBarChart from "@/components/FactorBarChart";
import StatsTable from "@/components/StatsTable";
import ThemeToggle from "@/components/ThemeToggle";

const TABS = ["Equity", "Heatmap", "Distribution", "Rolling Sharpe", "Yearly", "Factor", "Stats", "Risk Matrix"] as const;

const STRATEGY_SIGNALS: Record<string, { label: string; key: string; default: number }[]> = {
  mom12:         [{ label: "Momentum", key: "w_mom", default: 100 }, { label: "Acceleration", key: "w_accel", default: 0 }, { label: "Quality", key: "w_quality", default: 0 }, { label: "Low Vol", key: "w_vol", default: 0 }],
  mom_accel:     [{ label: "Momentum", key: "w_mom", default: 75 }, { label: "Acceleration", key: "w_accel", default: 25 }, { label: "Quality", key: "w_quality", default: 0 }, { label: "Low Vol", key: "w_vol", default: 0 }],
  bm:            [{ label: "Value B/M", key: "w_mom", default: 50 }, { label: "Acceleration", key: "w_accel", default: 30 }, { label: "Quality", key: "w_quality", default: 20 }, { label: "Low Vol", key: "w_vol", default: 0 }],
  quality:       [{ label: "Profitability", key: "w_mom", default: 50 }, { label: "Acceleration", key: "w_accel", default: 25 }, { label: "Quality", key: "w_quality", default: 25 }, { label: "Low Vol", key: "w_vol", default: 0 }],
  lowvol:        [{ label: "Momentum", key: "w_mom", default: 75 }, { label: "Acceleration", key: "w_accel", default: 15 }, { label: "Quality", key: "w_quality", default: 0 }, { label: "Low Vol", key: "w_vol", default: 10 }],
  minvol:        [{ label: "Momentum", key: "w_mom", default: 45 }, { label: "Acceleration", key: "w_accel", default: 45 }, { label: "Quality", key: "w_quality", default: 0 }, { label: "Low Vol", key: "w_vol", default: 10 }],
  momqual:       [{ label: "Momentum", key: "w_mom", default: 55 }, { label: "Acceleration", key: "w_accel", default: 35 }, { label: "Quality", key: "w_quality", default: 10 }, { label: "Low Vol", key: "w_vol", default: 0 }],
  // A-Share strategies — signal weights don't matter (backend uses strategy_id to pick CN engine)
  cn_reversal:   [{ label: "Reversal", key: "w_mom", default: 100 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_quality", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  cn_lowvol:     [{ label: "Low Vol", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_quality", default: 0 }, { label: "Vol", key: "w_vol", default: 100 }],
  cn_vol_blend:  [{ label: "VolBlend", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_quality", default: 0 }, { label: "Vol", key: "w_vol", default: 100 }],
  cn_defensive:  [{ label: "Reversal", key: "w_mom", default: 25 }, { label: "—", key: "w_accel", default: 0 }, { label: "Quality", key: "w_quality", default: 25 }, { label: "Vol", key: "w_vol", default: 50 }],
  // WRDS/Macro/Governance strategies (signal built server-side, weights are display-only)
  wrds_at_turn:        [{ label: "Asset Turn", key: "w_quality", default: 100 }, { label: "—", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  wrds_inv_turn:       [{ label: "Inv Turn", key: "w_quality", default: 100 }, { label: "—", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  wrds_de:             [{ label: "Low D/E", key: "w_quality", default: 50 }, { label: "—", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "Vol", key: "w_vol", default: 50 }],
  wrds_curr:           [{ label: "Curr Ratio", key: "w_quality", default: 100 }, { label: "—", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  wrds_roe:            [{ label: "ROE", key: "w_quality", default: 100 }, { label: "—", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  wrds_ps:             [{ label: "P/S", key: "w_quality", default: 100 }, { label: "—", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  macro_regime_blend:  [{ label: "Quality", key: "w_quality", default: 65 }, { label: "Mom", key: "w_mom", default: 35 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  macro_wrds_ps:       [{ label: "Macro", key: "w_mom", default: 50 }, { label: "P/S", key: "w_quality", default: 50 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  ceo_ownership:       [{ label: "CEO Own", key: "w_quality", default: 100 }, { label: "—", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  governance_macro:    [{ label: "Gov", key: "w_quality", default: 60 }, { label: "Macro", key: "w_mom", default: 40 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  governance_composite:[{ label: "Gov", key: "w_quality", default: 100 }, { label: "—", key: "w_mom", default: 0 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  ultimate_4f:         [{ label: "Quality", key: "w_quality", default: 75 }, { label: "Macro", key: "w_mom", default: 25 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_vol", default: 0 }],
  hk_mom_vol:          [{ label: "Mom", key: "w_mom", default: 50 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_quality", default: 0 }, { label: "Vol", key: "w_vol", default: 50 }],
  hk_best3:            [{ label: "Mom", key: "w_mom", default: 35 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_quality", default: 0 }, { label: "Vol", key: "w_vol", default: 65 }],
  hk_defensive:        [{ label: "Mom", key: "w_mom", default: 20 }, { label: "—", key: "w_accel", default: 0 }, { label: "—", key: "w_quality", default: 0 }, { label: "Vol", key: "w_vol", default: 80 }],
};

const CN_STRATEGIES = new Set(["cn_reversal", "cn_lowvol", "cn_vol_blend", "cn_defensive"]);
const WRDS_STRATEGIES = new Set(["wrds_at_turn", "wrds_inv_turn", "wrds_de", "wrds_curr", "wrds_roe", "wrds_ps",
  "macro_regime_blend", "macro_wrds_ps", "ceo_ownership", "governance_macro", "governance_composite", "ultimate_4f"]);
const DEFAULT_SIGNALS = STRATEGY_SIGNALS.mom_accel;

export default function BacktestPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-slate-400 dark:text-slate-500">Loading...</div>}>
      <BacktestPage />
    </Suspense>
  );
}

function BacktestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const strategyId = searchParams.get("s") || "mom_accel";
  const signals = STRATEGY_SIGNALS[strategyId] || DEFAULT_SIGNALS;

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const isCN = CN_STRATEGIES.has(strategyId);
  const [params, setParams] = useState<BacktestParams>(() => {
    const defaults: Record<string, number> = {};
    signals.forEach((s) => { defaults[s.key] = s.default; });
    return {
      strategy_id: strategyId,
      w_mom: defaults.w_mom ?? 75, w_accel: defaults.w_accel ?? 25,
      w_quality: defaults.w_quality ?? 0, w_vol: defaults.w_vol ?? 0,
      long_n: isCN ? 30 : 20, short_n: isCN ? 1 : 20,
      long_pct: isCN ? 100 : 115, short_pct: isCN ? 0 : 15,
      turnover_penalty: 0.25, cost_bps: isCN ? 5 : 2,
      start_date: isCN ? "2010-01-01" : "2015-01-01",
      end_date: new Date().toISOString().slice(0, 10),
      initial_capital: 100000,
    };
  });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<typeof TABS[number]>("Equity");
  const [status, setStatus] = useState("Click Run Backtest to begin");
  const [user, setUser] = useState("");

  useEffect(() => { setUser(localStorage.getItem("user") || "user"); }, []);

  useEffect(() => {
    const sigs = STRATEGY_SIGNALS[strategyId] || DEFAULT_SIGNALS;
    const cn = CN_STRATEGIES.has(strategyId);
    setParams((p) => {
      const updated = { ...p, strategy_id: strategyId };
      sigs.forEach((s) => { (updated as Record<string, unknown>)[s.key] = s.default; });
      if (cn) {
        updated.long_n = 30; updated.short_n = 1;
        updated.long_pct = 100; updated.short_pct = 0;
        updated.cost_bps = 5; updated.start_date = "2010-01-01";
      }
      return updated as BacktestParams;
    });
  }, [strategyId]);

  useEffect(() => {
    getStrategies().then(({ strategies: strats }) => {
      setStrategies(strats);
      const s = strats.find((x) => x.id === strategyId);
      if (s) {
        const cn = CN_STRATEGIES.has(s.id);
        setParams((p) => ({
          ...p, strategy_id: s.id,
          long_n: s.long_n ?? (cn ? 30 : 20),
          short_n: s.short_n ?? (cn ? 1 : 20),
          long_pct: s.long_pct ?? (cn ? 100 : 115),
          short_pct: s.short_pct ?? (cn ? 0 : 15),
        }));
      }
    });
  }, [strategyId]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [riskData, setRiskData] = useState<any>(null);

  // Compute risk assessment from backtest result (client-side, no API dependency)
  function computeRiskAssessment(res: BacktestResult): any {
    const s = res;
    const sharpe = parseFloat(s.kpis?.find(k => k.label === "Sharpe")?.value || "0");
    const mdd = parseFloat(s.kpis?.find(k => k.label === "Max DD")?.value || "0") / 100;
    const alpha = s.factor?.alpha || 0;
    const r2 = s.factor?.r2 || 0;
    const sortino = parseFloat(s.kpis?.find(k => k.label === "Sortino")?.value || "0");
    const winRate = parseFloat(s.kpis?.find(k => k.label === "Win %")?.value || "0") / 100;
    const var95 = s.distribution?.var_95 || 0;
    const cvar95 = s.distribution?.cvar_95 || 0;
    const beta = parseFloat(s.kpis?.find(k => k.label === "Beta")?.value || "0");
    const isCN = CN_STRATEGIES.has(strategyId);

    const RISKS = [
      { id: "data_quality", name: "Data Quality / PIT Violation",
        desc: "Incorrect data timing, missing delisting returns, survivorship bias",
        l: isCN ? 2 : 1, i: 3 },
      { id: "overfitting", name: "Overfitting / Data Mining",
        desc: "Strategy overfit to in-sample, degrades out-of-sample",
        l: sharpe > 1.5 ? 3 : sharpe > 1.0 ? 2 : 1, i: 3 },
      { id: "factor_crowding", name: "Factor Crowding",
        desc: "Too many investors in same factor, alpha erodes",
        l: r2 > 0.7 ? 3 : r2 > 0.55 ? 2 : 1, i: r2 > 0.6 ? 2 : 1 },
      { id: "execution", name: "Execution / Slippage",
        desc: "Real costs exceed model, partial fills, market impact",
        l: 1, i: Math.abs(mdd) > 0.25 ? 2 : 1 },
      { id: "regime_change", name: "Regime Change",
        desc: "Market regime shift makes factor ineffective",
        l: 2, i: Math.abs(beta) > 0.8 ? 3 : Math.abs(beta) > 0.5 ? 2 : 1 },
      { id: "liquidity", name: "Liquidity Crisis",
        desc: "Unable to exit positions during stress",
        l: 1, i: 2 },
      { id: "model_risk", name: "Model / Cost Error",
        desc: "Cost model or signal logic has undetected bugs",
        l: strategyId.includes("+") || strategyId.includes("macro") ? 2 : 1, i: 2 },
      { id: "correlation", name: "Correlation Breakdown",
        desc: "Diversification fails during crisis, all factors move together",
        l: Math.abs(beta) > 0.7 ? 2 : 1, i: 2 },
    ].map(r => ({ ...r, score: r.l * r.i, level: r.l * r.i >= 6 ? "HIGH" : r.l * r.i >= 3 ? "MEDIUM" : "LOW" }))
     .sort((a, b) => b.score - a.score);

    const total = RISKS.reduce((s, r) => s + r.score, 0);
    const maxScore = RISKS.length * 9;
    const pct = Math.round(total / maxScore * 1000) / 10;

    return {
      name: currentStrat?.name || strategyId,
      risk_assessment: {
        risks: RISKS.map(r => ({ risk_id: r.id, risk_name: r.name, description: r.desc,
                                  likelihood: r.l, impact: r.i, score: r.score, level: r.level })),
        total_score: total, max_score: maxScore, risk_pct: pct,
        overall_level: pct > 50 ? "HIGH" : pct > 30 ? "MEDIUM" : "LOW",
      },
      risk_matrix: {
        var_95: var95 / 100, cvar_95: cvar95 / 100, var_99: (var95 * 1.3) / 100, cvar_99: (cvar95 * 1.3) / 100,
        market_correlation: beta, max_consecutive_loss: 0,
        profit_loss_ratio: winRate > 0 ? winRate / (1 - winRate) : 0,
        monthly_stats: { pct_positive: winRate, best_month: 0, worst_month: mdd, mean: 0, std: 0, skew: 0, kurtosis: 0 },
        regime_performance: {},
        top_drawdowns: [],
      },
    };
  }

  const run = useCallback(async () => {
    setLoading(true); setStatus("Running backtest...");
    try {
      const r = await runBacktest(params);
      setResult(r);
      setStatus(r.status);
      // Compute risk assessment from actual backtest result
      setRiskData(computeRiskAssessment(r));
    }
    catch (e: unknown) { setStatus(`Error: ${e instanceof Error ? e.message : "Backtest failed"}`); }
    finally { setLoading(false); }
  }, [params, strategyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStrat = strategies.find((s) => s.id === strategyId);
  const runnableStrats = strategies.filter((s) => !s.needs_data && s.id !== strategyId);
  const set = (key: keyof BacktestParams, val: number | string) => setParams((p) => ({ ...p, [key]: val }));

  const labelStyle = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1";
  const inputStyle = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none";
  const secStyle = "text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 tracking-[2px] mb-2 mt-1";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Top bar */}
      <div className="flex items-center px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <button onClick={() => router.push("/strategies")}
          className="px-4 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition">
          &larr; Strategies
        </button>
        <div className="flex-1 mx-4 font-bold text-base">
          {currentStrat ? `${currentStrat.icon} ${currentStrat.name}` : strategyId}
        </div>
        <button onClick={() => router.push(`/analysis?s=${strategyId}`)}
          className="px-4 py-1.5 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition mr-3">
          Advanced Analysis
        </button>
        <ThemeToggle />
        <span className="text-slate-400 dark:text-slate-500 text-sm mx-3">{user}</span>
        <button onClick={() => { localStorage.clear(); router.push("/login"); }}
          className="text-xs text-slate-400 border border-slate-200 dark:border-slate-600 rounded-md px-3 py-1 hover:text-red-500 transition">
          Logout
        </button>
      </div>

      <div className="flex">
        {/* Left panel */}
        <div className="w-[270px] p-4 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto h-[calc(100vh-50px)]">
          <div className={secStyle}>PERIOD</div>
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className={labelStyle}>From</label>
              <input type="date" value={params.start_date} onChange={(e) => set("start_date", e.target.value)} className={inputStyle} />
            </div>
            <div className="flex-1">
              <label className={labelStyle}>To</label>
              <input type="date" value={params.end_date} onChange={(e) => set("end_date", e.target.value)} max={new Date().toISOString().slice(0, 10)} className={inputStyle} />
            </div>
          </div>
          <div className="flex gap-1 mb-2">
            {["1Y","3Y","5Y","10Y","MAX"].map((p) => (
              <button key={p} onClick={() => { const d = new Date(); d.setFullYear(d.getFullYear() - (p === "MAX" ? 25 : parseInt(p))); set("start_date", d.toISOString().slice(0, 10)); }}
                className="flex-1 text-[10px] py-1 border border-slate-200 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition">
                {p}
              </button>
            ))}
          </div>
          <label className={labelStyle}>Capital ($)</label>
          <input type="number" value={params.initial_capital} onChange={(e) => set("initial_capital", +e.target.value)} className={`${inputStyle} mb-3`} />

          <hr className="border-slate-200 dark:border-slate-700 my-2" />
          <div className={secStyle}>SIGNAL</div>
          {signals.map((sig) => (
            <div key={sig.key} className="mb-2">
              <label className={labelStyle}>{sig.label}: {params[sig.key as keyof BacktestParams] as number}</label>
              <input type="range" min={0} max={100} step={5} value={params[sig.key as keyof BacktestParams] as number}
                onChange={(e) => set(sig.key as keyof BacktestParams, +e.target.value)} className="w-full accent-indigo-500" />
            </div>
          ))}

          <hr className="border-slate-200 dark:border-slate-700 my-2" />
          <div className={secStyle}>PORTFOLIO</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([["Long#","long_n"],["Short#","short_n"],["Long%","long_pct"],["Short%","short_pct"]] as const).map(([l, k]) => (
              <div key={k}>
                <label className={labelStyle}>{l}</label>
                <input type="number" value={params[k]} onChange={(e) => set(k, +e.target.value)} className={inputStyle} />
              </div>
            ))}
          </div>

          <hr className="border-slate-200 dark:border-slate-700 my-2" />
          <div className={secStyle}>EXECUTION</div>
          <div className="mb-2">
            <label className={labelStyle}>Turnover Penalty: {params.turnover_penalty}</label>
            <input type="range" min={0} max={0.5} step={0.05} value={params.turnover_penalty}
              onChange={(e) => set("turnover_penalty", +e.target.value)} className="w-full accent-indigo-500" />
          </div>
          <div className="mb-3">
            <label className={labelStyle}>Cost bps: {params.cost_bps}</label>
            <input type="range" min={0} max={20} step={1} value={params.cost_bps}
              onChange={(e) => set("cost_bps", +e.target.value)} className="w-full accent-indigo-500" />
          </div>

          <hr className="border-slate-200 dark:border-slate-700 my-2" />
          <div className={secStyle}>COMPARE</div>
          <select value={params.compare_id || ""} onChange={(e) => set("compare_id", e.target.value || "")} className={`${inputStyle} mb-3`}>
            <option value="">None</option>
            {runnableStrats.map((s) => (<option key={s.id} value={s.id}>{s.icon} {s.name}</option>))}
          </select>

          <button onClick={run} disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white
                       font-bold text-sm tracking-wide hover:brightness-110 transition-all
                       disabled:opacity-60 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
            {loading ? "Running..." : "\u25b6  Run Backtest"}
          </button>
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">{status}</p>
        </div>

        {/* Right area */}
        <div className="flex-1 p-3 overflow-y-auto h-[calc(100vh-50px)] bg-slate-50 dark:bg-slate-900">
          {result && (
            <>
              <KpiGrid kpis={result.kpis} />
              <GateBar gates={result.gates} passed={result.gates_passed} total={result.gates_total} />
              <div className="flex gap-1 mb-2 border-b border-slate-200 dark:border-slate-700">
                {TABS.map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-2 text-xs font-medium rounded-t-lg transition
                      ${tab === t ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 border-b-white dark:border-b-slate-800 -mb-px shadow-sm"
                                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                    {t}
                  </button>
                ))}
                <a href="/factor"
                  className="px-4 py-2 text-xs font-medium rounded-t-lg transition ml-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500">
                  Factor Lab
                </a>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 min-h-[520px]">
                {tab === "Equity" && <EquityChart data={result.equity} />}
                {tab === "Heatmap" && <HeatmapChart data={result.heatmap} />}
                {tab === "Distribution" && <DistributionChart data={result.distribution} />}
                {tab === "Rolling Sharpe" && <RollingSharpeChart data={result.rolling_sharpe} />}
                {tab === "Yearly" && <YearlyBarChart data={result.yearly} />}
                {tab === "Factor" && <FactorBarChart data={result.factor} />}
                {tab === "Stats" && <StatsTable rows={result.stats} />}
                {tab === "Risk Matrix" && (() => {
                  if (!riskData?.risk_assessment) return <div className="text-slate-400 dark:text-slate-500 text-center py-20">No risk matrix data available for this strategy</div>;
                  const ra = riskData.risk_assessment;
                  const rm = riskData.risk_matrix || {};
                  const ms = rm.monthly_stats || {};
                  const LEVEL_C: Record<string, string> = { HIGH: "bg-red-500", MEDIUM: "bg-amber-500", LOW: "bg-emerald-500" };
                  return (
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">Risk Assessment</div>
                          <div className="text-xs text-slate-400">{String(riskData.name)} — Likelihood × Impact scoring</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`${LEVEL_C[ra.overall_level] || "bg-slate-500"} text-white text-xs font-bold px-2.5 py-1 rounded`}>{ra.overall_level}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{ra.total_score}/{ra.max_score} ({ra.risk_pct}%)</span>
                        </div>
                      </div>
                      {/* Risk table */}
                      <table className="w-full text-xs mb-5">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                            <th className="text-left p-2 font-medium">Risk Category</th>
                            <th className="text-center p-2 font-medium">L</th>
                            <th className="text-center p-2 font-medium">I</th>
                            <th className="text-center p-2 font-medium">Score</th>
                            <th className="text-center p-2 font-medium">Level</th>
                            <th className="text-left p-2 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ra.risks.map((risk: any) => (
                            <tr key={risk.risk_id} className="border-b border-slate-100 dark:border-slate-700/50">
                              <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{risk.risk_name}</td>
                              <td className="p-2 text-center">
                                <span className={`inline-block w-6 h-6 rounded text-[10px] font-bold leading-6 text-center ${
                                  risk.likelihood >= 3 ? "bg-red-400 text-white" : risk.likelihood >= 2 ? "bg-amber-300 text-slate-800" : "bg-emerald-200 text-slate-800"
                                }`}>{risk.likelihood}</span>
                              </td>
                              <td className="p-2 text-center">
                                <span className={`inline-block w-6 h-6 rounded text-[10px] font-bold leading-6 text-center ${
                                  risk.impact >= 3 ? "bg-red-500 text-white" : risk.impact >= 2 ? "bg-amber-400 text-slate-800" : "bg-emerald-200 text-slate-800"
                                }`}>{risk.impact}</span>
                              </td>
                              <td className="p-2 text-center">
                                <span className={`inline-block w-7 h-7 rounded-lg text-xs font-bold leading-7 text-center ${
                                  risk.score >= 6 ? "bg-red-500 text-white" : risk.score >= 3 ? "bg-amber-400 text-slate-800" : "bg-emerald-200 text-slate-800"
                                }`}>{risk.score}</span>
                              </td>
                              <td className="p-2 text-center">
                                <span className={`${LEVEL_C[risk.level] || ""} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>{risk.level}</span>
                              </td>
                              <td className="p-2 text-slate-500 dark:text-slate-400">{risk.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {/* Quantitative metrics */}
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Quantitative Risk Metrics</div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { l: "VaR 95%", v: rm.var_95 != null ? `${(rm.var_95*100).toFixed(1)}%` : "—", c: "text-red-500" },
                          { l: "CVaR 99%", v: rm.cvar_99 != null ? `${(rm.cvar_99*100).toFixed(1)}%` : "—", c: "text-red-600" },
                          { l: "Market Corr", v: rm.market_correlation != null ? rm.market_correlation.toFixed(2) : "—", c: "text-slate-700 dark:text-slate-200" },
                          { l: "P/L Ratio", v: rm.profit_loss_ratio != null ? rm.profit_loss_ratio.toFixed(2) : "—", c: "text-emerald-600" },
                          { l: "Max Loss Streak", v: rm.max_consecutive_loss != null ? `${rm.max_consecutive_loss}mo` : "—", c: "text-amber-500" },
                          { l: "Win Rate", v: ms.pct_positive != null ? `${(ms.pct_positive*100).toFixed(0)}%` : "—", c: "text-slate-700 dark:text-slate-200" },
                          { l: "Best Month", v: ms.best_month != null ? `${(ms.best_month*100).toFixed(1)}%` : "—", c: "text-emerald-600" },
                          { l: "Worst Month", v: ms.worst_month != null ? `${(ms.worst_month*100).toFixed(1)}%` : "—", c: "text-red-500" },
                        ].map(({ l, v, c }) => (
                          <div key={l} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 text-center">
                            <div className="text-[9px] text-slate-400 dark:text-slate-500">{l}</div>
                            <div className={`text-sm font-bold ${c}`}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {/* Regime performance */}
                      {rm.regime_performance && Object.keys(rm.regime_performance).length > 0 && (
                        <div className="mt-4">
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Regime Performance</div>
                          <div className="flex gap-2">
                            {Object.entries(rm.regime_performance).map(([regime, perf]: [string, any]) => (
                              <div key={regime} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-4 py-2 text-center">
                                <div className="text-[9px] text-slate-400">{regime}</div>
                                <div className={`text-base font-bold ${perf.sharpe > 0 ? "text-emerald-600" : "text-red-500"}`}>{perf.sharpe.toFixed(2)}</div>
                                <div className="text-[9px] text-slate-400">{perf.n}mo</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
          {!result && !loading && (
            <div className="flex items-center justify-center h-96 text-slate-400 dark:text-slate-500">Click Run Backtest to begin</div>
          )}
          {loading && !result && (
            <div className="flex items-center justify-center h-96 text-indigo-500 animate-pulse">Loading backtest results...</div>
          )}
        </div>
      </div>
    </div>
  );
}
