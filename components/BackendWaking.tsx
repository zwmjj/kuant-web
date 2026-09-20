"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The cold-start screen.
 *
 * Two things this deliberately does NOT do.
 *
 * It does not claim to know progress. Nothing in a browser can observe how far
 * along a container scheduler is, so a bar that fills to "73%" would be
 * inventing a number -- the same failure as every other fabricated figure this
 * dashboard has been audited for. The bar here is ELAPSED TIME against a
 * stated expectation, it says so on the label, and when it runs past that
 * expectation it stops pretending and says the wake is taking longer than
 * usual rather than parking at 99%.
 *
 * It does not hide the mechanism. A reader who knows what a free-tier PaaS
 * does should be able to read this box and recognise the exact situation, so
 * the copy names the actual steps rather than saying "please wait".
 */

const EXPECTED_SECONDS = 50;
const POLL_MS = 2000;
const GIVE_UP_SECONDS = 180;

export default function BackendWaking({
  onReady,
  onGiveUp,
}: {
  onReady: () => void | Promise<void>;
  onGiveUp?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [state, setState] = useState<"waking" | "ready" | "gave-up">("waking");
  const startedAt = useRef(Date.now());
  const done = useRef(false);

  const poll = useCallback(async () => {
    if (done.current) return;
    try {
      // Poll through the SAME-ORIGIN rewrite in next.config.ts, not the absolute
      // backend URL. A direct cross-origin fetch needs the page's exact origin
      // to be in kuant-api's CORS allow_origins list, which currently names
      // three hosts by hand -- so on any other origin (a Vercel preview
      // deployment, a custom domain, a dev server on a different port) the
      // health check fails even while the backend is perfectly healthy, and
      // this box would spin forever next to a working API. The proxy path has
      // no such dependency.
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        done.current = true;
        setState("ready");
        await onReady();
      }
    } catch {
      // still asleep; the interval will try again
    }
  }, [onReady]);

  useEffect(() => {
    const tick = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(s);
      if (s >= GIVE_UP_SECONDS && !done.current) {
        done.current = true;
        setState("gave-up");
        onGiveUp?.();
      }
    }, 250);
    const p = setInterval(() => void poll(), POLL_MS);
    void poll();
    return () => {
      clearInterval(tick);
      clearInterval(p);
    };
  }, [poll, onGiveUp]);

  const overrun = elapsed > EXPECTED_SECONDS;
  // Capped at 100 so the bar never implies more than "we are past the estimate".
  const pct = Math.min(100, (elapsed / EXPECTED_SECONDS) * 100);

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-5 py-4 text-amber-900 dark:text-amber-200">
      <div className="flex items-baseline justify-between gap-4 mb-1.5">
        <div className="font-semibold text-sm">
          {state === "ready"
            ? "Backend is up"
            : state === "gave-up"
              ? "Backend did not come up"
              : "Waking the backend"}
        </div>
        <div className="text-xs font-mono tabular-nums opacity-80">
          {elapsed}s{!overrun && ` / ~${EXPECTED_SECONDS}s`}
        </div>
      </div>

      {/* Elapsed-time bar. Labelled as such, because it is not progress. */}
      <div
        className="h-1.5 w-full rounded-full bg-amber-200/70 dark:bg-amber-900/50 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={EXPECTED_SECONDS}
        aria-valuenow={Math.min(elapsed, EXPECTED_SECONDS)}
        aria-label="Time elapsed while the backend starts. This is elapsed time, not measured progress."
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
            state === "ready"
              ? "bg-emerald-500"
              : overrun
                ? "bg-amber-600 animate-pulse"
                : "bg-amber-500"
          }`}
          style={{ width: state === "ready" ? "100%" : `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] opacity-60">
        Elapsed time against a typical cold start — not measured progress. Nothing in
        the browser can observe how far along the container is.
      </div>

      <div className="mt-3 text-xs leading-relaxed opacity-90">
        {state === "gave-up" ? (
          <>
            No response after {GIVE_UP_SECONDS} seconds, which is longer than a cold
            start should take. The instance is probably not running at all rather than
            merely asleep — a suspended service, a failed deploy, or a build that never
            finished all look like this from here.
          </>
        ) : (
          <>
            The API runs on a free-tier instance, which is spun down after about 15
            minutes without traffic. This request is what wakes it, and it has to wait
            for the platform to schedule a container, pull the image and start
            <code className="mx-1">uvicorn</code>, after which FastAPI runs its{" "}
            <code>lifespan</code> hook before the first route can answer. Roughly 30–60
            seconds cold; a few hundred milliseconds once warm, until it idles out
            again.
            <br />
            <br />
            This is a cost decision, not a fault. A paid instance does not spin down,
            and the dashboard is a portfolio piece rather than a service anyone depends
            on being hot.
          </>
        )}
      </div>
    </div>
  );
}
