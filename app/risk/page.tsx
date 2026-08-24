"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import NavShell from "@/components/NavShell";
import SecureGate from "@/components/SecureGate";

/* ─── 类型定义 ─── */

// 风控实时数据
interface RiskRealtime {
  healthScore: number;       // 0-100 健康评分
  var95: number;             // VaR (95%)
  cvar95: number;            // CVaR (95%)
  currentDrawdown: number;   // 当前回撤 (百分比)
  volatility: number;        // 年化波动率 (百分比)
  hhi: number;               // 持仓集中度 HHI (0-1)
  beta: number;              // 组合 Beta
  maxDrawdown: number;       // 历史最大回撤 (百分比)
}

// 告警条目
interface AlertItem {
  id: string;
  time: string;
  type: string;              // 类型标签
  severity: "critical" | "warning" | "info";
  message: string;
}

// Stress Test Scenarios
interface StressScenario {
  name: string;
  description: string;
  estimatedLoss: number;     // 预估损失金额
  estimatedLossPct: number;  // 预估损失百分比
  running: boolean;          // 是否正在运行
}

/* ─── 模拟数据生成 ─── */

// 生成风控实时数据
function generateRiskData(): RiskRealtime {
  const healthScore = Math.floor(40 + Math.random() * 55);
  return {
    healthScore,
    var95: +(15000 + Math.random() * 25000).toFixed(0) as number,
    cvar95: +(20000 + Math.random() * 35000).toFixed(0) as number,
    currentDrawdown: +(Math.random() * 18).toFixed(2) as number,
    volatility: +(10 + Math.random() * 20).toFixed(2) as number,
    hhi: +(0.05 + Math.random() * 0.45).toFixed(3) as number,
    beta: +(0.5 + Math.random() * 1.2).toFixed(2) as number,
    maxDrawdown: +(15 + Math.random() * 20).toFixed(2) as number,
  };
}

// 模拟风控数据微变
function tickRiskData(prev: RiskRealtime): RiskRealtime {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return {
    healthScore: clamp(prev.healthScore + Math.floor(Math.random() * 7 - 3), 0, 100),
    var95: +clamp(prev.var95 + (Math.random() * 2000 - 1000), 5000, 60000).toFixed(0) as number,
    cvar95: +clamp(prev.cvar95 + (Math.random() * 2500 - 1250), 8000, 80000).toFixed(0) as number,
    currentDrawdown: +clamp(prev.currentDrawdown + (Math.random() * 1.5 - 0.75), 0, 40).toFixed(2) as number,
    volatility: +clamp(prev.volatility + (Math.random() * 1.2 - 0.6), 3, 50).toFixed(2) as number,
    hhi: +clamp(prev.hhi + (Math.random() * 0.04 - 0.02), 0.01, 0.8).toFixed(3) as number,
    beta: +clamp(prev.beta + (Math.random() * 0.1 - 0.05), 0.1, 2.5).toFixed(2) as number,
    maxDrawdown: prev.maxDrawdown, // 历史最大回撤不变
  };
}

// 告警类型池
const ALERT_TYPES = ["Drawdown Alert", "Vol Spike", "Concentration Breach", "Beta Drift", "VaR Breach", "Liquidity Risk"];
const ALERT_MESSAGES: Record<string, string[]> = {
  "Drawdown Alert": ["Current drawdown approaching max drawdown threshold", "Portfolio drawdown exceeds 10% warning level"],
  "Vol Spike": ["30-min volatility surged 200%", "Annualized volatility exceeds 30% threshold"],
  "Concentration Breach": ["Single position weight exceeds 25%", "HHI above 0.4 warning level"],
  "Beta Drift": ["Portfolio Beta deviates from target by more than 0.3", "Systematic risk exposure increasing"],
  "VaR Breach": ["Intraday loss exceeds 95% VaR", "Tail risk intensifying, CVaR deteriorating"],
  "Liquidity Risk": ["Bid-ask spread widening on some positions", "Large positions facing insufficient liquidity"],
};

let alertIdCounter = 0;

// 生成单条告警
function generateAlert(): AlertItem {
  const type = ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)];
  const msgs = ALERT_MESSAGES[type];
  const severity: AlertItem["severity"] =
    Math.random() < 0.15 ? "critical" : Math.random() < 0.45 ? "warning" : "info";
  return {
    id: `alert-${++alertIdCounter}-${Date.now()}`,
    time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    type,
    severity,
    message: msgs[Math.floor(Math.random() * msgs.length)],
  };
}

// 生成初始告警列表
function generateInitialAlerts(count: number): AlertItem[] {
  const alerts: AlertItem[] = [];
  for (let i = 0; i < count; i++) alerts.push(generateAlert());
  return alerts;
}

/* ─── 格式化工具 ─── */
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/* ─── 健康评分颜色 ─── */
function scoreColor(score: number): string {
  if (score > 80) return "#10b981"; // 绿
  if (score >= 60) return "#f59e0b"; // 黄
  return "#ef4444"; // 红
}

/* ─── 页面组件 ─── */
export default function RiskPage() {
  const router = useRouter();

  // 风控数据
  const [riskData, setRiskData] = useState<RiskRealtime | null>(null);
  // 告警列表
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  // 新告警 ID 集合，用于淡入动画
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set());
  // Stress Test Scenarios
  const [scenarios, setScenarios] = useState<StressScenario[]>([
    { name: "COVID Crash", description: "Simulating March 2020 pandemic panic, market crash 30%+", estimatedLoss: -127500, estimatedLossPct: -25.5, running: false },
    { name: "Rate Hike Shock", description: "Simulating aggressive Fed 100bp hike, growth stock pullback", estimatedLoss: -68000, estimatedLossPct: -13.6, running: false },
    { name: "Flash Crash", description: "Simulating algo-triggered liquidity dry-up, instant 10% drop", estimatedLoss: -52000, estimatedLossPct: -10.4, running: false },
  ]);
  // 数据源标记
  const [usingMock, setUsingMock] = useState(true);

  // 引用，避免闭包陷阱
  const riskRef = useRef(riskData);
  riskRef.current = riskData;

  /* ─── 从后端获取数据，失败时用模拟数据 ─── */
  const fetchRiskData = useCallback(async () => {
    try {
      const res = await fetch("/api/risk/realtime");
      if (!res.ok) throw new Error("API error");
      const data: RiskRealtime & { data_source?: string } = await res.json();
      setRiskData(data);
      // A 200 from the backend does not mean the numbers are real. The risk
      // router generates its portfolio from np.random.RandomState(42) and
      // says so in `data_source`; the risk maths on top is genuine, the
      // portfolio underneath is not. Trust that field rather than the status
      // code, or the badge turns green on synthetic data.
      setUsingMock(data.data_source !== "live");
    } catch {
      // 后端不可用，使用模拟数据
      setUsingMock(true);
      setRiskData((prev) => (prev ? tickRiskData(prev) : generateRiskData()));
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/risk/alerts");
      if (!res.ok) throw new Error("API error");
      const body = await res.json();
      // The endpoint returns an envelope, not a bare array.
      const data: AlertItem[] = Array.isArray(body) ? body : (body?.alerts ?? []);
      setAlerts(data);
      setUsingMock((Array.isArray(body) ? undefined : body?.data_source) !== "live");
    } catch {
      // 后端不可用，模拟新增告警
      setUsingMock(true);
      if (Math.random() < 0.6) {
        const newAlert = generateAlert();
        setNewAlertIds(new Set([newAlert.id]));
        setAlerts((prev) => [newAlert, ...prev].slice(0, 50)); // 最多保留 50 条
        // 1 秒后移除淡入标记
        setTimeout(() => setNewAlertIds(new Set()), 1000);
      }
    }
  }, []);

  // 鉴权 + 初始化
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }

    // 初始化数据
    setRiskData(generateRiskData());
    setAlerts(generateInitialAlerts(8));
  }, [router]);

  // 每 3 秒轮询
  useEffect(() => {
    if (!riskData) return;
    const interval = setInterval(() => {
      fetchRiskData();
      fetchAlerts();
    }, 3000);
    return () => clearInterval(interval);
  }, [riskData, fetchRiskData, fetchAlerts]);

  /* ─── 压力测试处理 ─── */
  const runStressTest = async (index: number) => {
    setScenarios((prev) =>
      prev.map((s, i) => (i === index ? { ...s, running: true } : s))
    );
    try {
      const res = await fetch("/api/risk/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenarios[index].name }),
      });
      if (res.ok) {
        const result = await res.json();
        setScenarios((prev) =>
          prev.map((s, i) =>
            i === index
              ? { ...s, estimatedLoss: result.estimatedLoss, estimatedLossPct: result.estimatedLossPct, running: false }
              : s
          )
        );
        return;
      }
    } catch {
      // 后端不可用，模拟运行
    }
    // 模拟运行 1.5 秒后返回结果
    setTimeout(() => {
      setScenarios((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                estimatedLoss: -(Math.floor(30000 + Math.random() * 120000)),
                estimatedLossPct: -(+(5 + Math.random() * 25).toFixed(1)),
                running: false,
              }
            : s
        )
      );
    }, 1500);
  };

  if (!riskData) return null;

  // 健康评分相关计算（SVG 圆环）
  const RADIUS = 70;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE - (riskData.healthScore / 100) * CIRCUMFERENCE;

  // 小卡片数据
  const metricCards = [
    { label: "VaR (95%)", value: fmtUsd(riskData.var95), color: "text-red-400" },
    { label: "CVaR (95%)", value: fmtUsd(riskData.cvar95), color: "text-orange-400" },
    { label: "Current DD", value: `-${riskData.currentDrawdown}%`, color: riskData.currentDrawdown > 10 ? "text-red-400" : "text-amber-400" },
    { label: "Annualized Vol", value: `${riskData.volatility}%`, color: riskData.volatility > 25 ? "text-red-400" : "text-sky-400" },
  ];

  // 告警行样式
  const alertRowClass = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 border-red-500/40 animate-pulse";
      case "warning":  return "bg-yellow-500/15 border-yellow-500/30";
      case "info":     return "bg-sky-500/10 border-sky-500/20";
    }
  };

  const severityBadge = (severity: AlertItem["severity"]) => {
    const map = {
      critical: "bg-red-600 text-white",
      warning:  "bg-yellow-500 text-black",
      info:     "bg-sky-500 text-white",
    };
    return map[severity];
  };

  // 回撤水位百分比（相对于最大回撤）
  const drawdownRatio = Math.min((riskData.currentDrawdown / riskData.maxDrawdown) * 100, 100);

  return (
    <SecureGate>
    <NavShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ═══ 标题栏 ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Risk Control</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Risk alerts & stress testing dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${usingMock ? "bg-amber-500" : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"}`} />
            <span className="text-xs text-slate-400">{usingMock ? "Synthetic portfolio" : "Live Data"}</span>
          </div>
        </div>

        {usingMock && (
          // The risk maths below is real -- qf.risk.RiskAnalyzer and
          // qf.risk_manager compute these figures properly. The book they run
          // on is not. Say which half is which.
          <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
            <strong className="font-semibold">Synthetic portfolio.</strong>{" "}
            The VaR, CVaR, HHI and drawdown figures are computed by the real risk
            engine (<code>qf.risk</code>, <code>qf.risk_manager</code>), but the
            positions they are computed over are generated from a fixed random
            seed — the backend reports this as <code>data_source: simulated</code>.
            The method is real; the book is not.
          </div>
        )}

        {/* ═══ 1. 顶部 — 健康评分 + 4个指标卡片 ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 健康评分圆环 */}
          <div className="md:col-span-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col items-center justify-center">
            <svg width="160" height="160" className="-rotate-90">
              {/* 背景圆环 */}
              <circle cx="80" cy="80" r={RADIUS} stroke="#334155" strokeWidth="10" fill="none" />
              {/* 进度圆环 */}
              <circle
                cx="80" cy="80" r={RADIUS}
                stroke={scoreColor(riskData.healthScore)}
                strokeWidth="10" fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700"
              />
            </svg>
            {/* 中间分数文字（覆盖在圆环上） */}
            <div className="absolute flex flex-col items-center pointer-events-none" style={{ marginTop: '-100px' }}>
            </div>
            <div className="-mt-[108px] flex flex-col items-center">
              <span className="text-4xl font-extrabold" style={{ color: scoreColor(riskData.healthScore) }}>
                {riskData.healthScore}
              </span>
              <span className="text-xs text-slate-400 mt-1">Health Score</span>
            </div>
          </div>

          {/* 4 个指标小卡片 */}
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {metricCards.map((c) => (
              <div key={c.label}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
                <span className={`text-2xl font-extrabold tracking-tight ${c.color}`}>{c.value}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 2. 中间 — 告警面板 + 指标仪表盘 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* 左栏: 实时告警面板 (3/5) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-4">Alerts</h3>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {alerts.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No alerts</p>
              )}
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-500 ${alertRowClass(a.severity)} ${newAlertIds.has(a.id) ? "opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]" : ""}`}
                >
                  {/* 严重级别标签 */}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${severityBadge(a.severity)} shrink-0 mt-0.5`}>
                    {a.severity.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-300">{a.type}</span>
                      <span className="text-[10px] text-slate-500">{a.time}</span>
                    </div>
                    <p className="text-sm text-slate-300 truncate">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右栏: 风控指标仪表盘 (2/5) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
            <h3 className="text-sm font-bold mb-2">Risk Metrics Dashboard</h3>

            {/* 持仓集中度 HHI */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Position Concentration (HHI)</span>
                <span className={`font-mono font-bold ${riskData.hhi > 0.4 ? "text-red-400" : riskData.hhi > 0.25 ? "text-amber-400" : "text-emerald-400"}`}>
                  {riskData.hhi.toFixed(3)}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${riskData.hhi > 0.4 ? "bg-red-500" : riskData.hhi > 0.25 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(riskData.hhi * 100 / 0.6, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0 (diversified)</span>
                <span>0.25</span>
                <span>0.6+ (concentrated)</span>
              </div>
            </div>

            {/* Beta 指标条 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Portfolio Beta</span>
                <span className={`font-mono font-bold ${Math.abs(riskData.beta - 1) > 0.5 ? "text-red-400" : "text-sky-400"}`}>
                  {riskData.beta.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden relative">
                {/* 目标 Beta=1 标记线 */}
                <div className="absolute left-[40%] top-0 w-px h-full bg-slate-400 z-10" title="Target Beta=1.0" />
                <div
                  className={`h-full rounded-full transition-all duration-700 ${Math.abs(riskData.beta - 1) > 0.5 ? "bg-red-500" : "bg-sky-500"}`}
                  style={{ width: `${Math.min((riskData.beta / 2.5) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0</span>
                <span>1.0 (target)</span>
                <span>2.5</span>
              </div>
            </div>

            {/* 回撤水位图 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Drawdown Level (current vs max)</span>
                <span className="font-mono font-bold text-amber-400">
                  {riskData.currentDrawdown}% / {riskData.maxDrawdown}%
                </span>
              </div>
              <div className="w-full h-8 bg-slate-700 rounded-lg overflow-hidden relative">
                {/* 历史最大回撤背景 */}
                <div className="absolute inset-0 bg-red-900/30 rounded-lg" />
                {/* 当前回撤条 */}
                <div
                  className={`h-full rounded-lg transition-all duration-700 ${drawdownRatio > 80 ? "bg-red-500" : drawdownRatio > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${drawdownRatio}%` }}
                />
                {/* 最大回撤线 */}
                <div className="absolute right-0 top-0 w-0.5 h-full bg-red-400" title={`Max DD ${riskData.maxDrawdown}%`} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0% (no drawdown)</span>
                <span className="text-red-400">Max DD {riskData.maxDrawdown}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 3. 底部 — 压力测试卡片 ═══ */}
        <div>
          <h3 className="text-sm font-bold mb-3">Stress Test Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((s, i) => (
              <div key={s.name}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col">
                <h4 className="text-base font-bold text-slate-100 mb-1">{s.name}</h4>
                <p className="text-xs text-slate-400 mb-4 flex-1">{s.description}</p>

                {/* 预估损失 */}
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-2xl font-extrabold text-red-400">
                    {fmtUsd(s.estimatedLoss)}
                  </span>
                  <span className="text-sm font-bold text-red-400/70">
                    {s.estimatedLossPct.toFixed(1)}%
                  </span>
                </div>

                {/* 运行按钮 */}
                <button
                  onClick={() => runStressTest(i)}
                  disabled={s.running}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
                    s.running
                      ? "bg-slate-600 text-slate-400 cursor-wait"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98]"
                  }`}
                >
                  {s.running ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Running...
                    </span>
                  ) : "Run Test"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 底部状态栏 ═══ */}
        <div className="flex flex-wrap gap-6 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
          <span>Refresh interval: 3s</span>
          <span>Data source: {usingMock ? "synthetic portfolio (risk maths is real, the book is generated)" : "live API"}</span>
          <span>Health Score: {riskData.healthScore} / 100</span>
        </div>
      </div>

      {/* 淡入动画 keyframes (Tailwind 默认没有 fadeIn) */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </NavShell>
    </SecureGate>
  );
}
