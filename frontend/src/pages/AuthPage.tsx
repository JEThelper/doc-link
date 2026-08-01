import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth";

interface Props {
  mode: "login" | "signup";
}

const RESERVED_USERNAMES = new Set([
  "login", "signup", "api", "account", "admin", "static",
  "assets", "raw", "new", "health", "about",
]);
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_]|-(?!-)){1,38}[a-z0-9]$/;

function validateUsername(raw: string): string | null {
  const u = raw.trim().toLowerCase();
  if (u.length < 3 || u.length > 40) return "Username must be between 3 and 40 characters.";
  if (u.includes("--")) return "Username cannot contain consecutive hyphens.";
  if (!USERNAME_RE.test(u)) return "Use lowercase letters, numbers, hyphens, and underscores; start and end with a letter or number.";
  if (RESERVED_USERNAMES.has(u)) return "That username is reserved.";
  return null;
}

export default function AuthPage({ mode }: Props) {
  const navigate = useNavigate();
  const { user, login, signup } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const isSignup = mode === "signup";
  const usernameError = isSignup && username ? validateUsername(username) : null;

  useEffect(() => {
    if (user) {
      const next = new URLSearchParams(window.location.search).get("next") || "/account/pads";
      // Only allow relative paths that start with a single slash — blocks //evil.com
      // and any protocol-relative or absolute URL redirects.
      const safe = /^\/[^/]/.test(next) ? next : "/account/pads";
      navigate(safe, { replace: true });
    }
  }, [navigate, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (isSignup) {
      const uErr = validateUsername(username);
      if (uErr) { setError(uErr); return; }
    }
    setBusy(true);
    try {
      if (isSignup) {
        await signup(email, password, username.trim().toLowerCase());
      } else {
        await login(email, password);
      }
      const next = new URLSearchParams(window.location.search).get("next") || "/account/pads";
      const safe = /^\/[^/]/.test(next) ? next : "/account/pads";
      navigate(safe, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>

        {/* Brand header */}
        <div className="auth-brand-header">
          <Link to="/" className="auth-brand-wordmark" tabIndex={-1}>River</Link>
          <p className="auth-brand-tagline">
            {isSignup ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {isSignup && (
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              minLength={3}
              maxLength={40}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={usernameError ? true : undefined}
              placeholder="yourname"
            />
            <small className="auth-hint">
              {usernameError ? (
                <span className="error">{usernameError}</span>
              ) : (
                <>Your pad address: <code>{username || "yourname"}/padname</code></>
              )}
            </small>
          </label>
        )}

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus={!isSignup}
            placeholder="you@example.com"
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isSignup ? 8 : 1}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "At least 8 characters" : ""}
          />
        </label>

        {!isSignup && (
          <div className="auth-forgot-row">
            <Link to="/forgot-password" className="auth-forgot-link">
              Forgot password?
            </Link>
          </div>
        )}

        {error && (
          <p className="error" role="alert">{error}</p>
        )}

        <button className="btn btn-primary auth-submit-btn" type="submit" disabled={busy}>
          {busy ? "…" : isSignup ? "Create account" : "Sign in"}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <a className="btn btn-secondary auth-google" href="/api/auth/google/login">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>

        <p className="auth-switch">
          {isSignup ? (
            <>Already have an account? <Link to="/login">Sign in</Link></>
          ) : (
            <>New here? <Link to="/signup">Create an account</Link></>
          )}
        </p>

        <Link className="auth-home-link" to="/">
          ← Back to River
        </Link>
      </form>
    </main>
  );
}
