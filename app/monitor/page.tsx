"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavShell from "@/components/NavShell";
import SecureGate from "@/components/SecureGate";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ─── 类型定义 ─── */

// 持仓行
interface Position {
  symbol: string;
  qty: number;
  costBasis: number;   // 成本价
  lastPrice: number;    // 现价
  pnl: number;          // 盈亏金额
  pnlPct: number;       // 盈亏百分比
}

// 信号热力图单元
interface SignalCell {
  symbol: string;
  factor: string;
  value: number; // -1 到 1
}

// PnL 折线图数据点
interface PnlPoint {
  time: string;
  pnl: number;
}

// 账户总览
interface AccountSummary {
  totalEquity: number;
  dayPnl: number;
  positionCount: number;
  tradeCount: number;
}

/* ─── 模拟数据生成 ─── */

const SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "JPM"];
const FACTORS = ["Momentum", "Value", "Size", "Vol", "Quality", "Reversal"];

// 生成初始持仓
function generatePositions(): Position[] {
  return SYMBOLS.map((symbol) => {
    const costBasis = 100 + Math.random() * 400;
    const lastPrice = costBasis * (0.9 + Math.random() * 0.2);
    const qty = Math.floor(10 + Math.random() * 200);
    const pnl = (lastPrice - costBasis) * qty;
    const pnlPct = ((lastPrice - costBasis) / costBasis) * 100;
    return { symbol, qty, costBasis, lastPrice, pnl, pnlPct };
  });
}

// 模拟持仓价格微变
function tickPositions(prev: Position[]): Position[] {
  return prev.map((p) => {
    const delta = p.lastPrice * (Math.random() * 0.006 - 0.003); // +/- 0.3%
    const lastPrice = +(p.lastPrice + delta).toFixed(2);
    const pnl = +((lastPrice - p.costBasis) * p.qty).toFixed(2);
    const pnlPct = +(((lastPrice - p.costBasis) / p.costBasis) * 100).toFixed(2);
    return { ...p, lastPrice, pnl, pnlPct };
  });
}

// 生成信号热力图数据
function generateSignals(): SignalCell[] {
  const cells: SignalCell[] = [];
  for (const symbol of SYMBOLS) {
    for (const factor of FACTORS) {
      cells.push({ symbol, factor, value: +(Math.random() * 2 - 1).toFixed(2) });
    }
  }
  return cells;
}

// 信号微调
function tickSignals(prev: SignalCell[]): SignalCell[] {
  return prev.map((c) => {
    const v = Math.max(-1, Math.min(1, c.value + (Math.random() * 0.1 - 0.05)));
    return { ...c, value: +v.toFixed(2) };
  });
}

// 生成 PnL 时间序列（最近 60 个点）
function generatePnlSeries(): PnlPoint[] {
  const pts: PnlPoint[] = [];
  let pnl = 0;
  const now = Date.now();
  for (let i = 59; i >= 0; i--) {
    pnl += Math.random() * 600 - 280;
    const t = new Date(now - i * 60_000);
    pts.push({ time: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), pnl: +pnl.toFixed(2) });
  }
  return pts;
}

/* ─── 颜色工具 ─── */

// 信号值 -> 背景色（蓝=负, 灰=0, 红=正）
function signalColor(v: number): string {
  if (v > 0) {
    const alpha = Math.min(v, 1);
    return `rgba(16,185,129,${0.15 + alpha * 0.7})`; // 绿色
  }
  const alpha = Math.min(Math.abs(v), 1);
  return `rgba(239,68,68,${0.15 + alpha * 0.7})`; // 红色
}

/* ─── 格式化工具 ─── */
const fmtUsd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtPnl = (n: number) => (n >= 0 ? "+" : "") + n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/* ─── 页面组件 ─── */
export default function MonitorPage() {
  const router = useRouter();

  // WebSocket 连接状态（模拟）
  const [wsConnected, setWsConnected] = useState(false);

  // 数据状态
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<SignalCell[]>([]);
  const [pnlSeries, setPnlSeries] = useState<PnlPoint[]>([]);
  const [account, setAccount] = useState<AccountSummary>({
    totalEquity: 0, dayPnl: 0, positionCount: 0, tradeCount: 0,
  });

  // 根据持仓计算账户总览
  const updateAccount = useCallback((pos: Position[]) => {
    const totalEquity = pos.reduce((s, p) => s + p.lastPrice * p.qty, 0);
    const dayPnl = pos.reduce((s, p) => s + p.pnl, 0);
    setAccount({
      totalEquity: +totalEquity.toFixed(2),
      dayPnl: +dayPnl.toFixed(2),
      positionCount: pos.length,
      tradeCount: Math.floor(20 + Math.random() * 30), // 模拟今日交易次数
    });
  }, []);

  // 鉴权 + 初始化数据
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }

    // 初始化
    const initPos = generatePositions();
    setPositions(initPos);
    setSignals(generateSignals());
    setPnlSeries(generatePnlSeries());
    updateAccount(initPos);

    // 模拟 WebSocket 连接建立（延迟 800ms）
    const connectTimer = setTimeout(() => setWsConnected(true), 800);
    return () => clearTimeout(connectTimer);
  }, [router, updateAccount]);

  // 模拟实时数据推送（每 2 秒 tick 一次）
  useEffect(() => {
    if (!wsConnected) return;

    const interval = setInterval(() => {
      setPositions((prev) => {
        const next = tickPositions(prev);
        updateAccount(next);
        return next;
      });
      setSignals((prev) => tickSignals(prev));
      setPnlSeries((prev) => {
        const now = new Date();
        const newPt: PnlPoint = {
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          pnl: +(prev[prev.length - 1].pnl + Math.random() * 400 - 180).toFixed(2),
        };
        return [...prev.slice(-59), newPt];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [wsConnected, updateAccount]);

  /* ─── 账户总览卡片数据 ─── */
  const summaryCards = [
    { label: "Total Equity", value: fmtUsd(account.totalEquity), color: "text-slate-100" },
    { label: "Day PnL", value: fmtPnl(account.dayPnl), color: account.dayPnl >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Positions", value: account.positionCount.toString(), color: "text-sky-400" },
    { label: "Trades Today", value: account.tradeCount.toString(), color: "text-amber-400" },
  ];

  return (
    <SecureGate>
    <NavShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ═══ 标题栏 + WebSocket 状态指示灯 ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trading Monitor</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Real-time trading monitor dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            {/* WebSocket 连接状态指示灯 */}
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"}`} />
            <span className="text-xs text-slate-400">{wsConnected ? "WS Connected" : "WS Disconnected"}</span>
          </div>
        </div>

        {/* ═══ 1. 账户总览卡片 ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map((c) => (
            <div key={c.label}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
              <span className={`text-2xl font-extrabold tracking-tight ${c.color}`}>{c.value}</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{c.label}</span>
            </div>
          ))}
        </div>

        {/* ═══ 2. 左栏: 持仓表格 + 右栏: 信号热力图 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* 左栏: 实时持仓表格 (3/5 宽度) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-4">Live Positions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="pb-2 text-left">Symbol</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Cost</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">PnL</th>
                    <th className="pb-2 text-right">PnL%</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.symbol}
                      className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-1.5 font-semibold">{p.symbol}</td>
                      <td className="py-1.5 text-right font-mono text-slate-500">{p.qty}</td>
                      <td className="py-1.5 text-right font-mono text-slate-500">${p.costBasis.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-mono">${p.lastPrice.toFixed(2)}</td>
                      <td className={`py-1.5 text-right font-mono font-semibold ${p.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {fmtPnl(p.pnl)}
                      </td>
                      <td className={`py-1.5 text-right font-mono font-semibold ${p.pnlPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 右栏: 信号热力图 (2/5 宽度) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-2">Signal Heatmap</h3>
            <p className="text-[10px] text-slate-400 mb-3">Factor signal strength per symbol. Green=long, Red=short</p>

            {/* 图例 */}
            <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(239,68,68,0.85)" }} /> -1 (strong short)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-slate-600" /> 0
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(16,185,129,0.85)" }} /> +1 (strong long)
              </span>
            </div>

            {/* 热力图表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr>
                    <th className="pb-1 text-left text-slate-400" />
                    {FACTORS.map((f) => (
                      <th key={f} className="pb-1 text-center text-slate-400 font-medium">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SYMBOLS.map((symbol) => (
                    <tr key={symbol}>
                      <td className="py-0.5 font-semibold text-slate-300 pr-2">{symbol}</td>
                      {FACTORS.map((factor) => {
                        const cell = signals.find((s) => s.symbol === symbol && s.factor === factor);
                        const v = cell?.value ?? 0;
                        return (
                          <td key={factor} className="py-0.5 px-0.5">
                            <div
                              className="rounded-sm h-7 flex items-center justify-center font-mono font-bold text-white/90 transition-colors duration-500"
                              style={{ background: signalColor(v) }}
                              title={`${symbol} ${factor}: ${v}`}
                            >
                              {v.toFixed(2)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ═══ 3. 底部: 实时 PnL 折线图 ═══ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-bold mb-4">Real-time PnL Curve</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={pnlSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value: unknown) => [fmtPnl(Number(value ?? 0)), "PnL"]}
              />
              <Line
                type="monotone"
                dataKey="pnl"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ═══ 底部状态栏 ═══ */}
        <div className="flex flex-wrap gap-6 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
          <span>Refresh interval: 2s</span>
          <span>Data source: simulated (using setInterval when backend offline)</span>
          <span className={wsConnected ? "text-emerald-500" : "text-red-400"}>
            {wsConnected ? "WebSocket Live" : "WebSocket Disconnected"}
          </span>
        </div>
      </div>
    </NavShell>
    </SecureGate>
  );
}
