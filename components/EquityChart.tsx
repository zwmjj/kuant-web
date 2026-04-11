"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import type { BacktestResult } from "@/lib/api";

type Props = { data: BacktestResult["equity"] };

export default function EquityChart({ data }: Props) {
  // Merge strategy + spy + compare into one array keyed by date
  const merged: Record<string, Record<string, number>> = {};
  data.strategy.dates.forEach((d, i) => { merged[d] = { ...merged[d], strategy: data.strategy.values[i] }; });
  data.spy.dates.forEach((d, i) => { merged[d] = { ...merged[d], spy: data.spy.values[i] }; });
  data.drawdown.dates.forEach((d, i) => { merged[d] = { ...merged[d], drawdown: data.drawdown.values[i] }; });
  if (data.compare) {
    data.compare.dates.forEach((d, i) => { merged[d] = { ...merged[d], compare: data.compare!.values[i] }; });
  }
  const chartData = Object.entries(merged)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(0, 7)} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(1)}x`} />
          <Tooltip formatter={(v: any) => `${v.toFixed(2)}x`} labelFormatter={(l) => `Date: ${l}`} />
          <Legend />
          <Line type="monotone" dataKey="strategy" stroke="#6366f1" strokeWidth={2.5} dot={false} name="Strategy" connectNulls />
          <Line type="monotone" dataKey="spy" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="SPY" connectNulls />
          {data.compare && (
            <Line type="monotone" dataKey="compare" stroke="#ec4899" strokeWidth={2} strokeDasharray="3 3" dot={false} name={data.compare.name} connectNulls />
          )}
        </LineChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData} margin={{ top: 0, right: 20, bottom: 5, left: 10 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(0, 7)} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip formatter={(v: any) => `${(v * 100).toFixed(1)}%`} />
          <Area type="monotone" dataKey="drawdown" stroke="#dc2626" fill="#dc262610" strokeWidth={1} name="Drawdown" connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
