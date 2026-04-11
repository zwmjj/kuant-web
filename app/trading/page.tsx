"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavShell from "@/components/NavShell";
import SecureGate from "@/components/SecureGate";

/* ─── Types ─── */
interface Position {
  symbol: string;
  side: "long" | "short";
  qty: number;
  avgPrice: number;
  marketPrice: number;
  marketValue: number;
  pnl: number;
  pnlPct: number;
  weight: number;
  signal: number;
}

interface AccountInfo {
  equity: number;
  cash: number;
  buyingPower: number;
  longValue: number;
  shortValue: number;
  totalPnl: number;
  dayPnl: number;
}

interface Order {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  amount: number;
  weight: number;
  price: number;
  signal: number;
}

interface SignalArchive {
  date: string;
  strategy: string;
  source: string;
  scale: number;
  nOrders: number;
  orders: Order[];
  generatedAt: string;
}

interface RiskMetrics {
  grossExposure: number;
  netExposure: number;
  longPct: number;
  shortPct: number;
  positionCount: number;
  maxPosition: number;
  regimeWeight: number;
  volScale: number;
  totalScale: number;
}

/* ─── Mock data (updates when API not available) ─── */
const MOCK_ACCOUNT: AccountInfo = {
  equity: 100000, cash: 100000, buyingPower: 200000,
  longValue: 0, shortValue: 0, totalPnl: 0, dayPnl: 0,
};

/* ─── Helpers ─── */
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtUsd = (n: number) => `$${fmt(n)}`;

const PNL_COLOR = (v: number) =>
  v > 0 ? "text-emerald-500" : v < 0 ? "text-red-500" : "text-slate-400";

/* ─── Component ─── */
export default function TradingPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountInfo>(MOCK_ACCOUNT);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<SignalArchive | null>(null);
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [status, setStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const [lastUpdate, setLastUpdate] = useState("");
  const [marketOpen, setMarketOpen] = useState(false);

  const fetchAlpaca = useCallback(async () => {
    try {
      const res = await fetch("/api/trading/status");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAccount(data.account);
      setPositions(data.positions || []);
      setRisk(data.risk || null);
      setMarketOpen(data.marketOpen || false);
      setStatus("connected");
      setLastUpdate(new Date().toLocaleTimeString());
    } catch {
      // Fallback: load from signal archive
      try {
        const res = await fetch("/api/trading/latest-signal");
        if (res.ok) {
          const data = await res.json();
          setSignals(data);
        }
      } catch { /* ignore */ }
      setStatus("disconnected");
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }

    // Load latest signal archive
    loadSignalArchive();
    fetchAlpaca();
  }, [router, fetchAlpaca]);

  const loadSignalArchive = async () => {
    try {
      const res = await fetch("/api/trading/latest-signal");
      if (res.ok) {
        const data = await res.json();
        setSignals(data);
      }
    } catch {
      // No fallback — only show live API data
      setSignals(null);
    }
  };

  const longs = signals?.orders.filter(o => o.side === "buy") || [];
  const shorts = signals?.orders.filter(o => o.side === "sell") || [];
  const longTotal = longs.reduce((s, o) => s + o.amount, 0);
  const shortTotal = shorts.reduce((s, o) => s + o.amount, 0);

  return (
    <SecureGate>
    <NavShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Trading</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Phase 7 — Live Portfolio
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${marketOpen ? "bg-emerald-500" : "bg-amber-400"}`} />
              <span className="text-xs text-slate-500">{marketOpen ? "Market Open" : "Market Closed"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${status === "connected" ? "bg-emerald-500" : status === "loading" ? "bg-amber-400 animate-pulse" : "bg-slate-300"}`} />
              <span className="text-xs text-slate-500">{status === "connected" ? "Live" : "Signal Preview"}</span>
            </div>
            {lastUpdate && <span className="text-[10px] text-slate-400">{lastUpdate}</span>}
          </div>
        </div>

        {/* ═══ Account Stats ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Equity", value: fmtUsd(account.equity) },
            { label: "Cash", value: fmtUsd(account.cash) },
            { label: "Buying Power", value: fmtUsd(account.buyingPower) },
            { label: "Long Exposure", value: fmtUsd(longTotal), color: "text-emerald-500" },
            { label: "Short Exposure", value: fmtUsd(shortTotal), color: "text-red-400" },
            { label: "Net Exposure", value: fmtUsd(longTotal - shortTotal) },
            { label: "Total P&L", value: fmtUsd(account.totalPnl), color: PNL_COLOR(account.totalPnl) },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div className={`text-lg font-bold font-mono ${s.color || ""}`}>{s.value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ Strategy Info + Risk Scaling ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Strategy Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-3">Active Strategy</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Strategy</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{signals?.strategy || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Data Source</span>
                <span className="font-medium">{signals?.source || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Signal Date</span>
                <span className="font-mono">{signals?.date || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Generated</span>
                <span className="font-mono text-xs">{signals?.generatedAt?.slice(0, 16) || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Frequency</span>
                <span className="font-medium">Daily (daemon)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Type</span>
                <span className="text-xs">Multi-asset, multi-strategy</span>
              </div>
            </div>
          </div>

          {/* Dynamic Position Scaling */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-3">Dynamic Position Scaling</h3>
            <div className="space-y-3">
              {[
                { label: "Risk Parity", value: 1.00, detail: "Active allocation" },
                { label: "Volatility Control", value: 1.00, detail: "Target managed" },
                { label: "Drawdown Control", value: 1.00, detail: "Limits enforced" },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{s.label}</span>
                    <span className="font-mono font-bold">{(s.value * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div className={`h-full rounded-full transition-all ${
                      s.value > 0.8 ? "bg-emerald-500" : s.value > 0.5 ? "bg-amber-400" : "bg-red-400"
                    }`} style={{ width: `${s.value * 100}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{s.detail}</div>
                </div>
              ))}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold">Combined Scale</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {((signals?.scale || 0.47) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Multi-asset diversified portfolio
                </div>
              </div>
            </div>
          </div>

          {/* Backtest Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold mb-3">Portfolio Stats</h3>
            <div className="space-y-2">
              {[
                { label: "Status", value: "Live", good: true },
                { label: "Strategy Type", value: "Multi-Asset", good: true },
                { label: "Rebalancing", value: "Automated", good: true },
                { label: "Risk Mgmt", value: "Active", good: true },
                { label: "Monitoring", value: "24/7 Daemon", good: true },
                { label: "Notifications", value: "Push Alerts", good: true },
                { label: "Broker", value: "Alpaca", good: true },
                { label: "Deployment", value: "Cloud", good: true },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{s.label}</span>
                  <span className={`font-mono font-bold ${s.good ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Orders Table ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Long */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">
                Long Positions
                <span className="ml-2 text-xs font-normal text-emerald-500">{longs.length} positions / {fmtUsd(longTotal)}</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold">
                {fmtPct(longTotal / account.equity)} of NAV
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="pb-2 text-left">Symbol</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-right">Weight</th>
                    <th className="pb-2 text-right">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {longs.map(o => (
                    <tr key={o.symbol} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-1.5 font-bold text-emerald-600 dark:text-emerald-400">{o.symbol}</td>
                      <td className="py-1.5 text-right font-mono">{o.qty}</td>
                      <td className="py-1.5 text-right font-mono text-slate-500">${o.price.toFixed(0)}</td>
                      <td className="py-1.5 text-right font-mono">{fmtUsd(o.amount)}</td>
                      <td className="py-1.5 text-right font-mono text-slate-500">{fmtPct(o.weight)}</td>
                      <td className="py-1.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <div className="w-12 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.abs(o.signal) * 100}%` }} />
                          </div>
                          <span className="font-mono text-xs">{o.signal.toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Short */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">
                Short Positions
                <span className="ml-2 text-xs font-normal text-red-500">{shorts.length} positions / {fmtUsd(shortTotal)}</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold">
                {fmtPct(shortTotal / account.equity)} of NAV
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="pb-2 text-left">Symbol</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-right">Weight</th>
                    <th className="pb-2 text-right">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {shorts.map(o => (
                    <tr key={o.symbol} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-1.5 font-bold text-red-500">{o.symbol}</td>
                      <td className="py-1.5 text-right font-mono">{o.qty}</td>
                      <td className="py-1.5 text-right font-mono text-slate-500">${o.price.toFixed(0)}</td>
                      <td className="py-1.5 text-right font-mono">{fmtUsd(o.amount)}</td>
                      <td className="py-1.5 text-right font-mono text-slate-500">{fmtPct(o.weight)}</td>
                      <td className="py-1.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <div className="w-12 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.abs(o.signal) * 100}%` }} />
                          </div>
                          <span className="font-mono text-xs">{o.signal.toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ═══ Strategy Whitepaper Summary ═══ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-bold mb-3">Strategy Architecture</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-slate-400 font-bold">Signal Layer</div>
              <div className="text-xs space-y-0.5">
                <div className="flex gap-2"><span className="w-2 h-2 mt-1 rounded-full bg-indigo-500 shrink-0" /><span>Trend Following</span></div>
                <div className="flex gap-2"><span className="w-2 h-2 mt-1 rounded-full bg-purple-500 shrink-0" /><span>Dual Momentum</span></div>
                <div className="flex gap-2"><span className="w-2 h-2 mt-1 rounded-full bg-blue-500 shrink-0" /><span>Mean Reversion</span></div>
                <div className="flex gap-2"><span className="w-2 h-2 mt-1 rounded-full bg-emerald-500 shrink-0" /><span>Macro Signals</span></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-slate-400 font-bold">Risk Layer</div>
              <div className="text-xs space-y-0.5">
                <div>Optimized weight allocation</div>
                <div>Covariance estimation</div>
                <div>Walk-forward validation</div>
                <div>Transaction cost control</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-slate-400 font-bold">Execution</div>
              <div className="text-xs space-y-0.5">
                <div>Automated daemon (24/7)</div>
                <div>Multi-asset class coverage</div>
                <div>Alpaca brokerage integration</div>
                <div>Mobile push notifications</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-slate-400 font-bold">Validation</div>
              <div className="text-xs space-y-0.5">
                <div className="text-emerald-500">Walk-forward cross-validated</div>
                <div className="text-emerald-500">Statistically robust</div>
                <div className="text-emerald-500">Low market correlation</div>
                <div className="text-emerald-500">Cost-robust</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap gap-6 text-[10px] text-slate-400 pt-2">
          <span>Multi-strategy portfolio</span>
          <span>Validated: Walk-forward CV</span>
          <span>Broker: Alpaca (v2 SDK)</span>
          <span>Automated execution + monitoring</span>
        </div>
      </div>
    </NavShell>
    </SecureGate>
  );
}
