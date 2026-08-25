"use client";


/**
 * Why this exists.
 *
 * Most panels used to swallow backend failures with `.catch(() => {})`, so a
 * missing endpoint rendered as "Loading..." forever or as an empty list. A
 * visitor could not tell a broken page from a slow one from an empty one.
 *
 * There are three genuinely different failures here and they deserve three
 * different messages:
 *
 *   not-deployed  The backend is up and answered, but this route does not
 *                 exist on it. kuant-api registers backtest/advanced/code/
 *                 downloads/factor_lab/websocket/agents/risk only when
 *                 LITE_MODE is off, because those need the WRDS/CRSP dataset
 *                 loaded at startup. On a small instance that is the normal
 *                 configuration, not an outage.
 *   unreachable   Nothing answered. On a free-tier host the service sleeps
 *                 after idle and takes ~50s to wake, so this is often
 *                 temporary and a retry is the right offer.
 *   unauthorized  401/403 -- the token is missing or expired.
 *
 * Guessing between them in the UI would be another unfounded claim, so the
 * classification is made from what the response actually was.
 */
export type BackendFailure = "not-deployed" | "unreachable" | "unauthorized" | "error";

export interface PanelState {
  status: "idle" | "loading" | "ok" | "failed";
  failure?: BackendFailure;
  detail?: string;
}

/** Classify a fetch outcome. Pass the Response, or the thrown error. */
export function classify(resOrError: Response | unknown): BackendFailure {
  if (resOrError instanceof Response) {
    if (resOrError.status === 404) return "not-deployed";
    if (resOrError.status === 401 || resOrError.status === 403) return "unauthorized";

    // Panel requests go through next.config.ts's rewrite, so the browser talks
    // to Next and Next talks to the API. When the upstream is unreachable the
    // browser therefore sees a 5xx FROM NEXT, not a failed connection -- Next
    // 16 returns 500 for a refused upstream. Reading that as "the backend
    // answered with an error" is exactly backwards: it never answered. Treat
    // the whole 5xx family reached through the proxy as unreachable, which is
    // also the correct reading for 502/503/504 from any reverse proxy.
    if (resOrError.status >= 500) return "unreachable";
    return "error";
  }
  // A thrown TypeError from fetch means the request never completed:
  // DNS, connection refused, CORS, or a sleeping host.
  return "unreachable";
}

/**
 * Fetch JSON and classify the failure instead of swallowing it.
 * Returns either {ok: true, data} or {ok: false, failure}.
 */
export async function fetchPanel<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; failure: BackendFailure }> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return { ok: false, failure: classify(res) };
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    return { ok: false, failure: classify(e) };
  }
}

/**
 * Is the backend answering at all? Used to separate "asleep" from "route absent".
 *
 * Goes through the same-origin rewrite rather than the absolute backend URL: a
 * direct cross-origin probe would depend on this page's origin appearing in
 * kuant-api's hand-maintained CORS allow_origins list, and would report a
 * healthy backend as offline from any origin not on it.
 */
export async function probeBackend(): Promise<"online" | "offline"> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    return res.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}
