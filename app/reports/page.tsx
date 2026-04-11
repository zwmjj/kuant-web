"use client";
import { useState, useMemo } from "react";
import NavShell from "@/components/NavShell";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

/* ─── 类型定义 ─── */
interface StrategyRow {
  name: string;
  sharpe: number;
  annReturn: number;   // 年化收益率 (小数)
  maxDD: number;       // 最大回撤 (小数, 负数)
  rating: "A" | "B" | "C" | "D" | "F";
}

interface FactorAttribution {
  factor: string;
  contribution: number; // 对 alpha 的贡献 (bps)
  ic: number;           // Information Coefficient
  ir: number;           // Information Ratio
}

/* ─── 评级颜色映射 ─── */
const RATING_COLOR: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-blue-500",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

/* ─── 模拟策略数据 ─── */
const MOCK_STRATEGIES: StrategyRow[] = [
  { name: "Momentum L/S",       sharpe: 2.31, annReturn: 0.187, maxDD: -0.112, rating: "A" },
  { name: "Value Composite",    sharpe: 1.95, annReturn: 0.142, maxDD: -0.158, rating: "A" },
  { name: "Quality Growth",     sharpe: 1.78, annReturn: 0.131, maxDD: -0.134, rating: "B" },
  { name: "Low Vol Anomaly",    sharpe: 1.62, annReturn: 0.098, maxDD: -0.089, rating: "B" },
  { name: "Mean Reversion",     sharpe: 1.45, annReturn: 0.115, maxDD: -0.175, rating: "B" },
  { name: "Sector Rotation",    sharpe: 1.21, annReturn: 0.105, maxDD: -0.201, rating: "C" },
  { name: "Pairs Trading",      sharpe: 1.08, annReturn: 0.078, maxDD: -0.143, rating: "C" },
  { name: "Trend Following",    sharpe: 0.92, annReturn: 0.085, maxDD: -0.225, rating: "D" },
  { name: "Stat Arb Micro",     sharpe: 0.74, annReturn: 0.062, maxDD: -0.267, rating: "D" },
  { name: "Event Driven",       sharpe: 0.51, annReturn: 0.041, maxDD: -0.312, rating: "F" },
];

/* ─── 模拟因子归因数据 ─── */
const MOCK_FACTORS: FactorAttribution[] = [
  { factor: "Momentum 12-1",  contribution: 42,  ic: 0.052, ir: 1.85 },
  { factor: "Book-to-Market",  contribution: 28,  ic: 0.038, ir: 1.42 },
  { factor: "ROE Change",      contribution: 22,  ic: 0.041, ir: 1.55 },
  { factor: "Low Volatility",  contribution: 18,  ic: 0.035, ir: 1.28 },
  { factor: "Accruals",        contribution: -8,  ic: 0.022, ir: 0.78 },
  { factor: "Size (SMB)",      contribution: -12, ic: 0.018, ir: 0.65 },
  { factor: "Liquidity",       contribution: 15,  ic: 0.029, ir: 1.12 },
  { factor: "Earnings Rev",    contribution: 31,  ic: 0.045, ir: 1.68 },
];

/* ─── 模拟回撤曲线数据 ─── */
const MOCK_DRAWDOWN = Array.from({ length: 60 }, (_, i) => {
  const month = `${2021 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
  // 模拟回撤路径
  const base = -Math.abs(Math.sin(i * 0.3) * 0.15 + Math.cos(i * 0.17) * 0.08);
  return { month, drawdown: Math.round(base * 1000) / 10 };
});

/* ─── 模拟相关性矩阵 ─── */
const CORR_NAMES = ["Mom", "Val", "Qual", "LowVol", "MeanRev", "Sector"];
const CORR_MATRIX = [
  [1.00, -0.25, 0.32, 0.15, -0.41, 0.22],
  [-0.25, 1.00, 0.45, 0.38, 0.12, 0.28],
  [0.32, 0.45, 1.00, 0.51, -0.08, 0.35],
  [0.15, 0.38, 0.51, 1.00, 0.22, 0.18],
  [-0.41, 0.12, -0.08, 0.22, 1.00, -0.15],
  [0.22, 0.28, 0.35, 0.18, -0.15, 1.00],
];

/* ─── 相关性颜色: 蓝(负) → 白(零) → 红(正) ─── */
function corrColor(v: number): string {
  if (v >= 0.8) return "bg-red-600 text-white";
  if (v >= 0.4) return "bg-red-400 text-white";
  if (v >= 0.15) return "bg-red-200 text-slate-800";
  if (v > -0.15) return "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
  if (v > -0.4) return "bg-blue-200 text-slate-800";
  return "bg-blue-500 text-white";
}

/* ─── 排序类型 ─── */
type SortKey = "name" | "sharpe" | "annReturn" | "maxDD" | "rating";

export default function ReportsPage() {
  // 排序状态
  const [sortKey, setSortKey] = useState<SortKey>("sharpe");
  const [sortAsc, setSortAsc] = useState(false);

  // 排序后的策略列表
  const sortedStrategies = useMemo(() => {
    const ratingOrder: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    return [...MOCK_STRATEGIES].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "rating") cmp = (ratingOrder[a.rating] || 0) - (ratingOrder[b.rating] || 0);
      else cmp = a[sortKey] - b[sortKey];
      return sortAsc ? cmp : -cmp;
    });
  }, [sortKey, sortAsc]);

  // IC/IR 排名（按 IR 降序）
  const sortedFactorsByIR = useMemo(
    () => [...MOCK_FACTORS].sort((a, b) => b.ir - a.ir),
    []
  );

  // 切换排序
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  // 排序箭头指示
  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ▲" : " ▼") : "";

  /* ─── 下载 CSV ─── */
  const downloadCSV = () => {
    const header = "Strategy,Sharpe,Ann Return,Max DD,Rating";
    const rows = sortedStrategies.map(
      s => `${s.name},${s.sharpe},${(s.annReturn * 100).toFixed(1)}%,${(s.maxDD * 100).toFixed(1)}%,${s.rating}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strategy_ranking.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── 下载 Markdown ─── */
  const downloadMarkdown = () => {
    const lines = [
      "# Research Report",
      "",
      `> Generated: ${new Date().toISOString().slice(0, 10)}`,
      "",
      "## Strategy Ranking",
      "",
      "| Strategy | Sharpe | Ann Return | Max DD | Rating |",
      "| --- | --- | --- | --- | --- |",
      ...sortedStrategies.map(
        s => `| ${s.name} | ${s.sharpe.toFixed(2)} | ${(s.annReturn * 100).toFixed(1)}% | ${(s.maxDD * 100).toFixed(1)}% | ${s.rating} |`
      ),
      "",
      "## Factor Attribution",
      "",
      "| Factor | Contribution (bps) | IC | IR |",
      "| --- | --- | --- | --- |",
      ...MOCK_FACTORS.map(
        f => `| ${f.factor} | ${f.contribution} | ${f.ic.toFixed(3)} | ${f.ir.toFixed(2)} |`
      ),
      "",
      "## Risk Metrics",
      "",
      "- VaR (95%): -2.3%",
      "- CVaR (95%): -3.8%",
      "- Portfolio Beta: 0.42",
      "- Annualized Volatility: 12.5%",
    ];
    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "research_report.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── 风险指标卡片数据 ─── */
  const riskMetrics = [
    { label: "VaR (95%)",  value: "-2.3%",  color: "text-red-500" },
    { label: "CVaR (95%)", value: "-3.8%",  color: "text-red-400" },
    { label: "Beta",       value: "0.42",   color: "text-blue-500" },
    { label: "Ann. Vol",   value: "12.5%",  color: "text-amber-500" },
  ];

  return (
    <NavShell>
      {/* 打印时隐藏导航栏的样式 */}
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ═══ 顶部 — 标题 + 生成按钮 ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Research Reports</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Strategy analysis, factor attribution &amp; risk decomposition
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="no-print px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            生成新报告
          </button>
        </div>

        {/* ═══ 主体 — 三栏布局 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ─── 左栏: 策略对比表 ─── */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 overflow-x-auto">
            <h3 className="text-sm font-bold mb-4">策略排名</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  {/* 可点击排序的表头 */}
                  <th className="pb-2 text-left cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    Strategy{sortArrow("name")}
                  </th>
                  <th className="pb-2 text-right cursor-pointer select-none" onClick={() => toggleSort("sharpe")}>
                    Sharpe{sortArrow("sharpe")}
                  </th>
                  <th className="pb-2 text-right cursor-pointer select-none" onClick={() => toggleSort("annReturn")}>
                    Ann Ret{sortArrow("annReturn")}
                  </th>
                  <th className="pb-2 text-right cursor-pointer select-none" onClick={() => toggleSort("maxDD")}>
                    MaxDD{sortArrow("maxDD")}
                  </th>
                  <th className="pb-2 text-center cursor-pointer select-none" onClick={() => toggleSort("rating")}>
                    Rating{sortArrow("rating")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStrategies.map((s) => (
                  <tr key={s.name} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="py-1.5 font-medium truncate max-w-[120px]">{s.name}</td>
                    <td className="py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{s.sharpe.toFixed(2)}</td>
                    <td className="py-1.5 text-right font-mono">{(s.annReturn * 100).toFixed(1)}%</td>
                    <td className="py-1.5 text-right font-mono text-red-500">{(s.maxDD * 100).toFixed(1)}%</td>
                    <td className="py-1.5 text-center">
                      <span className={`${RATING_COLOR[s.rating] ?? "bg-slate-400"} text-white text-[10px] font-bold px-1.5 py-0.5 rounded`}>
                        {s.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── 中栏: 因子归因分析 ─── */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
            <h3 className="text-sm font-bold">因子归因分析</h3>

            {/* 因子贡献柱状图 */}
            <div>
              <p className="text-[10px] text-slate-400 mb-2">Factor Contribution to Alpha (bps)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MOCK_FACTORS} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis type="category" dataKey="factor" tick={{ fontSize: 9, fill: "#94a3b8" }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#e2e8f0" }}
                    itemStyle={{ color: "#a5b4fc" }}
                  />
                  <Bar dataKey="contribution" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* IC/IR 排名表 */}
            <div>
              <p className="text-[10px] text-slate-400 mb-2">IC / IR 排名</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="pb-1 text-left">Factor</th>
                    <th className="pb-1 text-right">IC</th>
                    <th className="pb-1 text-right">IR</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFactorsByIR.map(f => (
                    <tr key={f.factor} className="border-b border-slate-50 dark:border-slate-700/50">
                      <td className="py-1 truncate max-w-[100px]">{f.factor}</td>
                      <td className="py-1 text-right font-mono">{f.ic.toFixed(3)}</td>
                      <td className="py-1 text-right font-mono text-indigo-500">{f.ir.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 右栏: 风险分析 ─── */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
            <h3 className="text-sm font-bold">风险分析</h3>

            {/* 风险指标卡片 */}
            <div className="grid grid-cols-2 gap-2">
              {riskMetrics.map(m => (
                <div key={m.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className={`text-lg font-extrabold font-mono ${m.color}`}>{m.value}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            {/* 回撤曲线图 */}
            <div>
              <p className="text-[10px] text-slate-400 mb-2">Portfolio Drawdown (%)</p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={MOCK_DRAWDOWN} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 8, fill: "#94a3b8" }} interval={11} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={["dataMin", 0]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#e2e8f0" }}
                    formatter={(v: unknown) => [`${Number(v ?? 0).toFixed(1)}%`, "Drawdown"]}
                  />
                  <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 相关性矩阵热力图 */}
            <div>
              <p className="text-[10px] text-slate-400 mb-2">策略间相关性矩阵</p>
              <div className="overflow-x-auto">
                <table className="text-[10px] w-full">
                  <thead>
                    <tr>
                      <th className="p-1"></th>
                      {CORR_NAMES.map(n => (
                        <th key={n} className="p-1 text-center text-slate-400 font-normal">{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CORR_NAMES.map((row, i) => (
                      <tr key={row}>
                        <td className="p-1 text-slate-400 font-medium">{row}</td>
                        {CORR_MATRIX[i].map((v, j) => (
                          <td key={j} className={`p-1 text-center font-mono rounded-sm ${corrColor(v)}`}>
                            {v.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 底部 — 导出选项 ═══ */}
        <div className="no-print flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 hover:opacity-90 transition"
          >
            下载 PDF
          </button>
          <button
            onClick={downloadCSV}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            下载 CSV
          </button>
          <button
            onClick={downloadMarkdown}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            下载 Markdown
          </button>
        </div>
      </div>
    </NavShell>
  );
}
