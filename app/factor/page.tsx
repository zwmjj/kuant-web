"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, ComposedChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ArrowLeft, FlaskConical, Loader2 } from "lucide-react";

/* ── API client ──────────────────────────────────────────────────── */

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((c) => {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

/* ── Types ────────────────────────────────────────────────────────── */

interface Results {
  decileNav: { date: string; D10: number; D1: number }[];
  decileReturns: { bars: { decile: string; mean: number }[]; benchmark: number; monotonic: boolean };
  longOnly: { date: string; strategy: number; index: number }[];
  longShort: { date: string; strategy: number; index: number }[];
  icStability: { date: string; raw: number; ma: number; upper: number; lower: number }[];
  cumulativeIC: { series: { date: string; cumIc: number }[]; meanIc: number; icir: number };
  icDecay: { period: string; ic: number; icir: number }[];
  styleExposure: { bars: { factor: string; exposure: number; t_stat: number }[]; r2: number };
}

/* ── Constants ────────────────────────────────────────────────────── */

const FACTORS = [
  "rev5","rev10","rev20","mom20","mom60","lowvol",
  "realized_spread","oil_beta","co_move","vpt","clv",
  "ad_line","obv","overnight_ret","intraday_ret","volume_surge",
] as const;

const DECILE_COLORS: Record<number, string> = {
  1:"#ef4444",2:"#f87171",3:"#fca5a5",4:"#fecaca",5:"#d4d4d8",
  6:"#a1a1aa",7:"#6ee7b7",8:"#34d399",9:"#10b981",10:"#0d9488",
};

/* ── Sub‑components ──────────────────────────────────────────────── */

function ChartCard({ title, subtitle, badge, children }: {
  title: string; subtitle: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-0.5">
        <h3 className="text-xs font-semibold text-white">{title}</h3>
        {badge}
      </div>
      <p className="text-[10px] text-slate-500 mb-2">{subtitle}</p>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function Placeholder() {
  return <div className="h-full flex items-center justify-center text-[10px] text-slate-600">Run analysis to view</div>;
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center rounded-xl z-10">
      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
    </div>
  );
}

/* ── Sidebar ──────────────────────────────────────────────────────── */

function FactorSidebar({ state, dispatch, onRun, loading, error }: {
  state: { factor: string; universe: string; from: string; to: string; groups: number; freq: string };
  dispatch: (a: Partial<typeof state>) => void;
  onRun: () => void; loading: boolean; error: string | null;
}) {
  const cls = "w-full bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500";
  const lbl = "text-[10px] font-medium text-slate-400 uppercase tracking-wider";
  return (
    <aside className="w-[220px] bg-slate-800 border-r border-slate-700 p-4 space-y-3 overflow-y-auto shrink-0">
      <div className="space-y-1"><label className={lbl}>Factor</label>
        <select className={cls} value={state.factor} onChange={e => dispatch({ factor: e.target.value })}>
          {FACTORS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="space-y-1"><label className={lbl}>Universe</label>
        <select className={cls} value={state.universe} onChange={e => dispatch({ universe: e.target.value })}>
          {["SP500","Russell1000","Russell3000"].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="space-y-1"><label className={lbl}>From</label>
        <input type="date" className={cls} value={state.from} onChange={e => dispatch({ from: e.target.value })} />
      </div>
      <div className="space-y-1"><label className={lbl}>To</label>
        <input type="date" className={cls} value={state.to} onChange={e => dispatch({ to: e.target.value })} />
      </div>
      <div className="space-y-1"><label className={lbl}>Groups Q</label>
        <select className={cls} value={state.groups} onChange={e => dispatch({ groups: +e.target.value })}>
          {[5,10].map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="space-y-1"><label className={lbl}>Frequency</label>
        <select className={cls} value={state.freq} onChange={e => dispatch({ freq: e.target.value })}>
          {["Monthly","Weekly"].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <button onClick={onRun} disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-purple-900/30">
        {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Running...</span> : "Run Factor Analysis"}
      </button>
      {error && <div className="text-[10px] text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-2">{error}</div>}
    </aside>
  );
}

/* ── 8 Chart Components ───────────────────────────────────────────── */

const TT = { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 };
const TICK = { fontSize: 10, fill: "#94a3b8" };
const fmtDate = (v: string) => v?.slice(0, 7) ?? "";

function DecileNavChart({ data }: { data: Results["decileNav"] | null }) {
  return (
    <ChartCard title="Decile Excess NAV" subtitle="All excess NAV vs universe equal weight">
      {!data?.length ? <Placeholder /> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={TICK} tickFormatter={fmtDate} interval="preserveStartEnd" />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TT} />
            <Line type="monotone" dataKey="D10" stroke="#0d9488" strokeWidth={2} dot={false} name="Top decile" />
            <Line type="monotone" dataKey="D1" stroke="#ef4444" strokeWidth={2} dot={false} name="Bottom decile" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function DecileMeanChart({ data }: { data: Results["decileReturns"] | null }) {
  return (
    <ChartCard title="Decile Mean Returns" subtitle="All grouped mean return"
      badge={data ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${data.monotonic ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700" : "bg-red-900/50 text-red-400 border border-red-700"}`}>{data.monotonic ? "\u2713 Monotonic" : "\u2717 Non-monotonic"}</span> : undefined}>
      {!data?.bars?.length ? <Placeholder /> : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.bars} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="decile" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TT} />
            <ReferenceLine y={data.benchmark} stroke="#94a3b8" strokeDasharray="6 3" />
            <Bar dataKey="mean" radius={[4,4,0,0]}>
              {data.bars.map((_, i) => <Cell key={i} fill={DECILE_COLORS[i + 1] || "#6366f1"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function LongOnlyChart({ data }: { data: Results["longOnly"] | null }) {
  return (
    <ChartCard title="Long-Only NAV" subtitle="All indexed long-only NAV">
      {!data?.length ? <Placeholder /> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={TICK} tickFormatter={fmtDate} interval="preserveStartEnd" />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TT} />
            <Line type="monotone" dataKey="strategy" stroke="#3b82f6" strokeWidth={2} dot={false} name="Long-only" />
            <Line type="monotone" dataKey="index" stroke="#64748b" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Index" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function LongShortChart({ data }: { data: Results["longShort"] | null }) {
  return (
    <ChartCard title="Long-Short NAV" subtitle="All indexed long-short NAV">
      {!data?.length ? <Placeholder /> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={TICK} tickFormatter={fmtDate} interval="preserveStartEnd" />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TT} />
            <Line type="monotone" dataKey="strategy" stroke="#f59e0b" strokeWidth={2} dot={false} name="Long-short" />
            <Line type="monotone" dataKey="index" stroke="#64748b" strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Index" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function ICStabilityChart({ data }: { data: Results["icStability"] | null }) {
  return (
    <ChartCard title="IC Rolling Stability" subtitle="All rolling mean on daily IC">
      {!data?.length ? <Placeholder /> : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={TICK} tickFormatter={fmtDate} interval="preserveStartEnd" />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TT} />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#3b82f6" fillOpacity={0} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#3b82f6" fillOpacity={0.15} />
            <Line type="monotone" dataKey="raw" stroke="#94a3b8" strokeWidth={1} strokeOpacity={0.3} dot={false} name="Raw IC" />
            <Line type="monotone" dataKey="ma" stroke="#1d4ed8" strokeWidth={2} dot={false} name="IC 12-MA" />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="6 3" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function CumulativeICChart({ data }: { data: Results["cumulativeIC"] | null }) {
  return (
    <ChartCard title="Cumulative IC" subtitle={`Mean IC: ${data?.meanIc?.toFixed(4) ?? "—"}  |  ICIR: ${data?.icir?.toFixed(3) ?? "—"}`}>
      {!data?.series?.length ? <Placeholder /> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.series} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={TICK} tickFormatter={fmtDate} interval="preserveStartEnd" />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TT} />
            <Line type="monotone" dataKey="cumIc" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Cumulative IC" />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function ICDecayChart({ data }: { data: Results["icDecay"] | null }) {
  return (
    <ChartCard title="IC Decay" subtitle="Mean IC at different forward periods">
      {!data?.length ? <Placeholder /> : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="period" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TT} />
            <Bar dataKey="ic" fill="#6366f1" name="Mean IC" radius={[4,4,0,0]} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function StyleExposureChart({ data }: { data: Results["styleExposure"] | null }) {
  return (
    <ChartCard title="Style Exposure" subtitle={`R\u00b2 = ${data?.r2?.toFixed(3) ?? "—"}`}>
      {!data?.bars?.length ? <Placeholder /> : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.bars} layout="vertical" margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" tick={TICK} />
            <YAxis type="category" dataKey="factor" tick={TICK} width={72} />
            <Tooltip contentStyle={TT} />
            <Bar dataKey="exposure" fill="#14b8a6" name="Exposure" radius={[0,4,4,0]} />
            <ReferenceLine x={0} stroke="#ef4444" strokeDasharray="4 4" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */

export default function FactorLabPage() {
  const [s, setS] = useState({ factor: "realized_spread" as string, universe: "SP500", from: "2020-01-01", to: "2026-03-28", groups: 10, freq: "Monthly" });
  const dispatch = (partial: Partial<typeof s>) => setS(prev => ({ ...prev, ...partial }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);

  const handleRun = useCallback(async () => {
    setLoading(true); setError(null);
    const p = {
      strategy_id: s.factor, factor_name: s.factor,
      start_date: s.from, end_date: s.to,
      universe: s.universe, n_deciles: s.groups, forward_period: 1,
    };
    try {
      const [r1,r2,r3,r4,r5,r6,r7,r8] = await Promise.all([
        api.post("/factor/decile-nav", p),
        api.post("/factor/decile-returns", p),
        api.post("/factor/longonly-nav", p),
        api.post("/factor/longshort-nav", p),
        api.post("/factor/ic-stability", p),
        api.post("/factor/cumulative-ic", p),
        api.post("/factor/ic-decay", p),
        api.post("/factor/style-exposure", p),
      ]);

      const mapNav = (r: typeof r1) => {
        const d = r.data.dates ?? [];
        return d.map((dt: string, i: number) => ({
          date: dt, D10: r.data.d10_nav?.[i] ?? 0, D1: r.data.d1_nav?.[i] ?? 0,
        }));
      };

      const mapLine = (r: typeof r3, keyA: string, keyB: string) => {
        const d = r.data.dates ?? [];
        return d.map((dt: string, i: number) => ({
          date: dt,
          strategy: r.data[keyA]?.[i] ?? 1,
          index: r.data[keyB]?.[i] ?? 1,
        }));
      };

      const icDates = r5.data.dates ?? [];
      const icRows = icDates.map((dt: string, i: number) => ({
        date: dt,
        raw: r5.data.ic_series?.[i] ?? 0,
        ma: r5.data.ic_ma12?.[i] ?? 0,
        upper: (r5.data.ic_ma12?.[i] ?? 0) + (r5.data.ic_std?.[i] ?? 0),
        lower: (r5.data.ic_ma12?.[i] ?? 0) - (r5.data.ic_std?.[i] ?? 0),
      }));

      setResults({
        decileNav: mapNav(r1),
        decileReturns: {
          bars: (r2.data.deciles ?? []).map((d: number, i: number) => ({ decile: `D${d}`, mean: r2.data.mean_returns?.[i] ?? 0 })),
          benchmark: r2.data.benchmark_return ?? 0,
          monotonic: r2.data.is_monotonic ?? false,
        },
        longOnly: mapLine(r3, "long_nav", "index_nav"),
        longShort: mapLine(r4, "ls_nav", "index_nav"),
        icStability: icRows,
        cumulativeIC: {
          series: (r6.data.dates ?? []).map((dt: string, i: number) => ({ date: dt, cumIc: r6.data.cumulative_ic?.[i] ?? 0 })),
          meanIc: r6.data.mean_ic ?? 0, icir: r6.data.ic_ir ?? 0,
        },
        icDecay: (r7.data.forward_periods ?? []).map((fp: number, i: number) => ({ period: `${fp}M`, ic: r7.data.mean_ic?.[i] ?? 0, icir: r7.data.ic_ir?.[i] ?? 0 })),
        styleExposure: {
          bars: (r8.data.factor_names ?? []).map((f: string, i: number) => ({ factor: f, exposure: r8.data.exposures?.[i] ?? 0, t_stat: r8.data.t_stats?.[i] ?? 0 })),
          r2: r8.data.r_squared ?? 0,
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [s]);

  const name = s.factor.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Top bar */}
      <header className="h-11 flex items-center px-4 border-b border-slate-700 bg-slate-800/80 shrink-0">
        <Link href="/backtest" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Backtest
        </Link>
        <span className="mx-3 text-slate-600">|</span>
        <FlaskConical className="w-4 h-4 text-purple-400" />
        <span className="ml-1.5 text-sm font-semibold">{name} Factor Lab</span>
      </header>

      {/* Body: sidebar + grid */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", flex: 1, minHeight: 0 }}>
        <FactorSidebar state={s} dispatch={dispatch} onRun={handleRun} loading={loading} error={error} />

        {/* 2×4 chart grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "repeat(4,1fr)", gap: 8, padding: 8, overflow: "auto" }}>
          <div className="relative">{loading && <LoadingOverlay />}<DecileNavChart data={results?.decileNav ?? null} /></div>
          <div className="relative">{loading && <LoadingOverlay />}<DecileMeanChart data={results?.decileReturns ?? null} /></div>
          <div className="relative">{loading && <LoadingOverlay />}<LongOnlyChart data={results?.longOnly ?? null} /></div>
          <div className="relative">{loading && <LoadingOverlay />}<LongShortChart data={results?.longShort ?? null} /></div>
          <div className="relative">{loading && <LoadingOverlay />}<ICStabilityChart data={results?.icStability ?? null} /></div>
          <div className="relative">{loading && <LoadingOverlay />}<CumulativeICChart data={results?.cumulativeIC ?? null} /></div>
          <div className="relative">{loading && <LoadingOverlay />}<ICDecayChart data={results?.icDecay ?? null} /></div>
          <div className="relative">{loading && <LoadingOverlay />}<StyleExposureChart data={results?.styleExposure ?? null} /></div>
        </div>
      </div>
    </div>
  );
}
