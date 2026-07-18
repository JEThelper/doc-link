import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";


import { createPad } from "../api";
import { useAuth } from "../auth";
import { useTheme } from "../useTheme";

export default function Landing() {
  const navigate = useNavigate();
  useTheme("light");
  const { user, ready } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPad() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const pad = await createPad();
      navigate(`/${pad.slug}`);
    } catch (e) {
      setCreating(false);
      setError((e as Error).message);
    }
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="wordmark" aria-label="River home">
          River
        </Link>
        <nav className="landing-nav" aria-label="Primary">
          <a href="#how">How it works</a>
          {ready && user ? (
            <>
              <Link to="/account/pads">My Pads</Link>
              <Link to="/new">New Pad</Link>
            </>
          ) : (
            <Link to="/login">Sign in</Link>
          )}

        </nav>
      </header>

      <main className="landing-main">
        <section className="editorial-hero">
          <div className="editorial-hero-content">
            <h1 className="editorial-title">
              Write together.<br />
              No friction.<br />
              Just a link.
            </h1>
            <p className="editorial-sub">
              River is a shared scratchpad that works instantly. Forget accounts, documents, and messy setups. Just open a page and start typing.
            </p>
            <div className="editorial-cta">
              <button
                type="button"
                className="btn btn-primary"
                onClick={startPad}
                disabled={creating}
              >
                {creating ? "Opening…" : "Start writing"}
              </button>
              <span className="editorial-note">Instant. Free. No signup.</span>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
          
          <div className="editorial-preview" aria-hidden="true">
            <div className="preview-card">
              <div className="preview-bar">
                <span className="preview-slug">river.app/quiet-harbor-07</span>
                <span className="preview-dots"><i /><i /><i /></span>
              </div>
              <div className="preview-body">
                <h4>Sprint notes</h4>
                <p>— refine the layout</p>
                <p>— strip away the generic AI styling</p>
                <p>— push to production<span className="preview-caret" /></p>
              </div>
            </div>
          </div>
        </section>

        <section className="editorial-features" id="how">
          <div className="feature-row">
            <h2>Immediate access</h2>
            <p>Hit start and you're writing on a fresh pad. No blank-document ceremony or account creation walls standing in your way.</p>
          </div>
          <div className="feature-row">
            <h2>Real-time sync</h2>
            <p>Share the link and watch edits sync live. Everyone on the pad sees cursors, selections, and changes instantly.</p>
          </div>
          <div className="feature-row">
            <h2>Secure when needed</h2>
            <p>Keep a pad with an account, set a PIN, or make it invite-only. You control the privacy when the content matters.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="wordmark wordmark--sm">River</span>
          <nav className="landing-footer-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/help">Help</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
