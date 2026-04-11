"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { BacktestResult } from "@/lib/api";

type Props = { data: BacktestResult["yearly"] };

export default function YearlyBarChart({ data }: Props) {
  const chartData = data.years.map((y, i) => ({
    year: y,
    strategy: data.strategy[i],
    benchmark: data.benchmark[i],
    ...(data.compare ? { compare: data.compare[i] } : {}),
  }));

  return (
    <ResponsiveContainer width="100%" height={460}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: any) => `${v.toFixed(1)}%`} />
        <Legend />
        <Bar dataKey="strategy" fill="#6366f1" name="Strategy" radius={[2, 2, 0, 0]} />
        <Bar dataKey="benchmark" fill="#cbd5e1" name="SPY" radius={[2, 2, 0, 0]} />
        {data.compare && <Bar dataKey="compare" fill="#ec4899" name={data.compare_name || "Compare"} radius={[2, 2, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}
