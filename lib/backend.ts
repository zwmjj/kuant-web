/**
 * Single source of truth for the backend origin.
 *
 * Two pages used to hardcode "http://127.0.0.1:8000". That works on a laptop
 * and fails in every deployment: the URL points at the *visitor's* machine,
 * and a page served over https is not allowed to issue http requests at all,
 * so the browser blocks the call as mixed content before it leaves. The
 * /agents and /ide panels were dead for every visitor.
 *
 * NEXT_PUBLIC_API_URL is inlined at build time, so it must be set in the
 * Vercel project settings, not only in .env.local.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

/** Absolute URL for a backend path, e.g. backendPath("/api/agents/tasks"). */
export function backendPath(path: string): string {
  return `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * True when the app is served over https but the configured backend is http.
 * Every request will be blocked by the browser, so the UI should say so
 * rather than spinning forever on a request that can never complete.
 */
export function isMixedContentBlocked(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:" && BACKEND_URL.startsWith("http://");
}
