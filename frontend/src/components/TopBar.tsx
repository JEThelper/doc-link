import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ConnectionIndicator, { ConnectionState } from "./ConnectionIndicator";
import PresenceStack, { PresencePeer } from "./PresenceStack";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../auth";
import { createPad } from "../api";

interface Props {
  slug: string;
  peers: PresencePeer[];
  connection: ConnectionState;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  canClaim?: boolean;
  onClaim?: () => void;
  /** Opens the "Secure Document" PIN-setting modal (guest + auth). */
  onSecure?: () => void;
}

// Persist width preference so returning users keep their setting.
type WidthPreset = "narrow" | "standard" | "wide";
const WIDTH_KEY = "river-editor-width";
function getWidthValue(p: WidthPreset) {
  return p === "narrow" ? 600 : p === "wide" ? 1024 : 740;
}

export default function TopBar({
  slug,
  peers,
  connection,
  theme,
  onToggleTheme,
  canClaim,
  onClaim,
  onSecure,
}: Props) {
  const { user, authedFetch } = useAuth();
  const navigate = useNavigate();
  const shareRef = useRef<HTMLButtonElement>(null);
  const moreRef  = useRef<HTMLButtonElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);
  const fullUrl  = `${window.location.origin}/${slug}`;

  const [moreOpen, setMoreOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy link");

  // Keep width preference in localStorage.
  const [, setWidthPreset] = useState<WidthPreset>(() => {
    const stored = localStorage.getItem(WIDTH_KEY);
    return (stored as WidthPreset) || "standard";
  });
  useEffect(() => {
    const stored = (localStorage.getItem(WIDTH_KEY) as WidthPreset) || "standard";
    setWidthPreset(stored);
    document.documentElement.style.setProperty(
      "--canvas-max-width",
      `${getWidthValue(stored)}px`
    );
  }, []);

  // Close the More menu when clicking outside it.
  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        moreRef.current && !moreRef.current.contains(e.target as Node)
      ) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moreOpen]);

  // Close More menu on Escape.
  useEffect(() => {
    if (!moreOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setMoreOpen(false); moreRef.current?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  function handleShare() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        const btn = shareRef.current;
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = "Copied!";
          setTimeout(() => { if (btn) btn.textContent = orig; }, 1500);
        }
      }).catch(() => {});
    }
  }

  function handleMoreCopyLink() {
    navigator.clipboard?.writeText(fullUrl).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy link"), 1500);
    }).catch(() => {});
    setMoreOpen(false);
  }

  function handleMoreHelp() {
    setMoreOpen(false);
    navigate("/help");
  }

  async function handleNewDoc() {
    try {
      const pad = await createPad(undefined, user ? authedFetch : fetch);
      navigate(`/${pad.slug}`);
    } catch (err) {
      console.error("Could not create new document:", err);
    }
  }

  /* ── Auth mode (screen_1) ──────────────────────────────────────────────── */
  if (user) {
    return (
      <header className="topbar topbar--auth">
        <div className="topbar-left">
          <span className="topbar-secure-badge">
            <span className="material-symbols-outlined topbar-secure-icon" aria-hidden="true">
              verified_user
            </span>
            Secure
          </span>
        </div>

        <div className="topbar-right">
          <PresenceStack peers={peers} />
          <ConnectionIndicator state={connection} />

          {canClaim && (
            <button type="button" className="topbar-ghost-btn" onClick={onClaim}>
              Claim pad
            </button>
          )}

          <button
            ref={shareRef}
            type="button"
            className="topbar-ghost-btn"
            onClick={handleShare}
            title="Copy pad link"
          >
            Share
          </button>

          <button
            type="button"
            className="topbar-ghost-btn"
            title="History (coming soon)"
            disabled
          >
            History
          </button>

          <button
            type="button"
            className="topbar-new-doc-btn"
            onClick={handleNewDoc}
          >
            New Document
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>
    );
  }

  /* ── Guest mode (screen_3) ─────────────────────────────────────────────── */
  return (
    <header className="topbar topbar--guest">
      <div className="topbar-left">
        <Link to="/" className="topbar-brand" aria-label="River home">
          River
        </Link>

        <div className="topbar-url-bar" title={fullUrl}>
          <svg
            className="topbar-url-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span className="topbar-url-text">
            {fullUrl.replace(/^https?:\/\//, "")}
          </span>
        </div>
      </div>

      <div className="topbar-right" style={{ position: "relative" }}>
        <ConnectionIndicator state={connection} />

        <button
          type="button"
          className="topbar-secure-btn"
          onClick={onSecure}
          title="Protect this document with a PIN"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12 1a5 5 0 0 0-5 5v3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V6a5 5 0 0 0-5-5zm3 8V6a3 3 0 1 0-6 0v3h6z" />
          </svg>
          Secure Document
        </button>

        {/* More options button — opens a small dropdown */}
        <button
          ref={moreRef}
          type="button"
          className="topbar-more-btn"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((o) => !o)}
        >
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>
            more_vert
          </span>
        </button>

        {/* Dropdown menu */}
        {moreOpen && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="More options"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: "var(--color-surface, #fff)",
              border: "1px solid var(--color-border-subtle, #bfc7d1)",
              borderRadius: "8px",
              boxShadow: "0px 4px 20px rgba(0,119,182,0.10)",
              minWidth: "180px",
              zIndex: 200,
              overflow: "hidden",
            }}
          >
            <button
              role="menuitem"
              type="button"
              onClick={handleMoreCopyLink}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 16px",
                background: "none",
                border: "none",
                fontSize: 14,
                textAlign: "left",
                cursor: "pointer",
                color: "var(--color-text-primary, #191c1d)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {copyLabel}
            </button>

            <button
              role="menuitem"
              type="button"
              onClick={handleMoreHelp}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 16px",
                background: "none",
                border: "none",
                borderTop: "1px solid var(--color-border-subtle, #bfc7d1)",
                fontSize: 14,
                textAlign: "left",
                cursor: "pointer",
                color: "var(--color-text-primary, #191c1d)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Help
            </button>
          </div>
        )}

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
