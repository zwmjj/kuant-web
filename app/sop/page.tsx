"use client";
import { useState } from "react";
import NavShell from "@/components/NavShell";

/* ─── Types ─── */
interface GateCheck {
  name: string;
  description: string;
  threshold?: string;
  status: "pass" | "fail" | "na";
}

interface PhaseModule {
  file: string;
  description: string;
}

interface Phase {
  id: number;
  name: string;
  icon: string;
  status: "complete" | "in-progress" | "locked";
  summary: string;
  deliverables: string[];
  gateSummary: string;
  gateChecks: GateCheck[];
  modules: PhaseModule[];
  metrics: { label: string; value: string }[];
}

/* ─── Static SOP Data ─── */
const PHASES: Phase[] = [
  {
    id: 1,
    name: "Initiation",
    icon: "🎯",
    status: "complete",
    summary: "Literature review, hypothesis formation, and data acquisition. Establish economic rationale and obtain clean datasets.",
    deliverables: [
      "Literature review document with 3+ academic references",
      "Factor hypothesis statement with economic rationale",
      "Data acquisition plan (WRDS/CRSP/baostock)",
      "Universe definition and date range specification",
      "Initial data quality report",
    ],
    gateSummary: "Clear economic rationale, data acquired and validated",
    gateChecks: [
      { name: "Literature reviewed", description: "At least 3 academic papers reviewed and documented", status: "pass" },
      { name: "Hypothesis documented", description: "Economic rationale for factor effectiveness documented", status: "pass" },
      { name: "Data acquired", description: "Primary datasets obtained from approved vendors", status: "pass" },
      { name: "Universe defined", description: "Universe, date range, and filters specified", threshold: ">500 stocks", status: "pass" },
      { name: "Data quality check", description: "Missing data <5%, outliers handled, survivorship bias addressed", threshold: "<5% missing", status: "pass" },
    ],
    modules: [
      { file: "literature_review.py", description: "Automated reference search and summarization" },
      { file: "data_sourcer.py", description: "WRDS/CRSP/baostock data download pipeline" },
      { file: "universe_builder.py", description: "Universe construction with filters" },
      { file: "data_quality.py", description: "Missing data, outlier, and survivorship bias checks" },
    ],
    metrics: [
      { label: "Papers required", value: ">= 3" },
      { label: "Data coverage", value: "2000-2025" },
      { label: "Min universe", value: "500 stocks" },
      { label: "Max missing", value: "< 5%" },
    ],
  },
  {
    id: 2,
    name: "Research",
    icon: "🔬",
    status: "complete",
    summary: "Factor construction, signal computation, and in-sample analysis. Build, test, and validate alpha signals.",
    deliverables: [
      "Factor construction code (signal computation)",
      "Cross-sectional regression analysis",
      "Fama-MacBeth t-statistics",
      "Portfolio sort results (quintile/decile)",
      "In-sample performance report",
    ],
    gateSummary: "In-sample results statistically significant, t-stat > 2.0",
    gateChecks: [
      { name: "Signals computed", description: "Factor signals built for full universe", status: "pass" },
      { name: "Fama-MacBeth t-stat", description: "Cross-sectional regression significance", threshold: "> 2.0", status: "pass" },
      { name: "Mean IC > 0", description: "Positive information coefficient", threshold: "IC > 0.03", status: "pass" },
      { name: "Monotonic sorts", description: "Quintile returns monotonically increasing", status: "pass" },
      { name: "Turnover feasible", description: "Monthly turnover within cost-feasible range", threshold: "< 30%/mo", status: "pass" },
      { name: "Independent alpha", description: "Survives Fama-French five-factor controls", status: "pass" },
    ],
    modules: [
      { file: "factor_builder.py", description: "Build signals from raw data" },
      { file: "fama_macbeth.py", description: "Fama-MacBeth cross-sectional regressions" },
      { file: "portfolio_sorts.py", description: "Quintile/decile portfolio construction" },
      { file: "ic_analysis.py", description: "Information coefficient time series" },
      { file: "alpha_control.py", description: "FF5 + momentum alpha regressions" },
    ],
    metrics: [
      { label: "Min t-stat", value: "> 2.0" },
      { label: "Min IC", value: "> 0.03" },
      { label: "Max turnover", value: "< 30%/mo" },
      { label: "Alpha control", value: "FF5+Mom" },
    ],
  },
  {
    id: 3,
    name: "Backtest",
    icon: "📊",
    status: "complete",
    summary: "Full strategy backtest with realistic transaction costs, capacity constraints, and out-of-sample validation.",
    deliverables: [
      "Full backtest report with equity curve",
      "Transaction cost analysis (sqrt impact model)",
      "Capacity estimate",
      "Out-of-sample walk-forward results",
      "Drawdown analysis and risk decomposition",
    ],
    gateSummary: "Net Sharpe > 1.5, OOS Sharpe > 60% of IS, MDD < 25%",
    gateChecks: [
      { name: "In-sample Sharpe", description: "Sharpe ratio before and after costs", threshold: "> 1.5 net", status: "pass" },
      { name: "OOS Sharpe ratio", description: "Out-of-sample Sharpe relative to in-sample", threshold: "> 60% of IS", status: "pass" },
      { name: "Max drawdown", description: "Peak-to-trough maximum drawdown", threshold: "< 25%", status: "pass" },
      { name: "Cost model applied", description: "Sqrt impact k=0.3, spread 5bp, SEC 0.8bp", status: "pass" },
      { name: "Delisting adjusted", description: "Shumway delisting returns applied", status: "pass" },
      { name: "Capacity > $50M", description: "Strategy can absorb minimum capital", threshold: "> $50M", status: "pass" },
    ],
    modules: [
      { file: "backtester.py", description: "Event-driven backtest engine" },
      { file: "cost_model.py", description: "Sqrt impact + spread + fee model" },
      { file: "walk_forward.py", description: "Rolling OOS walk-forward validation" },
      { file: "capacity_estimator.py", description: "ADV-based capacity analysis" },
      { file: "risk_decomposition.py", description: "Drawdown and risk attribution" },
    ],
    metrics: [
      { label: "Min net Sharpe", value: "> 1.5" },
      { label: "OOS decay", value: "< 40%" },
      { label: "Max MDD", value: "< 25%" },
      { label: "Min capacity", value: "$50M" },
    ],
  },
  {
    id: 4,
    name: "Review",
    icon: "🛡️",
    status: "complete",
    summary: "Independent audit, peer review, and compliance checks. Assign final rating and decide if strategy is production-ready.",
    deliverables: [
      "Audit scorecard (A/B/C/D rating)",
      "Peer review sign-off",
      "Compliance checklist (no look-ahead, no survivorship bias)",
      "Final risk limits and position sizing",
      "Strategy documentation package",
    ],
    gateSummary: "Rating A or B required for go-live",
    gateChecks: [
      { name: "No look-ahead bias", description: "All signals use only past data", status: "pass" },
      { name: "No survivorship bias", description: "Delisted stocks included with correct returns", status: "pass" },
      { name: "Audit rating >= B", description: "Independent audit rates strategy A or B", threshold: "A or B", status: "pass" },
      { name: "Peer reviewed", description: "Second researcher validates methodology", status: "pass" },
      { name: "Risk limits set", description: "Position limits, sector limits, and stop-losses defined", status: "pass" },
      { name: "Documentation complete", description: "Full strategy doc with rationale, code, and results", status: "pass" },
    ],
    modules: [
      { file: "audit_engine.py", description: "Automated audit checks and scoring" },
      { file: "bias_detector.py", description: "Look-ahead and survivorship bias detection" },
      { file: "risk_limits.py", description: "Position sizing and risk limit calculation" },
      { file: "report_generator.py", description: "PDF/HTML strategy report generation" },
    ],
    metrics: [
      { label: "Min rating", value: "B" },
      { label: "Bias checks", value: "All passed" },
      { label: "Review sign-offs", value: ">= 2" },
      { label: "Doc pages", value: ">= 10" },
    ],
  },
  {
    id: 5,
    name: "Paper Trading",
    icon: "🚀",
    status: "complete",
    summary: "Paper trading on Alpaca to verify live execution matches backtest expectations. All infrastructure tested and operational.",
    deliverables: [
      "Alpaca paper trading results validated",
      "Go-live deployment plan with capital ramp schedule",
      "Monitoring dashboard and alert configuration",
      "Kill-switch criteria documented and implemented",
      "Automated daemon with risk controls deployed",
    ],
    gateSummary: "Paper trading validates live behavior matches backtest",
    gateChecks: [
      { name: "Paper traded 3 months", description: "Minimum 3 months of paper trading", threshold: "3 months", status: "pass" },
      { name: "Tracking error OK", description: "Live vs backtest tracking error within range", threshold: "< 5%", status: "pass" },
      { name: "Infrastructure ready", description: "Execution infrastructure tested and operational", status: "pass" },
      { name: "Kill-switch defined", description: "Automatic shutdown criteria documented", status: "pass" },
      { name: "Capital allocated", description: "Initial capital approved and allocated", status: "pass" },
      { name: "Monitoring live", description: "Real-time P&L and risk monitoring active", status: "pass" },
    ],
    modules: [
      { file: "paper_trader.py", description: "Simulated live execution engine" },
      { file: "execution_manager.py", description: "Order routing and fill management" },
      { file: "monitor.py", description: "Real-time P&L and risk monitoring" },
      { file: "alert_system.py", description: "Threshold-based alerting" },
      { file: "kill_switch.py", description: "Emergency position liquidation" },
    ],
    metrics: [
      { label: "Paper period", value: "3 months" },
      { label: "Max tracking error", value: "< 5%" },
      { label: "Capital ramp", value: "25%/month" },
      { label: "Review frequency", value: "Monthly" },
    ],
  },
  {
    id: 6,
    name: "Live Trading",
    icon: "💰",
    status: "complete",
    summary: "Real-money live capital deployment. Portfolio runs on production infrastructure with automated execution and risk controls.",
    deliverables: [
      "Live brokerage account funded and operational",
      "Production execution pipeline deployed",
      "Real-money P&L tracking active",
      "Automated rebalancing and order routing",
      "Risk controls and position limits enforced",
    ],
    gateSummary: "Live portfolio running with real capital deployed",
    gateChecks: [
      { name: "Account funded", description: "Live brokerage account funded with real capital", status: "pass" },
      { name: "Live execution", description: "Orders executing on live markets with real fills", status: "pass" },
      { name: "Risk controls active", description: "Position limits, stop-losses, and drawdown controls live", status: "pass" },
      { name: "P&L tracking", description: "Real-time P&L monitoring operational", status: "pass" },
      { name: "Auto rebalancing", description: "Portfolio rebalancing running on schedule", status: "pass" },
    ],
    modules: [
      { file: "alpaca_live.py", description: "Alpaca live trading execution" },
      { file: "update_alpaca.py", description: "Portfolio rebalancing and order submission" },
      { file: "kuant_daemon.py", description: "Automated trading daemon with monitoring" },
      { file: "notify.py", description: "Mobile push notification system" },
    ],
    metrics: [
      { label: "Status", value: "Live" },
      { label: "Execution", value: "Automated" },
      { label: "Risk Mgmt", value: "Active" },
      { label: "Monitoring", value: "24/7" },
    ],
  },
  {
    id: 7,
    name: "Scale & Optimize",
    icon: "📈",
    status: "complete",
    summary: "Portfolio optimization, multi-strategy expansion, and continuous improvement. Cross-strategy capital allocation optimized.",
    deliverables: [
      "Multi-strategy portfolio optimization",
      "Cross-strategy capital allocation optimized",
      "Cloud deployment for continuous operation",
      "Performance attribution and reporting",
      "Continuous strategy monitoring and improvement",
    ],
    gateSummary: "Scaled portfolio running, allocation optimized",
    gateChecks: [
      { name: "Multi-strategy live", description: "Multiple strategies running in production", status: "pass" },
      { name: "Weights optimized", description: "Portfolio weights optimized for risk-adjusted returns", status: "pass" },
      { name: "Cloud deployed", description: "System deployed to cloud for 24/7 operation", status: "pass" },
      { name: "Attribution active", description: "Per-strategy performance attribution running", status: "pass" },
      { name: "Continuous improvement", description: "Strategy improvement and new signal research pipeline", status: "pass" },
    ],
    modules: [
      { file: "optimize_weights.py", description: "Portfolio weight optimization engine" },
      { file: "build_final_portfolio.py", description: "Multi-strategy portfolio construction" },
      { file: "portfolio_monitor.py", description: "Performance monitoring and attribution" },
      { file: "scan_everything.py", description: "New alpha signal scanner" },
    ],
    metrics: [
      { label: "Strategies", value: "Multi-strategy" },
      { label: "Optimization", value: "Sharpe-maximized" },
      { label: "Deployment", value: "Cloud" },
      { label: "Pipeline", value: "Active" },
    ],
  },
];

/* ─── Helpers ─── */
const STATUS_STYLE: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  locked: "bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400",
};

const STATUS_LABEL: Record<string, string> = {
  complete: "Complete",
  "in-progress": "In Progress",
  locked: "Locked",
};

const GATE_ICON: Record<string, { icon: string; color: string }> = {
  pass: { icon: "✓", color: "text-emerald-500" },
  fail: { icon: "✗", color: "text-red-500" },
  na: { icon: "—", color: "text-slate-400" },
};

/* ─── Component ─── */
export default function SOPPage() {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  const toggle = (id: number) => setExpandedPhase(prev => prev === id ? null : id);

  return (
    <NavShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">SOP Pipeline</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Quantitative Strategy Development — Phase 1 through 7
          </p>
        </div>

        {/* ═══ Pipeline Visualization ═══ */}
        <div className="relative">
          {/* Connection line (behind cards) */}
          <div className="hidden lg:block absolute top-[52px] left-[60px] right-[60px] h-0.5 bg-gradient-to-r from-emerald-400 via-blue-400 to-slate-300 dark:from-emerald-600 dark:via-blue-600 dark:to-slate-600 z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 relative z-10">
            {PHASES.map((phase, idx) => {
              const isExpanded = expandedPhase === phase.id;
              return (
                <div key={phase.id} className="flex flex-col items-center">
                  {/* Phase card */}
                  <button
                    onClick={() => toggle(phase.id)}
                    className={`w-full bg-white dark:bg-slate-800 rounded-xl border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 p-4 text-left ${
                      isExpanded
                        ? "border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/10"
                        : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600"
                    }`}
                  >
                    {/* Icon + phase number */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{phase.icon}</span>
                      <span className="text-[10px] text-slate-400 font-mono">PHASE {phase.id}</span>
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-bold mb-1">{phase.name}</h3>

                    {/* Status badge */}
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${STATUS_STYLE[phase.status]}`}>
                      {STATUS_LABEL[phase.status]}
                    </span>

                    {/* Deliverables (short) */}
                    <ul className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5 mb-2">
                      {phase.deliverables.slice(0, 3).map(d => (
                        <li key={d} className="truncate">&#8226; {d}</li>
                      ))}
                      {phase.deliverables.length > 3 && (
                        <li className="text-slate-400">+{phase.deliverables.length - 3} more</li>
                      )}
                    </ul>

                    {/* Gate summary */}
                    <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium border-t border-slate-100 dark:border-slate-700 pt-1.5 mt-1">
                      Gate: {phase.gateSummary}
                    </div>
                  </button>

                  {/* Arrow (between cards, large screens) */}
                  {idx < PHASES.length - 1 && (
                    <div className="hidden lg:block absolute" style={{ left: `${(idx + 1) * 20}%`, top: 44, transform: "translateX(-50%)" }}>
                      <span className="text-slate-300 dark:text-slate-600 text-lg">&#8594;</span>
                    </div>
                  )}

                  {/* Arrow (between cards, small screens) */}
                  {idx < PHASES.length - 1 && (
                    <div className="lg:hidden text-center py-1">
                      <span className="text-slate-300 dark:text-slate-600 text-lg">&#8595;</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ Phase Detail Panel ═══ */}
        {expandedPhase !== null && (() => {
          const phase = PHASES.find(p => p.id === expandedPhase)!;
          const passCount = phase.gateChecks.filter(g => g.status === "pass").length;
          const totalCount = phase.gateChecks.length;
          return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-indigo-500/30 dark:border-indigo-400/30 p-6 space-y-5 animate-in">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{phase.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold">Phase {phase.id}: {phase.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{phase.summary}</p>
                  </div>
                </div>
                <button onClick={() => setExpandedPhase(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg transition">
                  &#10005;
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Gate Checks */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Gate Checks</h3>
                    <span className="text-xs text-slate-400">{passCount}/{totalCount} passed</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${passCount === totalCount ? "bg-emerald-500" : "bg-indigo-500"}`}
                      style={{ width: `${(passCount / totalCount) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {phase.gateChecks.map(g => (
                      <div key={g.name}
                        className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                        <span className={`text-sm font-bold mt-0.5 ${GATE_ICON[g.status].color}`}>
                          {GATE_ICON[g.status].icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{g.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{g.description}</div>
                        </div>
                        {g.threshold && (
                          <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded shrink-0">
                            {g.threshold}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right column: Modules + Metrics */}
                <div className="space-y-5">
                  {/* Modules */}
                  <div>
                    <h3 className="text-sm font-bold mb-3">Modules</h3>
                    <div className="space-y-2">
                      {phase.modules.map(m => (
                        <div key={m.file} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{m.file}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{m.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div>
                    <h3 className="text-sm font-bold mb-3">Key Thresholds</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {phase.metrics.map(m => (
                        <div key={m.label} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2.5 text-center">
                          <div className="text-sm font-bold">{m.value}</div>
                          <div className="text-[10px] text-slate-400">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deliverables (full list) */}
                  <div>
                    <h3 className="text-sm font-bold mb-3">Deliverables</h3>
                    <ul className="space-y-1">
                      {phase.deliverables.map(d => (
                        <li key={d} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">&#8226;</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══ Pipeline Summary Footer ═══ */}
        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 flex flex-wrap gap-6 text-xs text-slate-500">
          <span>Phases 1-7: Complete</span>
          <span>All gates passed — Live trading operational</span>
          <span>Total Gate Checks: {PHASES.reduce((a, p) => a + p.gateChecks.length, 0)}</span>
          <span>Total Modules: {PHASES.reduce((a, p) => a + p.modules.length, 0)}</span>
          <span>SOP Version: 2.0</span>
        </div>
      </div>
    </NavShell>
  );
}
