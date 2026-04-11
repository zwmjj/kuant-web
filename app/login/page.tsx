"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

const STATS = [
  { value: "28+", label: "Factors" },
  { value: "3", label: "Markets" },
  { value: "14", label: "Studies" },
  { value: "10K+", label: "Lines" },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push("/dashboard");
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30" />
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>

      {/* Left: Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 p-12">
        <div className="max-w-md">
          <div className="text-8xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent leading-none mb-4">
            Kuant
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Kuant</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">
            Quantitative Research Platform
          </p>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{s.value}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
            {[
              "Multi-factor library: momentum, value, quality, volatility, interaction",
              "Cross-market: US (CRSP) + China A-shares (baostock) + HK (yfinance)",
              "Event-driven backtest with real costs + delisting-adjusted returns",
              "Phase 3+4 SOP audit, 6-gate compliance framework",
              "Web IDE (Monaco editor) custom strategy development",
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-indigo-500 mt-0.5">+</span>
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-2 flex-wrap">
            {["Next.js 16", "FastAPI", "TypeScript", "Recharts", "WRDS", "baostock"].map(t => (
              <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-10 w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="text-5xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent leading-none">Kuant</div>
            <div className="text-sm text-slate-400 mt-1">Kuant Research Platform</div>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
            <p className="text-sm text-slate-400 mt-1">Sign in to your research workspace</p>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition" />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-base tracking-wide hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 disabled:opacity-60">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Signing in...
              </span>
            ) : "Sign In"}
          </button>

          {error && <p className="text-red-500 text-center text-sm mt-3 animate-pulse">{error}</p>}

          <hr className="my-5 border-slate-200 dark:border-slate-700" />
          <button type="button" onClick={() => { setUsername("demo"); setPassword("demo"); }}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            Demo Login — <span className="font-mono">demo / demo</span>
          </button>
        </form>
      </div>
    </div>
  );
}
