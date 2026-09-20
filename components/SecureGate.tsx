"use client";

/**
 * Previously a "Security Verification" screen that compared the typed password
 * against a hardcoded string literal in this file. That is not
 * access control. The constant was compiled into the client bundle and served
 * to every visitor -- it appeared in three chunks under .next/static/chunks/ --
 * and it is in this repository's public git history, so it was readable by
 * View Source, by DevTools, and by anyone who cloned the repo. It kept nobody
 * out while telling users they were behind a password.
 *
 * The three pages it wrapped (/monitor, /risk, /trading) hold nothing that
 * needs protecting: /monitor generates its data in the browser, /risk runs real
 * risk maths over a synthetic portfolio, and /trading has no backend in the
 * public API at all. There was no secret behind the gate.
 *
 * So the gate is gone rather than re-implemented. Anything that genuinely needs
 * authorisation belongs behind the API's JWT check on the server, where the
 * credential is never shipped to the client -- kuant-api already has that in
 * api/routers/auth.py, and the pages that carry real data use it.
 *
 * This component is kept as a pass-through so the three call sites keep working
 * and so this note stays attached to the thing it explains.
 */
export default function SecureGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
