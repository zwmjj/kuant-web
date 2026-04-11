"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import type { BacktestResult } from "@/lib/api";

type Props = { data: BacktestResult["distribution"] };

export default function DistributionChart({ data }: Props) {
  // Create histogram bins manually
  const vals = data.bins;
  const min = Math.floor(Math.min(...vals));
  const max = Math.ceil(Math.max(...vals));
  const binSize = Math.max((max - min) / 30, 0.5);
  const bins: { range: string; mid: number; count: number }[] = [];
  for (let lo = min; lo < max; lo += binSize) {
    const hi = lo + binSize;
    const count = vals.filter((v) => v >= lo && v < hi).length;
    bins.push({ range: `${lo.toFixed(1)}%`, mid: +(lo + binSize / 2).toFixed(2), count });
  }

  return (
    <ResponsiveContainer width="100%" height={460}>
      <BarChart data={bins} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="mid" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
        <YAxis tick={{ fontSize: 11 }} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tooltip formatter={(v: any) => [v, "Count"]} labelFormatter={(l) => `Return: ${l}%`} />
        <Bar dataKey="count" fill="rgba(99,102,241,0.4)" stroke="#6366f1" />
        <ReferenceLine x={data.var_95} stroke="#dc2626" strokeDasharray="5 5" label={{ value: `VaR=${data.var_95}%`, fill: "#dc2626", fontSize: 11 }} />
        <ReferenceLine x={data.cvar_95} stroke="#dc2626" strokeDasharray="2 2" label={{ value: `CVaR=${data.cvar_95}%`, fill: "#dc2626", fontSize: 11, position: "insideTopLeft" }} />
        <ReferenceLine x={data.mean} stroke="#059669" label={{ value: `\u03bc=${data.mean}%`, fill: "#059669", fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
