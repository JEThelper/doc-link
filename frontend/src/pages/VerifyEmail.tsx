import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { confirmEmailVerification } from "../api";
import { useAuth } from "../auth";

type State = "verifying" | "done" | "error" | "notoken";

export default function VerifyEmail() {
  const [params]         = useSearchParams();
  const token            = params.get("token") ?? "";
  const { reloadUser }   = useAuth();
  const [state, setState] = useState<State>(token ? "verifying" : "notoken");
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    confirmEmailVerification(token)
      .then(() => { setState("done"); reloadUser().catch(() => {}); })
      .catch(() => setState("error"));
  }, [token, reloadUser]);

  return (
    <main className="auth-page">
      <div className="auth-card">

        <div className="auth-brand-header">
          <Link to="/" className="auth-brand-wordmark" tabIndex={-1}>River</Link>
          <p className="auth-brand-tagline">Email verification</p>
        </div>

        {state === "verifying" && (
          <div className="auth-success-box">
            <span className="material-symbols-outlined auth-success-icon" style={{ color: "var(--color-text-muted)" }} aria-hidden="true">
              hourglass_top
            </span>
            <p className="auth-success-text">Verifying your email…</p>
          </div>
        )}

        {state === "done" && (
          <div className="auth-success-box">
            <span className="material-symbols-outlined auth-success-icon" aria-hidden="true">
              verified
            </span>
            <p className="auth-success-text">
              Your email is verified. You can now make pads private.
            </p>
          </div>
        )}

        {state === "notoken" && (
          <p className="error" role="alert">This link is missing its token.</p>
        )}

        {state === "error" && (
          <p className="error" role="alert">
            This verification link is invalid or has expired.
          </p>
        )}

        <p className="auth-home-link-wrap">
          <Link className="auth-home-link" to="/">
            ← Go home
          </Link>
        </p>
      </div>
    </main>
  );
}
