import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import TopBar from "../components/TopBar";
import ThemeToggle from "../components/ThemeToggle";
import CollabEditor from "../components/CollabEditor";
import FileTray from "../components/FileTray";
import { ConnectionState } from "../components/ConnectionIndicator";
import { PresencePeer } from "../components/PresenceStack";
import {
  Pad as PadModel,
  PinFormat,
  createPad,
  generateClaimToken,
  getPad,
  patchPad,
  unlockPad,
} from "../api";
import { useAuth } from "../auth";
import { useTheme } from "../useTheme";

type Status = "loading" | "missing" | "invalid" | "ready" | "error" | "forbidden";

/* ── Recent-pads localStorage helpers ───────────────────────────────────── */
const RECENT_KEY = "river-recent-pads";

function loadRecentPads(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
}

function saveRecentPad(slug: string) {
  try {
    const prev = loadRecentPads().filter((s) => s !== slug);
    localStorage.setItem(RECENT_KEY, JSON.stringify([slug, ...prev].slice(0, 10)));
  } catch {}
}

/* ── Pad sidebar ─────────────────────────────────────────────────────────── */
interface SidebarProps {
  slug: string;
}

function PadSidebar({ slug }: SidebarProps) {
  const { user, logout, authedFetch } = useAuth();
  const navigate = useNavigate();
  const recent = loadRecentPads().filter((s) => s !== slug).slice(0, 5);

  async function handleNewDoc() {
    try {
      const p = await createPad(undefined, user ? authedFetch : fetch);
      navigate(`/${p.slug}`);
    } catch (err) {
      console.error("Could not create new document:", err);
    }
  }

  /* ── Auth sidebar (screen_1) ── */
  if (user) {
    const initial = (user.username || user.email || "?")[0].toUpperCase();
    return (
      <aside className="pad-sidebar" aria-label="Pad navigation">
        <div className="pad-sidebar-head">
          <p className="pad-sidebar-brand">River Editor</p>
          <p className="pad-sidebar-subtitle">
            {user.username ? `${user.username}/${slug}` : slug}
          </p>
        </div>

        <nav className="pad-sidebar-nav" aria-label="Editor navigation">
          <button type="button" className="pad-sidebar-nav-item is-active">
            <span className="material-symbols-outlined pad-sidebar-nav-icon" aria-hidden="true">
              edit_note
            </span>
            Editor
          </button>
          <Link to="/account/pads" className="pad-sidebar-nav-item">
            <span className="material-symbols-outlined pad-sidebar-nav-icon" aria-hidden="true">
              folder
            </span>
            My Pads
          </Link>
          <Link to="/account/pads" className="pad-sidebar-nav-item">
            <span className="material-symbols-outlined pad-sidebar-nav-icon" aria-hidden="true">
              settings
            </span>
            Settings
          </Link>
          <a href="#" className="pad-sidebar-nav-item">
            <span className="material-symbols-outlined pad-sidebar-nav-icon" aria-hidden="true">
              help
            </span>
            Help
          </a>
        </nav>

        <div className="pad-sidebar-footer">
          <div className="pad-sidebar-user">
            <div className="pad-sidebar-avatar" aria-hidden="true">{initial}</div>
            <div className="pad-sidebar-user-info">
              <p className="pad-sidebar-user-name" title={user.email}>
                {user.username || user.email}
              </p>
              <p className="pad-sidebar-user-plan">
                <button type="button" className="pad-sidebar-logout-link" onClick={logout}>
                  Log out
                </button>
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  /* ── Guest sidebar (screen_3) ── */
  return (
    <aside className="pad-sidebar" aria-label="Recent notes">
      <div className="pad-sidebar-head">
        <p className="pad-sidebar-brand">River</p>
        <p className="pad-sidebar-subtitle">Guest Session</p>
      </div>

      <nav className="pad-sidebar-nav" aria-label="Recent notes">
        <p className="pad-sidebar-section-label">Recent Notes</p>

        <button type="button" className="pad-sidebar-nav-item is-active">
          <span className="material-symbols-outlined pad-sidebar-nav-icon" aria-hidden="true">
            edit_note
          </span>
          <span className="pad-sidebar-nav-label">
            {slug.length > 20 ? `${slug.slice(0, 18)}…` : slug}
          </span>
        </button>

        {recent.map((s) => (
          <Link key={s} to={`/${s}`} className="pad-sidebar-nav-item">
            <span className="material-symbols-outlined pad-sidebar-nav-icon" aria-hidden="true">
              description
            </span>
            <span className="pad-sidebar-nav-label">
              {s.length > 20 ? `${s.slice(0, 18)}…` : s}
            </span>
          </Link>
        ))}

        <button type="button" className="pad-sidebar-nav-item" onClick={handleNewDoc}>
          <span className="material-symbols-outlined pad-sidebar-nav-icon" aria-hidden="true">
            add
          </span>
          New Document
        </button>
      </nav>

      <div className="pad-sidebar-footer">
        <Link to="/signup" className="pad-sidebar-create-btn">
          Create Account
        </Link>
      </div>
    </aside>
  );
}

/* ── PIN Secure Modal ────────────────────────────────────────────────────── */
interface PinModalProps {
  slug: string;
  onClose: () => void;
  onSaved: () => void;
}

function PinSecureModal({ slug, onClose, onSaved }: PinModalProps) {
  const { authedFetch } = useAuth();
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleDigit(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < digits.length - 1) boxRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      const next = [...digits]; next[i - 1] = "";
      setDigits(next);
      boxRefs.current[i - 1]?.focus();
    }
  }

  async function handleSave() {
    const pin = digits.join("");
    if (pin.length < 4) { setError("Enter all 4 digits."); return; }
    setSaving(true); setError("");
    try {
      await patchPad(authedFetch, slug, { pin_protected: true, pin, pin_format: "numeric" });
      onSaved();
    } catch (e) {
      setError((e as Error).message || "Could not save PIN.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pin-modal-overlay" role="dialog" aria-modal="true" aria-label="Secure Document">
      <div className="pin-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="pin-modal-card">
        <div className="pin-modal-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className="pin-modal-title">Secure Document</h2>
        <p className="pin-modal-hint">
          Set a 4-digit PIN to protect this document. Only people with the PIN can open it.
        </p>

        <div className="pin-modal-boxes" role="group" aria-label="PIN digits">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { boxRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              disabled={saving}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="pin-modal-box"
              aria-label={`PIN digit ${i + 1}`}
            />
          ))}
        </div>

        {error && <p className="pin-modal-error" role="alert">{error}</p>}

        <div className="pin-modal-actions">
          <button
            type="button"
            className="pin-modal-set-btn"
            onClick={handleSave}
            disabled={saving || digits.some((d) => !d)}
          >
            {saving ? "Saving…" : "Set Security PIN"}
          </button>
          <button type="button" className="pin-modal-cancel-btn" onClick={onClose}>
            Maybe Later
          </button>
        </div>

        <p className="pin-modal-stored">Your PIN is stored securely on this document.</p>
      </div>
    </div>
  );
}

/* ── Main Pad page ───────────────────────────────────────────────────────── */
export default function Pad() {
  const { padname, slug = "" } = useParams();
  const location = useLocation();
  const seed = (location.state as { seed?: string } | null)?.seed ?? "";
  const { theme, toggle } = useTheme();
  const { user, authedFetch } = useAuth();

  const padIdentifier = padname || slug;

  const [status, setStatus]   = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [pad, setPad]         = useState<PadModel | null>(null);
  const [peers, setPeers]     = useState<PresencePeer[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connected");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [claimErr, setClaimErr]     = useState("");
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getPad(padIdentifier, authedFetch)
      .then((res) => {
        if (cancelled) return;
        if (res.kind === "found") {
          setPad(res.pad);
          setOwnerId(res.pad.owner_id);
          if (res.pad.canonical_url && res.pad.canonical_url !== window.location.pathname) {
            window.history.replaceState(null, "", res.pad.canonical_url);
          }
          setStatus("ready");
          saveRecentPad(padIdentifier);
        } else if (res.kind === "forbidden") {
          setStatus("forbidden");
        } else {
          setStatus(res.creatable ? "missing" : "invalid");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMsg((e as Error).message);
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [padIdentifier, authedFetch]);

  async function claim() {
    setClaimErr("");
    try {
      const { token } = await generateClaimToken(padIdentifier, authedFetch);
      setClaimToken(token);
    } catch (e) {
      setClaimErr((e as Error).message);
    }
  }

  async function createHere() {
    try {
      await createPad(padIdentifier, authedFetch);
      const res = await getPad(padIdentifier, authedFetch);
      if (res.kind === "found") { setPad(res.pad); setOwnerId(res.pad.owner_id); }
      setStatus("ready");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStatus("error");
    }
  }

  /* ── State screens ── */
  if (status === "loading") return <div className="pad-state" />;

  if (status === "invalid")
    return (
      <div className="pad-state">
        <p>"{padIdentifier}" isn't a valid pad name.</p>
        <Link className="text-link" to="/">Go home</Link>
      </div>
    );

  if (status === "forbidden")
    return (
      <div className="pad-state">
        <p>This pad is private.</p>
        <p className="dash-confirm-label">Ask the owner to share it{user ? "" : ", or sign in"}.</p>
        <Link className="text-link" to={user ? "/account/pads" : "/login"}>
          {user ? "Go to your pads" : "Sign in"}
        </Link>
      </div>
    );

  if (status === "error")
    return (
      <div className="pad-state">
        <p className="error">{errorMsg || "Something went wrong."}</p>
        <Link className="text-link" to="/">Go home</Link>
      </div>
    );

  if (status === "missing")
    return (
      <div className="pad-state">
        <p>This pad doesn't exist yet — create it?</p>
        <div className="pad-state-actions">
          <button className="btn btn-primary" onClick={createHere}>
            Create /{padIdentifier}
          </button>
          <Link className="text-link" to="/">Cancel</Link>
        </div>
      </div>
    );

  /* ── Locked pad (screen_4) — full-page layout, no sidebar ── */
  if (pad?.locked)
    return (
      <LockedPad
        slug={padIdentifier}
        pinFormat={pad.pin_format}
        onUnlocked={(unlocked) => { setPad(unlocked); setOwnerId(unlocked.owner_id); }}
      />
    );

  const canEdit = pad?.can_edit ?? true;

  /* ── Editor shell with sidebar (screens 1 & 3) ── */
  return (
    <div className="pad-shell">
      <PadSidebar slug={padIdentifier} />

      <div className="pad">
        <TopBar
          slug={padIdentifier}
          peers={peers}
          connection={canEdit ? connection : "noaccess"}
          theme={theme}
          onToggleTheme={toggle}
          canClaim={!!user && ownerId === null}
          onClaim={claim}
          onSecure={() => setShowPinModal(true)}
        />

        {claimErr && (
          <div className="claim-banner" role="alert">
            <span className="error">{claimErr}</span>
          </div>
        )}
        {claimToken && (
          <div className="claim-banner" role="status">
            <p className="claim-banner-title">Claim token generated</p>
            <p className="claim-banner-hint">
              Paste this pad's URL and the token into{" "}
              <Link to="/account/pads" className="text-link">
                your dashboard → "Claim a pad"
              </Link>
              . It expires in a few minutes.
            </p>
            <code className="claim-banner-token">{claimToken}</code>
            <div className="claim-banner-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigator.clipboard?.writeText(claimToken).catch(() => {})}
              >
                Copy token
              </button>
              <button type="button" className="text-link" onClick={() => setClaimToken(null)}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="pad-canvas-scroll">
          <div className="pad-layout">
            <div className="pad-canvas">
              {canEdit ? (
                <CollabEditor
                  slug={padIdentifier}
                  seed={seed}
                  onPeersChange={setPeers}
                  onConnectionChange={setConnection}
                />
              ) : (
                <div className="editor editor--readonly" aria-readonly="true">
                  {pad?.content || ""}
                </div>
              )}
            </div>
            <aside className="pad-file-side">
              <FileTray slug={padIdentifier} />
            </aside>
          </div>
        </div>
      </div>

      {showPinModal && (
        <PinSecureModal
          slug={padIdentifier}
          onClose={() => setShowPinModal(false)}
          onSaved={() => {
            setShowPinModal(false);
            getPad(padIdentifier, authedFetch)
              .then((res) => { if (res.kind === "found") setPad(res.pad); })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}

/* ── Locked pad page (screen_4) ─────────────────────────────────────────── */
interface LockedPadProps {
  slug: string;
  pinFormat: PinFormat | null;
  onUnlocked: (pad: PadModel) => void;
}

function LockedPad({ slug, pinFormat, onUnlocked }: LockedPadProps) {
  const { authedFetch, user } = useAuth();
  const { theme, toggle }    = useTheme();
  const numeric = pinFormat === "numeric";
  const NUM_BOXES = 5;

  const [pinBoxes, setPinBoxes] = useState<string[]>(Array(NUM_BOXES).fill(""));
  const [pin, setPin]           = useState("");
  const [error, setError]       = useState("");
  const [lockedOut, setLockedOut]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visualError, setVisualError] = useState(false);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function submitPin(pinValue: string) {
    if (!pinValue || submitting || lockedOut) return;
    setSubmitting(true); setVisualError(false); setError("");
    try {
      const result = await unlockPad(slug, pinValue, authedFetch);
      if (result.kind === "ok") { onUnlocked(result.pad); return; }
      if (result.kind === "rate_limited") {
        setLockedOut(true);
        const mins = result.retryAfter ? Math.ceil(result.retryAfter / 60) : 0;
        setError(mins ? `Too many attempts. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.` : result.message);
      } else {
        setError(result.message);
      }
      setVisualError(true);
      setTimeout(() => setVisualError(false), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBoxChange(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...pinBoxes]; next[i] = d;
    setPinBoxes(next);
    if (d && i < NUM_BOXES - 1) boxRefs.current[i + 1]?.focus();
    if (next.every(Boolean)) submitPin(next.join(""));
  }

  function handleBoxKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pinBoxes[i] && i > 0) {
      const next = [...pinBoxes]; next[i - 1] = "";
      setPinBoxes(next);
      boxRefs.current[i - 1]?.focus();
    }
  }

  return (
    <div className="locked-pad-page">
      {/* Nav */}
      <nav className="locked-pad-nav" aria-label="Site navigation">
        <Link to="/" className="locked-pad-nav-brand">River</Link>
        <div className="locked-pad-nav-links">
          <a href="#" className="locked-pad-nav-link">Documents</a>
          <a href="#" className="locked-pad-nav-link">Community</a>
          <a href="#" className="locked-pad-nav-link">About</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user
            ? <Link to="/account/pads" className="locked-pad-nav-signin">My Pads</Link>
            : <Link to="/login" className="locked-pad-nav-signin">Sign In</Link>
          }
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </nav>

      {/* PIN card */}
      <main className="locked-pad-main">
        <div className="locked-pad-card">
          <div className="locked-pad-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1 className="locked-pad-card-title">This document is protected</h1>
          <p className="locked-pad-card-hint">
            Enter the security PIN to view the content
          </p>

          {numeric ? (
            <div className="locked-pin-boxes" role="group" aria-label="PIN digits">
              {Array.from({ length: NUM_BOXES }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { boxRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={pinBoxes[i]}
                  autoFocus={i === 0}
                  disabled={lockedOut || submitting}
                  onChange={(e) => handleBoxChange(i, e.target.value)}
                  onKeyDown={(e) => handleBoxKeyDown(i, e)}
                  className={`locked-pin-box${visualError ? " has-error" : ""}`}
                  aria-label={`PIN digit ${i + 1}`}
                />
              ))}
            </div>
          ) : (
            <input
              type="password"
              autoComplete="off"
              autoFocus
              value={pin}
              disabled={lockedOut || submitting}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitPin(pin); }}
              className={`locked-input${visualError ? " has-error" : ""}`}
              placeholder="enter passcode"
              aria-label="Passcode"
            />
          )}

          {error && (
            <p className="locked-input-error" role="alert" aria-live="polite">{error}</p>
          )}

          <button
            type="button"
            className="locked-pin-unlock-btn"
            onClick={() => numeric ? submitPin(pinBoxes.join("")) : submitPin(pin)}
            disabled={submitting || lockedOut || (numeric ? pinBoxes.some((b) => !b) : !pin)}
          >
            {submitting ? "Verifying…" : "Unlock Document"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          <hr className="locked-pin-divider" />
          <p className="locked-pin-footer-text">
            Don't have the PIN? <a href="#">Request access</a> or <Link to="/">go home.</Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="locked-pad-footer-outer">
        <div className="locked-pad-footer-inner">
          <span className="locked-pad-footer-brand">River</span>
          <div className="locked-pad-footer-col">
            <p className="locked-pad-footer-copy">© 2024 River. Radically accessible writing.</p>
            <ul className="locked-pad-footer-links">
              <li><a href="#">About</a></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><a href="#">Community</a></li>
              <li><Link to="/terms">Terms</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
