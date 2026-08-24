"use client";

import { useState } from "react";
import type { BackendFailure } from "@/lib/backendStatus";

/**
 * Shown in place of a panel whose data did not arrive. The point is that the
 * visitor learns which of the three things happened, rather than watching a
 * spinner that will never resolve.
 */
export default function PanelUnavailable({
  failure,
  panel,
  needs,
  onRetry,
}: {
  failure: BackendFailure;
  /** Human name of the panel, e.g. "Backtester". */
  panel: string;
  /** What the panel needs, e.g. "the /api/backtest routes". */
  needs?: string;
  onRetry?: () => void | Promise<void>;
}) {
  const [retrying, setRetrying] = useState(false);

  const copy: Record<BackendFailure, { title: string; body: React.ReactNode; tone: string }> = {
    "not-deployed": {
      title: `${panel} is not available on this deployment`,
      tone: "slate",
      body: (
        <>
          The backend answered, but {needs ?? "the routes this panel needs"} are not
          registered on it. <code>kuant-api</code> only mounts the backtest, advanced
          analysis, code-execution, downloads, factor-lab, agents and risk routers when
          it starts with the full dataset loaded; a small instance runs in{" "}
          <code>LITE_MODE</code> and serves the pre-computed catalogue routes only.
          <br />
          <br />
          This is a deployment configuration, not an outage. Running{" "}
          <code>kuant-api</code> locally with the data present enables it.
        </>
      ),
    },
    unreachable: {
      title: "Backend not responding",
      tone: "amber",
      body: (
        <>
          Nothing answered at <code>/api/health</code>. If the API is on a free tier it
          sleeps after about 15 minutes idle and takes roughly 50 seconds to wake up, so
          the first request after a quiet period usually fails and the next one
          succeeds. That is a cost decision, not a fault.
        </>
      ),
    },
    unauthorized: {
      title: "Not signed in",
      tone: "slate",
      body: <>This panel needs a token. Sign in and come back.</>,
    },
    error: {
      title: `${panel} failed to load`,
      tone: "red",
      body: <>The backend answered with an error. Nothing is being shown rather than showing something made up.</>,
    },
  };

  const c = copy[failure];
  const ring =
    c.tone === "amber"
      ? "border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200"
      : c.tone === "red"
        ? "border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200"
        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300";

  return (
    <div className={`rounded-xl border px-5 py-4 text-sm ${ring}`}>
      <div className="font-semibold mb-1.5">{c.title}</div>
      <div className="text-xs leading-relaxed opacity-90">{c.body}</div>
      {onRetry && failure === "unreachable" && (
        <button
          onClick={async () => {
            setRetrying(true);
            try {
              await onRetry();
            } finally {
              setRetrying(false);
            }
          }}
          disabled={retrying}
          className="mt-3 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-semibold transition"
        >
          {retrying ? "Waking the backend…" : "Retry"}
        </button>
      )}
    </div>
  );
}
