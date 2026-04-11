"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import NavShell from "@/components/NavShell";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Template { id: string; name: string; description: string; code: string; }
interface GateResult { name: string; passed: boolean; value: number; }

const DEFAULT_CODE = `"""Write your strategy here.

For BACKTEST mode: define generate_signal(data) -> DataFrame
For RESEARCH mode: define run_research(data) -> dict
"""
import numpy as np
import pandas as pd
from qf.signals import SignalGenerator

def generate_signal(data):
    sg = SignalGenerator()
    returns = data['returns']
    mktcap = data['mktcap']

    # Your signal logic here
    mom = sg.multi_timeframe_momentum(returns)
    signal = sg.cross_sectional_rank(mom)

    # Universe filter
    pct = mktcap.quantile(0.75, axis=1)
    cap_mask = mktcap.ge(pct, axis=0)
    signal = signal.where(cap_mask.reindex(index=signal.index, columns=signal.columns))

    return signal
`;

export default function IDEPage() {
  const router = useRouter();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [mode, setMode] = useState<"backtest" | "research">("backtest");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTab, setActiveTab] = useState("results");
  const [theme, setTheme] = useState("vs-dark");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/login"); return; }
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "vs-dark" : "light");
    fetch("/api/code/templates", { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => setTemplates(d.templates || []))
      .catch(() => {});
  }, [router]);

  const runCode = useCallback(async () => {
    setRunning(true); setResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://127.0.0.1:8000/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, mode }),
      });
      const data = await res.json();
      setResult(data);
      setActiveTab("results");
    } catch (e: any) {
      setResult({ error: e.message });
    } finally { setRunning(false); }
  }, [code, mode]);

  const loadTemplate = (t: Template) => {
    setCode(t.code);
    setMode(t.code.includes("run_research") ? "research" : "backtest");
  };

  return (
    <NavShell>
      <div className="flex h-[calc(100vh-48px)]">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-700">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <button onClick={runCode} disabled={running}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-medium hover:brightness-110 disabled:opacity-50 transition flex items-center gap-1.5">
              {running ? (
                <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Running...</>
              ) : "▶ Run"}
            </button>
            <select value={mode} onChange={e => setMode(e.target.value as any)}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <option value="backtest">Backtest Mode</option>
              <option value="research">Research Mode</option>
            </select>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-1" />
            <select value="" onChange={e => { const t = templates.find(x => x.id === e.target.value); if (t) loadTemplate(t); }}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <option value="">Load Template...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="flex-1" />
            <span className="text-[10px] text-slate-400">{mode === "backtest" ? "define generate_signal(data)" : "define run_research(data)"}</span>
          </div>
          {/* Monaco Editor */}
          <div className="flex-1">
            <MonacoEditor
              height="100%"
              language="python"
              theme={theme}
              value={code}
              onChange={(v) => setCode(v || "")}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 4,
                automaticLayout: true,
                padding: { top: 8 },
              }}
            />
          </div>
        </div>

        {/* Right: Results */}
        <div className="w-[480px] flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
          {/* Result tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {["results", "gates", "attribution", "console"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  activeTab === tab
                    ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!result && !running && (
              <div className="text-center text-slate-400 dark:text-slate-500 mt-20">
                <div className="text-4xl mb-3">▶</div>
                <div className="text-sm">Write code and click Run</div>
              </div>
            )}

            {running && (
              <div className="text-center text-slate-400 mt-20">
                <div className="text-4xl mb-3 animate-spin">⏳</div>
                <div className="text-sm">Running...</div>
              </div>
            )}

            {result?.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">Error</div>
                <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono">{result.error}</pre>
                {result.traceback && (
                  <pre className="text-[10px] text-red-500 mt-2 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">{result.traceback}</pre>
                )}
              </div>
            )}

            {/* Backtest results */}
            {result?.status === "ok" && result.mode === "backtest" && activeTab === "results" && (
              <div className="space-y-4">
                <div className="text-xs text-slate-400">Completed in {result.elapsed}s | Signal: {result.signal_shape?.[0]}m × {result.signal_shape?.[1]} stocks | Coverage: ~{result.signal_coverage}/month</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "Sharpe", v: result.metrics?.sharpe, fmt: (v:number) => v.toFixed(2), good: (v:number) => v >= 1.0 },
                    { l: "CAGR", v: result.metrics?.cagr, fmt: (v:number) => (v*100).toFixed(1)+"%", good: (v:number) => v > 0.1 },
                    { l: "MaxDD", v: result.metrics?.max_drawdown, fmt: (v:number) => (v*100).toFixed(1)+"%", good: (v:number) => v > -0.25 },
                    { l: "Sortino", v: result.metrics?.sortino, fmt: (v:number) => v.toFixed(2), good: (v:number) => v >= 1.5 },
                    { l: "Win Rate", v: result.metrics?.win_rate, fmt: (v:number) => (v*100).toFixed(0)+"%", good: (v:number) => v > 0.55 },
                    { l: "Alpha", v: result.attribution?.alpha, fmt: (v:number) => (v*100).toFixed(1)+"%", good: (v:number) => v > 0.03 },
                    { l: "IS Sharpe", v: result.is_metrics?.sharpe, fmt: (v:number) => v.toFixed(2), good: () => true },
                    { l: "OOS Sharpe", v: result.oos_metrics?.sharpe, fmt: (v:number) => v.toFixed(2), good: (v:number) => v > 0.5 },
                    { l: "Decay", v: result.sharpe_decay, fmt: (v:number) => (v*100).toFixed(0)+"%", good: (v:number) => v < 0.5 },
                    { l: "Calmar", v: result.calmar, fmt: (v:number) => v.toFixed(2), good: (v:number) => v > 0.5 },
                    { l: "DSR z", v: result.dsr_z, fmt: (v:number) => v.toFixed(2), good: (v:number) => v > 1.0 },
                    { l: "R²", v: result.attribution?.r2, fmt: (v:number) => v.toFixed(2), good: (v:number) => v < 0.65 },
                  ].map(({ l, v, fmt, good }) => (
                    <div key={l} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-center">
                      <div className="text-[10px] text-slate-400">{l}</div>
                      <div className={`text-sm font-bold ${v != null && good(v) ? "text-emerald-600" : "text-slate-700 dark:text-slate-200"}`}>
                        {v != null ? fmt(v) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gates */}
            {result?.status === "ok" && result.mode === "backtest" && activeTab === "gates" && (
              <div className="space-y-3">
                <div className="text-sm font-bold">Gate Check: {result.gates_passed}/6</div>
                {result.gates?.map((g: GateResult) => (
                  <div key={g.name} className="flex items-center gap-2 text-sm">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${g.passed ? "bg-emerald-500" : "bg-red-500"}`}>
                      {g.passed ? "✓" : "✗"}
                    </span>
                    <span className="flex-1">{g.name}</span>
                    <span className="font-mono text-xs text-slate-500">{g.value.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Attribution */}
            {result?.status === "ok" && result.mode === "backtest" && activeTab === "attribution" && (
              <div className="space-y-3">
                <div className="text-sm font-bold">FF5 Factor Attribution</div>
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Alpha (annual)</span>
                    <span className={`font-bold ${(result.attribution?.alpha || 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {((result.attribution?.alpha || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>R²</span>
                    <span className={`font-bold ${(result.attribution?.r2 || 0) > 0.7 ? "text-red-500" : ""}`}>
                      {(result.attribution?.r2 || 0).toFixed(3)}
                    </span>
                  </div>
                  {Object.entries(result.attribution?.betas || {}).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span>Beta ({k})</span>
                      <span className="font-mono">{v.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {(result.attribution?.r2 || 0) > 0.7 ? "⚠ High R² — signal may be crowded (replicating known factors)"
                    : (result.attribution?.r2 || 0) > 0.5 ? "Moderate R² — some factor exposure"
                    : "✓ Low R² — independent alpha source"}
                </div>
              </div>
            )}

            {/* Console output */}
            {activeTab === "console" && (
              <div>
                <div className="text-sm font-bold mb-2">Console Output</div>
                <pre className="bg-slate-900 text-green-400 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap min-h-[200px] max-h-[60vh] overflow-y-auto">
                  {result?.stdout || "(no output)"}
                </pre>
              </div>
            )}

            {/* Research results */}
            {result?.status === "ok" && result.mode === "research" && activeTab === "results" && (
              <div className="space-y-4">
                <div className="text-xs text-slate-400">Completed in {result.elapsed}s</div>
                {result.research?.title && <div className="text-sm font-bold">{result.research.title}</div>}
                {result.research?.description && <div className="text-xs text-slate-500">{result.research.description}</div>}
                {result.research?.results && Array.isArray(result.research.results) && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                          {Object.keys(result.research.results[0] || {}).map(k => (
                            <th key={k} className="p-2 text-left font-medium">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.research.results.map((row: any, i: number) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                            {Object.values(row).map((v: any, j: number) => (
                              <td key={j} className="p-2 font-mono">
                                {typeof v === "number" ? (Math.abs(v) < 1 ? (v*100).toFixed(1)+"%" : v.toFixed(3)) : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </NavShell>
  );
}
