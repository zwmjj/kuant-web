"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend } from "recharts";
import type { BacktestResult } from "@/lib/api";

type Props = { data: BacktestResult["rolling_sharpe"] };

export default function RollingSharpeChart({ data }: Props) {
  const merged: Record<string, Record<string, number>> = {};
  data.strategy.dates.forEach((d, i) => {
    if (!isNaN(data.strategy.values[i])) {
      merged[d] = { ...merged[d], strategy: data.strategy.values[i] };
    }
  });
  if (data.compare) {
    data.compare.dates.forEach((d, i) => {
      if (!isNaN(data.compare!.values[i])) {
        merged[d] = { ...merged[d], compare: data.compare!.values[i] };
      }
    });
  }
  const chartData = Object.entries(merged)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  return (
    <ResponsiveContainer width="100%" height={460}>
      <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(0, 7)} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: any) => v.toFixed(2)} labelFormatter={(l) => `Date: ${l}`} />
        <Legend />
        <ReferenceLine y={0} stroke="#cbd5e1" />
        <ReferenceLine y={1} stroke="#059669" strokeDasharray="5 5" label={{ value: "SR=1", fill: "#059669", fontSize: 11 }} />
        <ReferenceLine y={2} stroke="#a855f7" strokeDasharray="5 5" label={{ value: "SR=2", fill: "#a855f7", fontSize: 11 }} />
        <Area type="monotone" dataKey="strategy" stroke="#6366f1" fill="rgba(99,102,241,0.06)" strokeWidth={2} dot={false} name="Strategy" connectNulls />
        {data.compare && (
          <Line type="monotone" dataKey="compare" stroke="#ec4899" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name={data.compare.name} connectNulls />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
