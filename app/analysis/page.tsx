"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getStrategies, type Strategy,
  runWalkForward, type WalkForwardResult,
  runOptimize, type OptimizeResult,
  runStressTest, type StressTestResult,
  runSensitivity, type SensitivityResult,
} from "@/lib/api";
import WalkForwardPanel from "@/components/WalkForwardPanel";
import OptimizePanel from "@/components/OptimizePanel";
import StressTestPanel from "@/components/StressTestPanel";
import SensitivityPanel from "@/components/SensitivityPanel";
import ThemeToggle from "@/components/ThemeToggle";
import PanelUnavailable from "@/components/PanelUnavailable";
import { type BackendFailure } from "@/lib/backendStatus";

const TABS = ["Walk-Forward", "Optimize", "Stress Test", "Sensitivity"] as const;
type Tab = typeof TABS[number];

const SCENARIOS = [
  { id: "dotcom", name: "Dot-Com Crash" },
  { id: "gfc", name: "GFC 2008" },
  { id: "eu_debt", name: "EU Debt 2011" },
  { id: "taper", name: "Taper Tantrum 2013" },
  { id: "china", name: "China Shock 2015" },
  { id: "volmageddon", name: "Volmageddon 2018" },
  { id: "q4_2018", name: "Q4 Selloff 2018" },
  { id: "covid", name: "COVID Crash 2020" },
  { id: "fed_2022", name: "Fed Hikes 2022" },
  { id: "bank_2023", name: "Banking Crisis 2023" },
];

const SENS_PARAMS = [
  { value: "w_mom", label: "Momentum Weight" },
  { value: "w_accel", label: "Acceleration Weight" },
  { value: "w_quality", label: "Quality Weight" },
  { value: "w_vol", label: "Low-Vol Weight" },
  { value: "long_n", label: "Long Count" },
  { value: "short_n", label: "Short Count" },
  { value: "turnover_penalty", label: "Turnover Penalty" },
  { value: "cost_bps", label: "Cost (bps)" },
];

export default function AnalysisPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>}>
      <AnalysisPage />
    </Suspense>
  );
}

function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const strategyId = searchParams.get("s") || "mom_accel";

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [tab, setTab] = useState<Tab>("Walk-Forward");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<BackendFailure | null>(null);
  const [status, setStatus] = useState("");
  const [user, setUser] = useState("");

  // Strategy defaults
  const [wMom, setWMom] = useState(75);
  const [wAccel, setWAccel] = useState(25);
  const [wQuality, setWQuality] = useState(0);
  const [wVol, setWVol] = useState(0);
  const [startDate, setStartDate] = useState("2015-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Walk-Forward config
  const [wfType, setWfType] = useState<"rolling" | "anchored">("rolling");
  const [wfOptimize, setWfOptimize] = useState(false);
  const [wfIS, setWfIS] = useState(36);
  const [wfOOS, setWfOOS] = useState(12);
  const [wfStep, setWfStep] = useState(12);
  const [wfObj, setWfObj] = useState("sharpe");
  const [wfCandidates, setWfCandidates] = useState(12);

  // Optimize config
  const [optMethod, setOptMethod] = useState<"grid" | "random">("grid");
  const [optObj, setOptObj] = useState("sharpe");
  const [optStep, setOptStep] = useState(25);
  const [optIter, setOptIter] = useState(200);

  // Stress Test config
  const [stScenarios, setStScenarios] = useState<string[]>(SCENARIOS.map((s) => s.id));

  // Sensitivity config
  const [sensParam, setSensParam] = useState("w_mom");
  const [sensMin, setSensMin] = useState(0);
  const [sensMax, setSensMax] = useState(100);
  const [sensStep, setSensStep] = useState(10);

  // Results
  const [wfResult, setWfResult] = useState<WalkForwardResult | null>(null);
  const [optResult, setOptResult] = useState<OptimizeResult | null>(null);
  const [stResult, setStResult] = useState<StressTestResult | null>(null);
  const [sensResult, setSensResult] = useState<SensitivityResult | null>(null);

  useEffect(() => {
    setUser(localStorage.getItem("user") || "user");
    getStrategies().then(({ strategies: s }) => {
      setStrategies(s);
      const strat = s.find((x) => x.id === strategyId);
      if (strat && !strat.needs_data) {
        setWMom(strat.w_mom ?? 75);
        setWAccel(strat.w_accel ?? 25);
        setWQuality(strat.w_quality ?? 0);
        setWVol(strat.w_vol ?? 0);
      }
    });
  }, [strategyId]);

  // Update sensitivity range defaults based on param type
  useEffect(() => {
    const ranges: Record<string, [number, number, number]> = {
      w_mom: [0, 100, 10], w_accel: [0, 100, 10],
      w_quality: [0, 100, 10], w_vol: [0, 100, 10],
      long_n: [5, 50, 5], short_n: [0, 40, 5],
      turnover_penalty: [0, 0.5, 0.05], cost_bps: [0, 20, 2],
    };
    const r = ranges[sensParam] || [0, 100, 10];
    setSensMin(r[0]);
    setSensMax(r[1]);
    setSensStep(r[2]);
  }, [sensParam]);

  const baseParams = () => ({
    w_mom: wMom, w_accel: wAccel, w_quality: wQuality, w_vol: wVol,
    long_n: 20, short_n: 20, long_pct: 115, short_pct: 15,
    turnover_penalty: 0.25, cost_bps: 2, initial_capital: 100000,
    start_date: startDate, end_date: endDate,
  });

  const run = async () => {
    setLoading(true);
    setStatus(`Running ${tab}...`);
    try {
      if (tab === "Walk-Forward") {
        const r = await runWalkForward({
          ...baseParams(),
          window_type: wfType, optimize_per_window: wfOptimize,
          is_months: wfIS, oos_months: wfOOS,
          step_months: wfStep, objective: wfObj, n_candidates: wfCandidates,
        });
        setWfResult(r);
        setStatus(`Done - ${r.windows?.length || 0} windows`);
      } else if (tab === "Optimize") {
        const r = await runOptimize({
          ...baseParams(),
          method: optMethod, objective: optObj,
          grid_step: optStep, n_iter: optIter,
        });
        setOptResult(r);
        setStatus(`Done - ${r.total_evaluated} configs evaluated`);
      } else if (tab === "Stress Test") {
        const r = await runStressTest({ ...baseParams(), scenarios: stScenarios });
        setStResult(r);
        setStatus(`Done - ${r.scenarios?.length || 0} scenarios`);
      } else if (tab === "Sensitivity") {
        const r = await runSensitivity({
          ...baseParams(),
          param_name: sensParam, param_min: sensMin,
          param_max: sensMax, param_step: sensStep,
        });
        setSensResult(r);
        setStatus(`Done - ${r.results?.length || 0} points`);
      }
    } catch (e: unknown) {
      let msg = "Failed";
      if (e instanceof Error) msg = e.message;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = (e as any)?.response;
      if (resp?.data?.detail) msg = resp.data.detail;
      else if (resp?.status) msg = `HTTP ${resp.status}: ${msg}`;
      // Classify alongside the raw message, so a 404 from a router that this
      // deployment never registered is not shown as an unexplained failure.
      const code = resp?.status as number | undefined;
      // >= 500 through the Next rewrite means the upstream never answered.
      if (code === 404) setFailure("not-deployed");
      else if (code === 401 || code === 403) setFailure("unauthorized");
      else if (code === undefined || code >= 500) setFailure("unreachable");
      else setFailure("error");
      setStatus(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const currentStrat = strategies.find((s) => s.id === strategyId);
  const labelStyle = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1";
  const inputStyle = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none";
  const secStyle = "text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 tracking-[2px] mb-2 mt-1";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Top bar */}
      <div className="flex items-center px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <button onClick={() => router.push(`/backtest?s=${strategyId}`)}
          className="px-4 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition">
          &larr; Backtest
        </button>
        <div className="flex-1 mx-4 font-bold text-base">
          {currentStrat ? `${currentStrat.icon} ${currentStrat.name}` : strategyId}
          <span className="text-slate-400 dark:text-slate-500 font-normal text-sm ml-2">Advanced Analysis</span>
        </div>
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
          {/* Signal weights */}
          <div className={secStyle}>SIGNAL WEIGHTS</div>
          {[
            ["Momentum", wMom, setWMom],
            ["Acceleration", wAccel, setWAccel],
            ["Quality", wQuality, setWQuality],
            ["Low Vol", wVol, setWVol],
          ].map(([label, val, setter]) => (
            <div key={String(label)} className="mb-2">
              <label className={labelStyle}>{label as string}: {val as number}</label>
              <input type="range" min={0} max={100} step={5} value={val as number}
                onChange={(e) => (setter as (v: number) => void)(+e.target.value)}
                className="w-full accent-indigo-500" />
            </div>
          ))}

          <hr className="border-slate-200 my-2" />
          <div className={secStyle}>PERIOD</div>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className={labelStyle}>From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputStyle} />
            </div>
            <div className="flex-1">
              <label className={labelStyle}>To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputStyle} />
            </div>
          </div>

          <hr className="border-slate-200 my-2" />
          <div className={secStyle}>{tab.toUpperCase()} CONFIG</div>

          {/* Walk-Forward config */}
          {tab === "Walk-Forward" && (
            <>
              <label className={labelStyle}>Window Type</label>
              <select value={wfType} onChange={(e) => setWfType(e.target.value as "rolling" | "anchored")} className={`${inputStyle} mb-2`}>
                <option value="rolling">Rolling</option>
                <option value="anchored">Anchored (Expanding)</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2 cursor-pointer">
                <input type="checkbox" checked={wfOptimize} onChange={(e) => setWfOptimize(e.target.checked)}
                  className="accent-indigo-500" />
                Optimize per window
                <span className="text-[10px] text-amber-500">{wfOptimize ? "(slow)" : ""}</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className={labelStyle}>IS Months</label>
                  <input type="number" value={wfIS} onChange={(e) => setWfIS(+e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>OOS Months</label>
                  <input type="number" value={wfOOS} onChange={(e) => setWfOOS(+e.target.value)} className={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className={labelStyle}>Step Months</label>
                  <input type="number" value={wfStep} onChange={(e) => setWfStep(+e.target.value)} className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Candidates</label>
                  <input type="number" value={wfCandidates} onChange={(e) => setWfCandidates(+e.target.value)} className={inputStyle} />
                </div>
              </div>
              <label className={labelStyle}>Objective</label>
              <select value={wfObj} onChange={(e) => setWfObj(e.target.value)} className={`${inputStyle} mb-2`}>
                <option value="sharpe">Max Sharpe</option>
                <option value="sortino">Max Sortino</option>
                <option value="calmar">Max Calmar</option>
              </select>
            </>
          )}

          {/* Optimize config */}
          {tab === "Optimize" && (
            <>
              <label className={labelStyle}>Method</label>
              <select value={optMethod} onChange={(e) => setOptMethod(e.target.value as "grid" | "random")} className={`${inputStyle} mb-2`}>
                <option value="grid">Grid Search</option>
                <option value="random">Random Search</option>
              </select>
              {optMethod === "grid" ? (
                <div className="mb-2">
                  <label className={labelStyle}>Grid Step</label>
                  <select value={optStep} onChange={(e) => setOptStep(+e.target.value)} className={inputStyle}>
                    <option value={25}>25 (fast, ~56 combos)</option>
                    <option value={20}>20 (~125 combos)</option>
                    <option value={10}>10 (~286 combos)</option>
                    <option value={5}>5 (~1771 combos, slow)</option>
                  </select>
                </div>
              ) : (
                <div className="mb-2">
                  <label className={labelStyle}>Iterations</label>
                  <input type="number" value={optIter} onChange={(e) => setOptIter(+e.target.value)} className={inputStyle} />
                </div>
              )}
              <label className={labelStyle}>Objective</label>
              <select value={optObj} onChange={(e) => setOptObj(e.target.value)} className={`${inputStyle} mb-2`}>
                <option value="sharpe">Max Sharpe</option>
                <option value="sortino">Max Sortino</option>
                <option value="calmar">Max Calmar</option>
              </select>
            </>
          )}

          {/* Stress Test config */}
          {tab === "Stress Test" && (
            <>
              <div className="flex justify-between mb-1">
                <label className={labelStyle}>Scenarios</label>
                <button onClick={() => setStScenarios(stScenarios.length === SCENARIOS.length ? [] : SCENARIOS.map((s) => s.id))}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700">
                  {stScenarios.length === SCENARIOS.length ? "Clear All" : "Select All"}
                </button>
              </div>
              <div className="space-y-1 mb-2 max-h-[200px] overflow-y-auto">
                {SCENARIOS.map((sc) => (
                  <label key={sc.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded">
                    <input type="checkbox" checked={stScenarios.includes(sc.id)}
                      onChange={(e) => {
                        if (e.target.checked) setStScenarios([...stScenarios, sc.id]);
                        else setStScenarios(stScenarios.filter((s) => s !== sc.id));
                      }}
                      className="accent-indigo-500" />
                    {sc.name}
                  </label>
                ))}
              </div>
            </>
          )}

          {/* Sensitivity config */}
          {tab === "Sensitivity" && (
            <>
              <label className={labelStyle}>Parameter</label>
              <select value={sensParam} onChange={(e) => setSensParam(e.target.value)} className={`${inputStyle} mb-2`}>
                {SENS_PARAMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div>
                  <label className={labelStyle}>Min</label>
                  <input type="number" value={sensMin} onChange={(e) => setSensMin(+e.target.value)} className={inputStyle} step={sensStep} />
                </div>
                <div>
                  <label className={labelStyle}>Max</label>
                  <input type="number" value={sensMax} onChange={(e) => setSensMax(+e.target.value)} className={inputStyle} step={sensStep} />
                </div>
                <div>
                  <label className={labelStyle}>Step</label>
                  <input type="number" value={sensStep} onChange={(e) => setSensStep(+e.target.value)} className={inputStyle} />
                </div>
              </div>
            </>
          )}

          <button onClick={run} disabled={loading}
            className="w-full py-3 mt-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white
                       font-bold text-sm tracking-wide hover:brightness-110 transition-all
                       disabled:opacity-60 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
            {loading ? "Running..." : `Run ${tab}`}
          </button>
          {loading && (
            <p className="text-center text-[10px] text-amber-500 mt-2">
              {tab === "Walk-Forward" || tab === "Optimize" ? "This may take 1-2 minutes..." : "Processing..."}
            </p>
          )}
          <p className="text-center text-[11px] text-slate-400 mt-1">{status}</p>
        </div>

        {/* Right area */}
        <div className="flex-1 p-4 overflow-y-auto h-[calc(100vh-50px)] bg-slate-50 dark:bg-slate-900">
          {failure && (
            <div className="mb-3">
              <PanelUnavailable
                failure={failure}
                panel="Advanced analysis"
                needs="the /api/advanced routes"
                onRetry={() => { setFailure(null); }}
              />
            </div>
          )}
          {/* Tab bar */}
          <div className="flex gap-1 mb-3 border-b border-slate-200 dark:border-slate-700">
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

          {/* Tab content */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 min-h-[520px]">
            {loading ? (
              <div className="flex items-center justify-center h-96 text-indigo-500 animate-pulse">
                Running {tab} analysis...
              </div>
            ) : (
              <>
                {tab === "Walk-Forward" && wfResult && <WalkForwardPanel data={wfResult} />}
                {tab === "Optimize" && optResult && <OptimizePanel data={optResult} />}
                {tab === "Stress Test" && stResult && <StressTestPanel data={stResult} />}
                {tab === "Sensitivity" && sensResult && (
                  <SensitivityPanel data={sensResult}
                    currentValue={
                      sensParam === "w_mom" ? wMom : sensParam === "w_accel" ? wAccel :
                      sensParam === "w_quality" ? wQuality : sensParam === "w_vol" ? wVol : undefined
                    } />
                )}
                {!wfResult && !optResult && !stResult && !sensResult && (
                  <div className="flex items-center justify-center h-96 text-slate-400">
                    Configure parameters and click Run to begin analysis
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
