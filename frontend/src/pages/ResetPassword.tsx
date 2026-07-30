import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { confirmPasswordReset } from "../api";

export default function ResetPassword() {
  const [params]            = useSearchParams();
  const token               = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [busy, setBusy]     = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">

        <div className="auth-brand-header">
          <Link to="/" className="auth-brand-wordmark" tabIndex={-1}>River</Link>
          <p className="auth-brand-tagline">Choose a new password</p>
        </div>

        {!token ? (
          <p className="error" role="alert">
            This link is missing its token. Request a new reset email.
          </p>
        ) : done ? (
          <div className="auth-success-box">
            <span className="material-symbols-outlined auth-success-icon" aria-hidden="true">
              check_circle
            </span>
            <p className="auth-success-text">
              Your password has been reset.{" "}
              <Link className="text-link" to="/login">Sign in now →</Link>
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label className="auth-field">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                autoFocus
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
            {error && (
              <p className="error" role="alert">{error}</p>
            )}
            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={busy}>
              {busy ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}

        <p className="auth-home-link-wrap">
          <Link className="auth-home-link" to="/login">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
