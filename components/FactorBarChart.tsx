"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { BacktestResult } from "@/lib/api";

type Props = { data: BacktestResult["factor"] };

export default function FactorBarChart({ data }: Props) {
  const chartData = data.names.map((n, i) => ({ name: n, beta: data.betas[i] }));

  return (
    <div>
      <div className="text-center text-sm text-slate-600 mb-2">
        <span className="font-semibold">&alpha; = {(data.alpha * 100).toFixed(2)}%</span>
        <span className="mx-3 text-slate-400">|</span>
        <span className="font-semibold">R&sup2; = {data.r2.toFixed(3)}</span>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: any) => v.toFixed(4)} />
          <Bar dataKey="beta" radius={[4, 4, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.beta > 0 ? "#059669" : "#dc2626"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
