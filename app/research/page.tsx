"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavShell from "@/components/NavShell";
import { getResearch } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = ["#6366f1", "#ec4899", "#06b6d4", "#f59e0b", "#10b981", "#f97316", "#8b5cf6", "#ef4444", "#64748b"];
const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  "in-progress": "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  planned: "bg-slate-100 dark:bg-slate-700 text-slate-500",
};

function fmt(v: number, type?: string): string {
  if (type === "pct") return (v * 100).toFixed(1) + "%";
  if (type === "pct0") return (v * 100).toFixed(0) + "%";
  if (Math.abs(v) < 0.01) return v.toFixed(4);
  if (Math.abs(v) < 10) return v.toFixed(3);
  return v.toLocaleString();
}

function MiniTable({ data, columns }: { data: any[]; columns?: string[] }) {
  if (!data || data.length === 0) return null;
  const cols = columns || Object.keys(data[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {cols.map(c => <th key={c} className="p-2 text-left font-medium text-slate-500">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
              {cols.map(c => {
                const v = row[c];
                const isNum = typeof v === "number";
                const isPct = c.includes("cagr") || c.includes("mdd") || c.includes("alpha") || c.includes("decay") || c.includes("return") || c.includes("win");
                return (
                  <td key={c} className={`p-2 font-mono ${isNum && v < 0 ? "text-red-500" : ""}`}>
                    {isNum ? (isPct ? fmt(v, "pct") : fmt(v)) : String(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResearchChart({ topic }: { topic: any }) {
  const data = topic.data || {};
  const id = topic.id;

  if (id === "signal_decay_vs_cost") {
    const factors = data.factors || {};
    // Line chart: Sharpe vs penalty for each factor
    const allPenalties = factors[Object.keys(factors)[0]]?.map((r: any) => r.penalty) || [];
    const lineData = allPenalties.map((p: number) => {
      const row: any = { penalty: p };
      for (const [fid, rows] of Object.entries(factors) as any) {
        const match = rows.find((r: any) => r.penalty === p);
        if (match) row[fid] = match.sharpe;
      }
      return row;
    });
    const factorNames = Object.keys(factors);

    // ACF chart
    const acf = data.autocorrelation || {};
    const acfData = Array.from({ length: 12 }, (_, i) => {
      const row: any = { lag: i + 1 };
      for (const [fid, vals] of Object.entries(acf) as any) {
        row[fid] = vals[i];
      }
      return row;
    });

    // Cost scenarios
    const costData: any[] = [];
    for (const [fid, rows] of Object.entries(data.cost_scenarios || {}) as any) {
      rows.forEach((r: any) => costData.push({ ...r, factor: fid }));
    }

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-bold mb-2">Sharpe vs Turnover Penalty</h4>
          <p className="text-[11px] text-slate-400 mb-3">Higher penalty = less frequent rebalancing. Quality factors are robust; momentum decays faster.</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="penalty" fontSize={10} />
              <YAxis fontSize={10} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {factorNames.map((fid, i) => (
                <Line key={fid} type="monotone" dataKey={fid} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-sm font-bold mb-2">Signal Autocorrelation (Half-Life)</h4>
          <p className="text-[11px] text-slate-400 mb-3">ACF dropping below 0.5 indicates half-life. Momentum decays fastest (~5mo), quality is most persistent.</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={acfData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="lag" fontSize={10} label={{ value: "Lag (months)", position: "insideBottom", offset: -3, fontSize: 10 }} />
              <YAxis fontSize={10} domain={[0, 1]} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {Object.keys(acf).map((fid, i) => (
                <Line key={fid} type="monotone" dataKey={fid} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {costData.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Cost Sensitivity (GPA vs MOM12)</h4>
            <MiniTable data={costData} />
          </div>
        )}
      </div>
    );
  }

  if (id === "survivorship_bias_impact") {
    const factors = data.factors || [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { l: "Delisting Records", v: data.delist_stats?.total_records?.toLocaleString() },
            { l: "Applied to Backtest", v: data.delist_stats?.applied?.toLocaleString() },
            { l: "Avg Delist Return", v: fmt(data.delist_stats?.avg_delist_return || 0, "pct") },
            { l: "Performance Delistings", v: data.delist_stats?.perf_delistings?.toLocaleString() },
          ].map(({ l, v }) => (
            <div key={l} className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-400">{l}</div>
              <div className="text-lg font-bold">{v}</div>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={factors}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="factor" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="sharpe_with_delist" name="Sharpe (with delist)">
              {factors.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <MiniTable data={factors} />
      </div>
    );
  }

  if (id === "factor_crowding") {
    const factors = data.factors || [];
    const orth = data.orthogonal || [];
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-bold mb-2">R² vs Alpha (size = Sharpe)</h4>
          <p className="text-[11px] text-slate-400 mb-3">Bottom-right = best (high alpha, low R²). Top-left = worst (crowded, low alpha).</p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="r2" name="R²" fontSize={10} domain={[0.4, 0.95]} label={{ value: "R² (crowding)", position: "insideBottom", offset: -3, fontSize: 10 }} />
              <YAxis dataKey="alpha" name="Alpha" fontSize={10} label={{ value: "Alpha", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => typeof v === "number" ? fmt(v, "pct") : v}
                labelFormatter={() => ""} />
              <Scatter data={factors.map((f: any) => ({ ...f, z: f.sharpe * 300 }))}>
                {factors.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex gap-2 flex-wrap mt-2">
            {factors.map((f: any, i: number) => (
              <span key={f.factor} className="text-[10px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {f.factor}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-bold mb-2">Factor β Exposures</h4>
          <MiniTable data={factors} columns={["factor", "sharpe", "alpha", "r2", "beta_hml", "beta_umd", "crowding"]} />
        </div>
        {orth.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Raw vs Orthogonalized</h4>
            <p className="text-[11px] text-slate-400 mb-2">Stripping size+value exposure reveals purer alpha (lower R², higher OOS).</p>
            <MiniTable data={orth} />
          </div>
        )}
      </div>
    );
  }

  if (id === "regime_timing") {
    const factors = data.factors || [];
    const blend = data.blend_comparison || {};
    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={factors}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="factor" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="base_sharpe" name="Base" fill="#6366f1" />
            <Bar dataKey="regime_sharpe" name="Regime" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
        <MiniTable data={factors} />
        {blend.base && (
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-bold mb-2">Blend (GPA40+ROE35+MOM25)</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-400">Base</div>
                <div>Sharpe: <b>{blend.base.sharpe}</b> | MDD: <b>{fmt(blend.base.mdd, "pct")}</b> | CAGR: <b>{fmt(blend.base.cagr, "pct")}</b></div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Regime-Adjusted</div>
                <div>Sharpe: <b>{blend.regime.sharpe}</b> | MDD: <b>{fmt(blend.regime.mdd, "pct")}</b> | CAGR: <b>{fmt(blend.regime.cagr, "pct")}</b></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (id === "multifactor_construction") {
    const combos = data.combos || [];
    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={combos}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" fontSize={9} angle={-20} textAnchor="end" height={60} />
            <YAxis fontSize={10} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="sharpe" name="Full Sharpe" fill="#6366f1" />
            <Bar dataKey="oos_sharpe" name="OOS Sharpe" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
        <MiniTable data={combos} />
      </div>
    );
  }

  if (id === "execution_model") {
    const costs = data.cost_impact || [];
    const adv = data.adv_stats;
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-bold mb-2">Cumulative Cost Impact (GPA factor)</h4>
          <p className="text-[11px] text-slate-400 mb-3">Each bar shows Sharpe as we add cost components. Market impact is the largest single cost.</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costs}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" fontSize={9} angle={-15} textAnchor="end" height={60} />
              <YAxis fontSize={10} domain={[0.9, 1.1]} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="sharpe" name="Sharpe">
                {costs.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? "#10b981" : i === costs.length - 1 ? "#ef4444" : COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {adv && (
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-bold mb-2">ADV Distribution (Monthly $ Volume)</h4>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div><div className="text-[10px] text-slate-400">Median</div><div className="font-bold">${adv.median?.toLocaleString()}</div></div>
              <div><div className="text-[10px] text-slate-400">25th-75th</div><div className="font-bold">${adv.p25?.toLocaleString()} — ${adv.p75?.toLocaleString()}</div></div>
              <div><div className="text-[10px] text-slate-400">Below $50K</div><div className="font-bold">{adv.below_50k} / {adv.total}</div></div>
            </div>
          </div>
        )}
        <MiniTable data={costs} />
      </div>
    );
  }

  if (id === "optimization_diminishing") {
    const layers = data.layers || [];
    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={layers}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="layer" fontSize={8} angle={-15} textAnchor="end" height={70} />
            <YAxis fontSize={10} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="sharpe" name="Sharpe" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
        <MiniTable data={layers} columns={["layer", "sharpe", "mdd", "cagr", "description"]} />
      </div>
    );
  }

  if (id === "equity_vol_factors") {
    const audit = data.vol_factor_audit || [];
    const strats = data.vol_strategies || [];
    const regime = data.vol_regime || [];
    const decayD = data.vol_decay || {};
    const rolling = data.vol_rolling_sharpe || {};

    // Decay line chart data
    const decayFactors = Object.keys(decayD);
    const decayPenalties = decayD[decayFactors[0]]?.map((r: any) => r.penalty) || [];
    const decayLineData = decayPenalties.map((p: number) => {
      const row: any = { penalty: p };
      for (const fid of decayFactors) {
        const match = decayD[fid]?.find((r: any) => r.penalty === p);
        if (match) row[fid] = match.sharpe;
      }
      return row;
    });

    // Rolling sharpe data
    const rollingFactors = Object.keys(rolling);
    const rollingPeriods = rolling[rollingFactors[0]]?.map((r: any) => r.period) || [];
    const rollingLineData = rollingPeriods.map((p: string) => {
      const row: any = { period: p };
      for (const fid of rollingFactors) {
        const match = rolling[fid]?.find((r: any) => r.period === p);
        if (match) row[fid] = match.sharpe;
      }
      return row;
    });

    return (
      <div className="space-y-6">
        {/* Factor audit */}
        <div>
          <h4 className="text-sm font-bold mb-2">Vol Factor Comparison (full sample, real costs + delisting)</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={audit}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="factor" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sharpe" name="Full Sharpe" fill="#6366f1" />
              <Bar dataKey="oos_sharpe" name="OOS Sharpe" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <MiniTable data={audit} columns={["factor", "sharpe", "oos_sharpe", "decay", "alpha", "r2", "mdd", "calmar"]} />
        </div>

        {/* Strategies */}
        <div>
          <h4 className="text-sm font-bold mb-2">Vol Strategies & Combinations</h4>
          <p className="text-[11px] text-slate-400 mb-3">Vol × Quality interactions dramatically improve standalone vol factors. downvol×gpa and defensive combo are best.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={strats}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={8} angle={-25} textAnchor="end" height={80} />
              <YAxis fontSize={10} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="sharpe" name="Sharpe">
                {strats.map((s: any, i: number) => (
                  <Cell key={i} fill={s.type === "vol_x_quality" ? "#10b981" : s.type === "defensive" || s.type === "vol_quality" ? "#6366f1" : "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <MiniTable data={strats} />
        </div>

        {/* Regime */}
        {regime.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Performance by Market Regime (High vs Low Vol)</h4>
            <MiniTable data={regime} />
          </div>
        )}

        {/* Signal decay */}
        {decayFactors.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Signal Persistence (Sharpe vs Turnover Penalty)</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={decayLineData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="penalty" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {decayFactors.map((fid, i) => (
                  <Line key={fid} type="monotone" dataKey={fid} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Rolling sharpe */}
        {rollingFactors.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Rolling 3Y Sharpe (Factor Stability Over Time)</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={rollingLineData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="period" fontSize={9} />
                <YAxis fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {rollingFactors.map((fid, i) => (
                  <Line key={fid} type="monotone" dataKey={fid} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (id === "cn_factors") {
    const factorProxies = data.cn_factor_proxies || [];
    const regime = data.us_vol_cn_regime || [];
    const vgCycle = data.value_growth_cycle || [];
    const crossCorr = data.cross_correlation;

    return (
      <div className="space-y-6">
        {/* Factor proxies */}
        <div>
          <h4 className="text-sm font-bold mb-2">A-Share Factor Proxies (Long-Short Index Returns)</h4>
          <p className="text-[11px] text-slate-400 mb-3">Constructed from CSI style indices. LowVol is the strongest factor in China (Sh=0.93). Value (HML) has near-zero Sharpe — it cycles.</p>
          {factorProxies.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={factorProxies}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="factor" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sharpe" name="Full Sharpe" fill="#ef4444" />
                <Bar dataKey="oos_sharpe" name="OOS (2021+)" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <MiniTable data={factorProxies} columns={["factor", "sharpe", "is_sharpe", "oos_sharpe", "cagr", "mdd", "n_months"]} />
        </div>

        {/* Value-Growth cycle */}
        {vgCycle.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">A-Share Value vs Growth Cycle</h4>
            <p className="text-[11px] text-slate-400 mb-3">A-share value/growth leadership flips every ~3 years. 2019-21 was extreme Growth; 2022-25 is extreme Value.</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vgCycle}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="period" fontSize={10} />
                <YAxis fontSize={10} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => typeof v === "number" ? `${(v*100).toFixed(1)}%` : v} />
                <Bar dataKey="cumulative_return" name="Value - Growth Return">
                  {vgCycle.map((d: any, i: number) => (
                    <Cell key={i} fill={d.cumulative_return > 0 ? "#ef4444" : "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <MiniTable data={vgCycle} />
          </div>
        )}

        {/* US vol regime impact */}
        {regime.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">US Volatility Regime Impact on A-Shares</h4>
            <p className="text-[11px] text-slate-400 mb-3">US-CN correlation ~0.5. Chinese indices perform differently depending on US vol regime.</p>
            <MiniTable data={regime} />
          </div>
        )}

        {/* Cross-market correlation */}
        {crossCorr && (
          <div>
            <h4 className="text-sm font-bold mb-2">Cross-Market Correlation Matrix</h4>
            <div className="overflow-x-auto">
              <table className="mx-auto text-[10px]">
                <thead>
                  <tr>
                    <th></th>
                    {crossCorr.labels.map((l: string) => (
                      <th key={l} className="p-1 text-slate-500 -rotate-45 origin-bottom-left h-16">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {crossCorr.labels.map((label: string, i: number) => (
                    <tr key={label}>
                      <td className="text-right pr-2 text-slate-500 font-medium">{label}</td>
                      {crossCorr.values[i].map((v: number, j: number) => {
                        const abs = Math.abs(v);
                        const r = v > 0 ? Math.round(abs * 200) : 0;
                        const b = v < 0 ? Math.round(abs * 200) : 0;
                        return (
                          <td key={j} className="p-1 text-center w-8 h-8 font-mono"
                            style={{ backgroundColor: `rgba(${r},${Math.round(abs*50)},${b},${Math.min(abs*1.2,0.7)})`,
                                     color: abs > 0.5 ? 'white' : undefined }}>
                            {v.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (id === "cross_market_robustness") {
    const comparison = data.factor_comparison || [];
    const scores = data.robustness_scores || [];
    const xcorr = data.cross_factor_correlation || [];
    const regimeR = data.regime_robustness || [];

    return (
      <div className="space-y-6">
        {/* US vs CN bar chart */}
        <div>
          <h4 className="text-sm font-bold mb-2">Factor Sharpe: US vs China</h4>
          <p className="text-[11px] text-slate-400 mb-3">Blue = US (stock-level CRSP), Red = CN (index proxy). Low-Vol is the only factor robust in both markets.</p>
          {comparison.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparison}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="factor" fontSize={9} angle={-15} textAnchor="end" height={50} />
                <YAxis fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="us_sharpe" name="US" fill="#6366f1" />
                <Bar dataKey="cn_sharpe" name="China" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Robustness scores */}
        {scores.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Robustness Score (0-1, multi-dimensional)</h4>
            <p className="text-[11px] text-slate-400 mb-3">Score = average of US full, CN full, US OOS, CN OOS, cross-market decorrelation. Higher = more robust across markets.</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" fontSize={10} domain={[0, 0.8]} />
                <YAxis dataKey="factor" type="category" fontSize={10} width={110} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="score" name="Robustness Score">
                  {scores.map((s: any, i: number) => (
                    <Cell key={i} fill={s.score > 0.5 ? "#10b981" : s.score > 0.35 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <MiniTable data={scores} columns={["factor", "score", "us_sharpe", "cn_sharpe", "cross_corr", "verdict"]} />
          </div>
        )}

        {/* Cross-market factor correlation */}
        {xcorr.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">US-CN Factor Return Correlation</h4>
            <p className="text-[11px] text-slate-400 mb-3">Near-zero correlations = excellent cross-market diversification potential. Negative = natural hedge.</p>
            <MiniTable data={xcorr} />
          </div>
        )}

        {/* Regime robustness */}
        {regimeR.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Regime-Conditional: Calm vs Crisis</h4>
            <p className="text-[11px] text-slate-400 mb-3">Factor Sharpe in calm (US vol below median) vs crisis (US vol above median) periods. Both US and CN shown.</p>
            <MiniTable data={regimeR} />
          </div>
        )}
      </div>
    );
  }

  if (id === "industry_rotation") {
    const indStats = data.industry_stats || [];
    const momDeciles = data.momentum_deciles || [];
    const rollingInd = data.industry_momentum_rolling || [];
    const indMom = data.industry_momentum || {};

    return (
      <div className="space-y-6">
        {indMom.sharpe != null && (
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 flex gap-6 text-sm">
            <span>Industry Momentum: <b>Sharpe {indMom.sharpe}</b></span>
            <span>IS: <b>{indMom.is_sharpe}</b></span>
            <span>OOS: <b>{indMom.oos_sharpe}</b></span>
            <span>CAGR: <b>{fmt(indMom.cagr, "pct")}</b></span>
            <span>MDD: <b>{fmt(indMom.mdd, "pct")}</b></span>
          </div>
        )}
        {indStats.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">10 Industry Sharpe (2000-2025)</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={indStats}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="industry" fontSize={9} />
                <YAxis fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="sharpe" name="Sharpe">
                  {indStats.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {momDeciles.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Momentum Decile Returns</h4>
            <MiniTable data={momDeciles} />
          </div>
        )}
        {rollingInd.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Industry Momentum Rolling 3Y Sharpe</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={rollingInd}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="period" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="sharpe" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (id === "new_factors") {
    const factors = data.individual_factors || {};
    const combos = data.combo_strategies || {};
    const factorList = Object.entries(factors).map(([k, v]: [string, any]) => ({
      factor: k, sharpe_full: v.sharpe_full, sharpe_oos: v.sharpe_oos,
      cagr: v.cagr, max_dd: v.max_dd, alpha: v.ff5_alpha, r2: v.ff5_r2,
    }));
    const comboList = Object.entries(combos).map(([k, v]: [string, any]) => ({
      name: k, sharpe: v.sharpe_full, oos: v.sharpe_oos, mdd: v.max_dd, alpha: v.ff5_alpha,
    }));

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-bold mb-2">New Factors: Full vs OOS Sharpe</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={factorList.sort((a, b) => b.sharpe_full - a.sharpe_full)}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="factor" fontSize={8} angle={-20} textAnchor="end" height={60} />
              <YAxis fontSize={10} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sharpe_full" name="Full Sharpe" fill="#6366f1" />
              <Bar dataKey="sharpe_oos" name="OOS Sharpe" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <MiniTable data={factorList} />
        </div>
        {comboList.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">Combo Strategies</h4>
            <MiniTable data={comboList} />
          </div>
        )}
      </div>
    );
  }

  if (id === "hk_factors") {
    const factors = data.factors || [];
    const strats = data.strategies || [];
    const crossMkt = data.cross_market || [];

    return (
      <div className="space-y-6">
        {factors.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">HK Factor Performance (HSI, long-only, stamp tax 13bp)</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={factors}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="factor" fontSize={8} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sharpe" name="Full Sharpe" fill="#f59e0b" />
                <Bar dataKey="oos_sharpe" name="OOS Sharpe" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            <MiniTable data={factors} columns={["factor", "name", "rating", "sharpe", "oos_sharpe", "decay", "mdd", "excess"]} />
          </div>
        )}
        {strats.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">HK Combo Strategies</h4>
            <MiniTable data={strats} columns={["name", "display_name", "rating", "sharpe", "oos_sharpe", "mdd", "excess"]} />
          </div>
        )}
        {crossMkt.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-2">3-Market Factor Comparison: US vs CN vs HK</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={crossMkt}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="factor" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="us_sharpe" name="US" fill="#6366f1" />
                <Bar dataKey="cn_sharpe" name="China" fill="#ef4444" />
                <Bar dataKey="hk_sharpe" name="HK" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
            <MiniTable data={crossMkt} />
          </div>
        )}
      </div>
    );
  }

  if (id === "is_oos_stability") {
    const factors = data.factors || [];
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-bold mb-2">IS Sharpe vs OOS Sharpe</h4>
          <p className="text-[11px] text-slate-400 mb-3">Dots above the diagonal = OOS better than IS. Below = decay. Labels show factor names.</p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="is_sharpe" name="IS Sharpe" fontSize={10} domain={[0, 1.4]}
                label={{ value: "IS Sharpe", position: "insideBottom", offset: -3, fontSize: 10 }} />
              <YAxis dataKey="oos_sharpe" name="OOS Sharpe" fontSize={10} domain={[0, 1.5]}
                label={{ value: "OOS Sharpe", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }}
                formatter={(v: any) => typeof v === "number" ? v.toFixed(2) : v} />
              <Scatter data={factors}>
                {factors.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex gap-2 flex-wrap mt-2">
            {factors.map((f: any, i: number) => (
              <span key={f.factor} className="text-[10px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {f.factor} (IS:{f.is_sharpe} OOS:{f.oos_sharpe})
              </span>
            ))}
          </div>
        </div>
        <MiniTable data={factors} />
      </div>
    );
  }

  // Fallback: show raw data as table
  return (
    <div className="text-xs text-slate-400">
      <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto max-h-60">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function ResearchPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    getResearch()
      .then(d => setTopics(d.topics || []))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <NavShell><div className="flex items-center justify-center h-[80vh] text-slate-400">Loading research...</div></NavShell>;
  }

  const categories = [...new Set(topics.map(t => t.category))];
  const filtered = catFilter === "all" ? topics : topics.filter(t => t.category === catFilter);
  const completed = topics.filter(t => t.status === "completed").length;

  return (
    <NavShell>
      <div className="max-w-6xl mx-auto px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Research Library</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {completed}/{topics.length} studies completed with real computed data and interactive charts.
          </p>
        </div>

        <div className="flex gap-1.5 mb-5 flex-wrap">
          <button onClick={() => setCatFilter("all")}
            className={`text-xs px-2.5 py-1 rounded-full transition ${catFilter === "all" ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>
            All ({topics.length})
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`text-xs px-2.5 py-1 rounded-full transition ${catFilter === c ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(topic => {
            const isOpen = expanded === topic.id;
            return (
              <div key={topic.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all">
                <button onClick={() => setExpanded(isOpen ? null : topic.id)}
                  className="w-full text-left p-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                  <span className="text-3xl">{topic.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base">{topic.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_STYLE[topic.status]}`}>{topic.status}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{topic.abstract}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {topic.tags.map((t: string) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400">{t}</span>
                      ))}
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 mt-1 ${isOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 border-t border-slate-100 dark:border-slate-700 pt-4">
                    <ResearchChart topic={topic} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </NavShell>
  );
}
