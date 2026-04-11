"use client";
import { useState, useEffect } from "react";
import NavShell from "./NavShell";

const SECURE_PIN = "kuant2026";
const SESSION_KEY = "secure_gate_unlocked";

export default function SecureGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      setUnlocked(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === SECURE_PIN) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setUnlocked(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <NavShell>
      <div className="flex items-center justify-center min-h-[80vh]">
        <form onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-lg font-bold mb-1">Security Verification</h2>
          <p className="text-sm text-slate-400 mb-6">This page requires a secondary password</p>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter access password"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl border text-sm text-center font-mono tracking-widest outline-none transition ${
              error
                ? "border-red-500 bg-red-50 dark:bg-red-900/20 animate-shake"
                : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            } text-slate-900 dark:text-slate-100`}
          />
          {error && <p className="text-red-500 text-xs mt-2">Incorrect password</p>}
          <button type="submit"
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold hover:brightness-110 transition">
            Verify
          </button>
        </form>
      </div>
    </NavShell>
  );
}
