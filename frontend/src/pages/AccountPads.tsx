import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import BrandWordmark from "../components/BrandWordmark";
import TopBar from "../components/TopBar";
import CollabEditor from "../components/CollabEditor";
import ThemeToggle from "../components/ThemeToggle";
import {
  PadListItem,
  Redirect,
  Visibility,
  claimPad,
  createPad,
  killRedirect,
  listMyPads,
  listRedirects,
  patchPad,
} from "../api";
import { useAuth } from "../auth";
import { fullTimestamp, formatBytes, relativeTime } from "../format";
import { useTheme } from "../useTheme";

const VISIBILITY: Record<Visibility, { glyph: string; label: string }> = {
  public_edit: { glyph: "🌐", label: "Anyone can edit" },
  public_view: { glyph: "👁", label: "Anyone can view" },
  private: { glyph: "🔒", label: "Private" },
};

/** Extract the pad's address segment (slug or name) from a pasted URL/path. */
function parseSlug(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  let path = trimmed;
  try {
    path = new URL(trimmed).pathname;
  } catch {
    // not a full URL — treat as a path or bare slug
  }
  const parts = path.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

export default function AccountPads() {
  const { user, ready, authedFetch, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [pads, setPads] = useState<PadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Claim-a-pad form
  const [claimUrl, setClaimUrl] = useState("");
  const [claimTokenInput, setClaimTokenInput] = useState("");
  const [claimPin, setClaimPin] = useState("");
  const [claimMsg, setClaimMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [activePadSlug, setActivePadSlug] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Inline rename + "old links" per card
  const [renamingSlug, setRenamingSlug] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [linksSlug, setLinksSlug] = useState<string | null>(null);
  const [links, setLinks] = useState<Redirect[]>([]);

  // Redirect to login once the session has settled and there's no user.
  useEffect(() => {
    if (ready && !user) {
      const next = encodeURIComponent("/account/pads");
      navigate(`/login?next=${next}`, { replace: true });
    }
  }, [ready, user, navigate]);

  // ~150ms debounce on the search input (dashboard spec §2).
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const load = useCallback(async () => {
    console.log("load start");
    setLoading(true);
    setError(null);
    try {
      const result = await listMyPads(authedFetch, { archived, q: debouncedQuery });
      console.log("load result", result);
      setPads(result);
    } catch (e) {
      console.log("load error", e);
      setError((e as Error).message);
    } finally {
      console.log("load finish");
      setLoading(false);
    }
  }, [authedFetch, archived, debouncedQuery]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const groupedPads = useMemo(() => {
    const now = Date.now();
    const recent = [] as PadListItem[];
    const older = [] as PadListItem[];
    for (const pad of pads) {
      const updatedAt = new Date(pad.updated_at).getTime();
      if (!Number.isNaN(updatedAt) && now - updatedAt < 7 * 24 * 60 * 60 * 1000) {
        recent.push(pad);
      } else {
        older.push(pad);
      }
    }
    return { recent, older };
  }, [pads]);

  async function newPad() {
    try {
      const pad = await createPad(undefined, authedFetch);
      navigate(`/${pad.slug}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Optimistic local patch so inline edits feel immediate.
  function applyLocal(slug: string, patch: Partial<PadListItem>) {
    setPads((prev) =>
      prev
        .map((p) => (p.slug === slug ? { ...p, ...patch } : p))
        // archive/unarchive drops the row from the current view
        .filter((p) => p.is_archived === archived)
    );
  }


  async function setArchivedFlag(slug: string, value: boolean) {
    applyLocal(slug, { is_archived: value });
    try {
      await patchPad(authedFetch, slug, { is_archived: value });
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  }

  async function submitClaim(e: React.FormEvent) {
    e.preventDefault();
    setClaimMsg(null);
    const slug = parseSlug(claimUrl);
    if (!slug) {
      setClaimMsg({ ok: false, text: "Enter the pad's URL." });
      return;
    }
    setClaiming(true);
    const res = await claimPad(
      authedFetch,
      slug,
      claimTokenInput.trim(),
      claimPin.trim() || undefined
    );
    setClaiming(false);
    if (res.kind === "ok") {
      setClaimMsg({ ok: true, text: `Claimed “${res.pad.name || res.pad.slug}”.` });
      setClaimUrl("");
      setClaimTokenInput("");
      setClaimPin("");
      load();
    } else {
      setClaimMsg({ ok: false, text: res.message });
    }
  }

  async function commitRename(slug: string) {
    const next = renameValue.trim().toLowerCase();
    setRenamingSlug(null);
    if (!next) return;
    try {
      const updated = await patchPad(authedFetch, slug, { name: next });
      applyLocal(slug, { name: updated.name });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleLinks(slug: string) {
    if (linksSlug === slug) {
      setLinksSlug(null);
      return;
    }
    setLinksSlug(slug);
    try {
      setLinks(await listRedirects(authedFetch, slug));
    } catch {
      setLinks([]);
    }
  }

  async function removeLink(slug: string, id: string) {
    try {
      await killRedirect(authedFetch, slug, id);
      setLinks((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!ready) return <div className="pad-state" />;
  if (!user) return null;

  console.log("render", { loading, pads: pads.length, recent: groupedPads.recent.length, older: groupedPads.older.length });

  const openPad = (pad: PadListItem) => {
    if (window.innerWidth < 768) {
      navigate(`/${user.username}/${pad.name || pad.slug}`);
      return;
    }
    setActivePadSlug(pad.slug);
    const nextPath = `/account/pads?pad=${encodeURIComponent(pad.slug)}`;
    window.history.pushState({}, "", nextPath);
  };

  const closeOverlay = () => {
    setActivePadSlug(null);
    window.history.replaceState({}, "", "/account/pads");
  };

  // Deep-link: open overlay if ?pad=slug present on initial load (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const params = new URLSearchParams(window.location.search);
    const pad = params.get("pad");
    if (pad) setActivePadSlug(pad);
  }, [isMobile]);

  // Back-button handling: close the overlay when the URL no longer contains ?pad=
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const pad = params.get("pad");
      if (!pad) setActivePadSlug(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openPadFullPage = (pad: PadListItem) => {
    navigate(`/${user.username}/${pad.name || pad.slug}`);
  };

  return (
    <main className="dash-shell">
      <aside className="dash-sidebar">
        <Link to="/" className="brand-mark" aria-label="River home">
          <BrandWordmark />
        </Link>
        <nav className="dash-nav" aria-label="Dashboard navigation">
          <button type="button" className="dash-nav-item is-active">
            <span aria-hidden>▣</span>
            <span>Your pads</span>
          </button>
          <button type="button" className="dash-nav-item">
            <span aria-hidden>🗄</span>
            <span>Archive</span>
          </button>
        </nav>
        <div className="dash-sidebar-footer">
          <ThemeToggle theme={theme} onToggle={toggle} />
          {user && (
            <span className="topbar-user">
              <span className="topbar-user-name" title={user.email}>
                {user.display_name || user.email}
              </span>
              <button type="button" className="text-link" onClick={logout}>
                Log out
              </button>
            </span>
          )}
        </div>
      </aside>

      <section className="dash-main">
        <header className="dash-header">
          <div className="dash-header-right dash-header-right--wide">
            <input
              type="search"
              className="dash-search"
              placeholder="Search pads…"
              aria-label="Search pads by name or slug"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={newPad}>
              New pad
            </button>
          </div>
        </header>

        <div className="dash-toolbar">
          <div className="dash-tabs" role="tablist" aria-label="Pad views">
            <button
              type="button"
              role="tab"
              aria-selected={!archived}
              className={`dash-tab ${!archived ? "is-active" : ""}`}
              onClick={() => setArchived(false)}
            >
              Active
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={archived}
              className={`dash-tab ${archived ? "is-active" : ""}`}
              onClick={() => setArchived(true)}
            >
              Archived
            </button>
          </div>
        </div>

        <form className="dash-claim" onSubmit={submitClaim}>
        <div className="dash-claim-fields">
          <label className="dash-claim-field">
            <span>Claim a pad — its URL</span>
            <input
              type="text"
              className="dash-claim-input"
              placeholder="myriver.app/crisp-badger-68"
              value={claimUrl}
              onChange={(e) => setClaimUrl(e.target.value)}
            />
          </label>
          <label className="dash-claim-field">
            <span>Claim token</span>
            <input
              type="text"
              className="dash-claim-input"
              placeholder="token from the pad"
              value={claimTokenInput}
              onChange={(e) => setClaimTokenInput(e.target.value)}
            />
          </label>
          <label className="dash-claim-field">
            <span>PIN (if locked)</span>
            <input
              type="text"
              className="dash-claim-input"
              inputMode="text"
              placeholder="optional"
              value={claimPin}
              onChange={(e) => setClaimPin(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={claiming}>
            {claiming ? "Claiming…" : "Claim"}
          </button>
        </div>
        {claimMsg && (
          <p
            className={claimMsg.ok ? "dash-claim-ok" : "error"}
            role={claimMsg.ok ? "status" : "alert"}
          >
            {claimMsg.text}
          </p>
        )}
      </form>

        {error && (
          <p className="error dash-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
        <div className="dash-empty" aria-busy="true" />
        ) : pads.length === 0 ? (
          <div className="dash-empty">
            {debouncedQuery ? (
              <p>No pads match “{debouncedQuery}”.</p>
            ) : archived ? (
              <p>No archived pads.</p>
            ) : (
              <>
                <p>You don’t have any pads yet.</p>
                <button type="button" className="btn btn-primary" onClick={newPad}>
                  Create your first pad
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="dash-sections">
            {groupedPads.recent.length > 0 && (
              <section className="dash-section" aria-label="Recent pads">
                <h2 className="dash-section-title">Recent</h2>
                <div className="dash-grid" role="list">
                  {groupedPads.recent.map((pad) => (
                    <article key={pad.id} className="dash-card" role="listitem">
                      <div className="dash-card-accent" aria-hidden />
                      <div className="dash-card-body">
                        {renamingSlug === pad.slug ? (
                          <input
                            className="dash-rename-input"
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value.toLowerCase())}
                            onBlur={() => commitRename(pad.slug)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(pad.slug);
                              if (e.key === "Escape") setRenamingSlug(null);
                            }}
                            aria-label="New pad name"
                            placeholder="new-name"
                          />
                        ) : (
                          <button
                            type="button"
                            className="dash-card-name-link"
                            onClick={() => openPad(pad)}
                            aria-label={`Open pad ${pad.name || pad.slug}`}
                          >
                            {pad.name ? (
                              <div className="dash-name">{pad.name}</div>
                            ) : (
                              <div className="dash-name dash-name--slug">{pad.slug}</div>
                            )}
                            {pad.name && <div className="dash-name-slug">/{pad.slug}</div>}
                          </button>
                        )}

                        {pad.preview_text && <p className="dash-preview">{pad.preview_text}</p>}

                        <div className="dash-card-meta">
                          <div className="dash-card-time" title={fullTimestamp(pad.updated_at)}>
                            {relativeTime(pad.updated_at)}
                          </div>
                          <div className="dash-card-indicators" aria-hidden>
                            <span>{VISIBILITY[pad.visibility].glyph}</span>
                            {pad.pin_protected && <span>🔐</span>}
                          </div>
                        </div>

                        <div className="dash-card-foot">
                          <div className="dash-actions">
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => {
                                const url = `${window.location.origin}/${user.username}/${pad.name || pad.slug}`;
                                const doFallback = (text: string) => {
                                  try {
                                    const ta = document.createElement("textarea");
                                    ta.value = text;
                                    ta.setAttribute("readonly", "");
                                    ta.style.position = "absolute";
                                    ta.style.left = "-9999px";
                                    document.body.appendChild(ta);
                                    const sel = document.getSelection();
                                    const range = document.createRange();
                                    range.selectNodeContents(ta);
                                    sel?.removeAllRanges();
                                    sel?.addRange(range);
                                    const ok = document.execCommand("copy");
                                    sel?.removeAllRanges();
                                    document.body.removeChild(ta);
                                    return ok;
                                  } catch {
                                    return false;
                                  }
                                };
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                  navigator.clipboard.writeText(url).catch(() => doFallback(url));
                                } else {
                                  doFallback(url);
                                }
                              }}
                              aria-label={`Copy link to ${pad.slug}`}
                            >
                              ⧉
                            </button>
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => openPadFullPage(pad)}
                            >
                              ↗
                            </button>
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => {
                                setRenameValue(pad.name || "");
                                setRenamingSlug(pad.slug);
                              }}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => toggleLinks(pad.slug)}
                              aria-expanded={linksSlug === pad.slug}
                            >
                              ⎋
                            </button>
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => setArchivedFlag(pad.slug, !archived)}
                            >
                              {archived ? "↺" : "⊕"}
                            </button>
                          </div>
                          <div className="dash-card-meta">
                            <div className="dash-cell-size">{formatBytes(pad.size_bytes)}</div>
                          </div>
                        </div>

                        {linksSlug === pad.slug && (
                          <div className="dash-links">
                            {links.length === 0 ? (
                              <p className="dash-links-empty">No old links for this pad.</p>
                            ) : (
                              <ul className="dash-links-list">
                                {links.map((r) => (
                                  <li key={r.id} className="dash-links-row">
                                    <code className="dash-links-name">{r.old_slug}</code>
                                    <button
                                      type="button"
                                      className="dash-action dash-action--danger"
                                      onClick={() => removeLink(pad.slug, r.id)}
                                      aria-label={`Remove old link ${r.old_slug}`}
                                    >
                                      ×
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {groupedPads.older.length > 0 && (
              <section className="dash-section" aria-label="Older pads">
                <h2 className="dash-section-title">Older</h2>
                <div className="dash-grid" role="list">
                  {groupedPads.older.map((pad) => (
                    <article key={pad.id} className="dash-card" role="listitem">
                      <div className="dash-card-accent" aria-hidden />
                      <div className="dash-card-body">
                        {renamingSlug === pad.slug ? (
                          <input
                            className="dash-rename-input"
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value.toLowerCase())}
                            onBlur={() => commitRename(pad.slug)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(pad.slug);
                              if (e.key === "Escape") setRenamingSlug(null);
                            }}
                            aria-label="New pad name"
                            placeholder="new-name"
                          />
                        ) : (
                          <button
                            type="button"
                            className="dash-card-name-link"
                            onClick={() => openPad(pad)}
                            aria-label={`Open pad ${pad.name || pad.slug}`}
                          >
                            {pad.name ? (
                              <div className="dash-name">{pad.name}</div>
                            ) : (
                              <div className="dash-name dash-name--slug">{pad.slug}</div>
                            )}
                            {pad.name && <div className="dash-name-slug">/{pad.slug}</div>}
                          </button>
                        )}

                        {pad.preview_text && <p className="dash-preview">{pad.preview_text}</p>}

                        <div className="dash-card-meta">
                          <div className="dash-card-time" title={fullTimestamp(pad.updated_at)}>
                            {relativeTime(pad.updated_at)}
                          </div>
                          <div className="dash-card-indicators" aria-hidden>
                            <span>{VISIBILITY[pad.visibility].glyph}</span>
                            {pad.pin_protected && <span>🔐</span>}
                          </div>
                        </div>

                        <div className="dash-card-foot">
                          <div className="dash-actions">
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => {
                                const url = `${window.location.origin}/${user.username}/${pad.name || pad.slug}`;
                                const doFallback = (text: string) => {
                                  try {
                                    const ta = document.createElement("textarea");
                                    ta.value = text;
                                    ta.setAttribute("readonly", "");
                                    ta.style.position = "absolute";
                                    ta.style.left = "-9999px";
                                    document.body.appendChild(ta);
                                    const sel = document.getSelection();
                                    const range = document.createRange();
                                    range.selectNodeContents(ta);
                                    sel?.removeAllRanges();
                                    sel?.addRange(range);
                                    const ok = document.execCommand("copy");
                                    sel?.removeAllRanges();
                                    document.body.removeChild(ta);
                                    return ok;
                                  } catch {
                                    return false;
                                  }
                                };
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                  navigator.clipboard.writeText(url).catch(() => doFallback(url));
                                } else {
                                  doFallback(url);
                                }
                              }}
                              aria-label={`Copy link to ${pad.slug}`}
                            >
                              ⧉
                            </button>
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => openPadFullPage(pad)}
                            >
                              ↗
                            </button>
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => {
                                setRenameValue(pad.name || "");
                                setRenamingSlug(pad.slug);
                              }}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => toggleLinks(pad.slug)}
                              aria-expanded={linksSlug === pad.slug}
                            >
                              ⎋
                            </button>
                            <button
                              type="button"
                              className="dash-action"
                              onClick={() => setArchivedFlag(pad.slug, !archived)}
                            >
                              {archived ? "↺" : "⊕"}
                            </button>
                          </div>
                          <div className="dash-card-meta">
                            <div className="dash-cell-size">{formatBytes(pad.size_bytes)}</div>
                          </div>
                        </div>

                        {linksSlug === pad.slug && (
                          <div className="dash-links">
                            {links.length === 0 ? (
                              <p className="dash-links-empty">No old links for this pad.</p>
                            ) : (
                              <ul className="dash-links-list">
                                {links.map((r) => (
                                  <li key={r.id} className="dash-links-row">
                                    <code className="dash-links-name">{r.old_slug}</code>
                                    <button
                                      type="button"
                                      className="dash-action dash-action--danger"
                                      onClick={() => removeLink(pad.slug, r.id)}
                                      aria-label={`Remove old link ${r.old_slug}`}
                                    >
                                      ×
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      {activePadSlug && (
        <div className="dash-overlay-backdrop" onClick={closeOverlay} role="presentation">
          <div className="dash-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="dash-overlay-header">
              <div>
                <div className="dash-overlay-title">{pads.find((pad) => pad.slug === activePadSlug)?.name || activePadSlug}</div>
                <div className="dash-overlay-subtitle">/{activePadSlug}</div>
              </div>
              <div className="dash-overlay-actions">
                <button type="button" className="btn btn-secondary" onClick={closeOverlay}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => openPadFullPage(pads.find((pad) => pad.slug === activePadSlug)!)}
                >
                  Open full page
                </button>
              </div>
            </div>
            <div className="dash-overlay-body">
              <div className="pad pad--overlay">
                <TopBar
                  slug={activePadSlug}
                  peers={[]}
                  connection="connected"
                  theme={theme}
                  onToggleTheme={toggle}
                  canClaim={false}
                />
                <div className="pad-canvas-scroll">
                  <div className="pad-layout">
                    <div className="pad-canvas">
                      <CollabEditor
                        slug={activePadSlug}
                        seed={""}
                        onPeersChange={() => {}}
                        onConnectionChange={() => {}}
                      />
                    </div>
                    <aside className="pad-file-side">
                      <div className="file-tray">
                        <div className="file-dropzone">
                          <span className="file-dropzone-label">Pad details open in full page view for the live editor.</span>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
