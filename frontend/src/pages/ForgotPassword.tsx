import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { requestPasswordReset } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [busy, setBusy]   = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await requestPasswordReset(email);
    setBusy(false);
    setSent(true);
  }

  return (
    <main className="auth-page">
      <div className="auth-card">

        <div className="auth-brand-header">
          <Link to="/" className="auth-brand-wordmark" tabIndex={-1}>River</Link>
          <p className="auth-brand-tagline">Reset your password</p>
        </div>

        {sent ? (
          <div className="auth-success-box">
            <span className="material-symbols-outlined auth-success-icon" aria-hidden="true">
              mark_email_read
            </span>
            <p className="auth-success-text">
              If an account exists for <strong>{email}</strong>, we've sent a reset link.
              It expires in 1 hour.
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label className="auth-field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
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
