import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../auth";
import { useTheme } from "../useTheme";
import {
  PadListItem,
  claimPad,
  createPad,
  listMyPads,
  patchPad,
  deletePad,
} from "../api";
import Composer from "../components/dashboard/Composer";
import PadCard from "../components/dashboard/PadCard";
import ClaimModal from "../components/dashboard/ClaimModal";

function parseSlug(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  let path = trimmed;
  try {
    path = new URL(trimmed).pathname;
  } catch {}
  const parts = path.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

export default function AccountPads() {
  const { user, ready, authedFetch } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [pads, setPads] = useState<PadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  // Redirect to login once the session has settled and there's no user.
  useEffect(() => {
    if (ready && !user) {
      const next = encodeURIComponent("/account/pads");
      navigate(`/login?next=${next}`, { replace: true });
    }
  }, [ready, user, navigate]);

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
    setLoading(true);
    setError(null);
    try {
      const result = await listMyPads(authedFetch, { archived, q: debouncedQuery });
      setPads(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, archived, debouncedQuery]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const groupedPads = useMemo(() => {
    // We can also sort by pinned here.
    const now = Date.now();
    const recent = [] as PadListItem[];
    const older = [] as PadListItem[];
    const sorted = [...pads].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    for (const pad of sorted) {
      const updatedAt = new Date(pad.updated_at).getTime();
      if (!Number.isNaN(updatedAt) && now - updatedAt < 7 * 24 * 60 * 60 * 1000) {
        recent.push(pad);
      } else {
        older.push(pad);
      }
    }
    return { recent, older };
  }, [pads]);

  const applyLocal = (slug: string, patch: Partial<PadListItem>) => {
    setPads((prev) =>
      prev
        .map((p) => (p.slug === slug ? { ...p, ...patch } : p))
        .filter((p) => p.is_archived === archived)
    );
  };

  const handleCreatePad = async (_title: string, _body: string, _color: string, _pinned: boolean) => {
    try {
      const pad = await createPad(undefined, authedFetch);
      // Here you might patch the pad right away if title/body/color are supported by API.
      // For now we'll just navigate to it.
      navigate(`/${user?.username}/${pad.name || pad.slug}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleClaim = async (url: string, token: string, pin?: string) => {
    const slug = parseSlug(url);
    if (!slug) throw new Error("Invalid URL");
    const res = await claimPad(authedFetch, slug, token.trim(), pin?.trim() || undefined);
    if (res.kind === "ok") {
      load();
    } else {
      throw new Error(res.message);
    }
  };

  const handleTogglePin = async (pad: PadListItem) => {
    const newPinned = !pad.pinned;
    applyLocal(pad.slug, { pinned: newPinned });
    try {
      await patchPad(authedFetch, pad.slug, { pinned: newPinned } as any);
    } catch (e) {
      load();
    }
  };

  const handleArchive = async (pad: PadListItem) => {
    applyLocal(pad.slug, { is_archived: !pad.is_archived });
    try {
      await patchPad(authedFetch, pad.slug, { is_archived: !pad.is_archived });
    } catch (e) {
      load();
    }
  };

  const handleChangeColor = async (pad: PadListItem, color: string) => {
    applyLocal(pad.slug, { color });
    try {
      await patchPad(authedFetch, pad.slug, { color } as any);
    } catch (e) {
      load();
    }
  };

  const handleDelete = async (pad: PadListItem) => {
    if (!confirm("Delete this pad forever?")) return;
    try {
      await deletePad(authedFetch, pad.slug);
      setPads((prev) => prev.filter((p) => p.slug !== pad.slug));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleExpand = (pad: PadListItem) => {
    navigate(`/${user?.username}/${pad.name || pad.slug}`);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'n') {
        setIsComposerExpanded(true);
      } else if (e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.keep-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!ready) return <div className="pad-state" />;
  if (!user) return null;

  return (
    <main className="keep-shell">
      {/* Toolbar and Search */}
      <header className="keep-header">
        <button className="keep-hamburger" aria-label="Menu">☰</button>
        <h1 className="keep-title">River</h1>
        <div className="keep-actions">
          <input
            type="search"
            className="keep-search"
            placeholder="Search pads…"
            aria-label="Search pads by name, tags, or owner"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ThemeToggle theme={theme} onToggle={toggle} />
          <div className="presence-avatar" style={{ marginLeft: 8 }}>
            {user.email[0].toUpperCase()}
          </div>
        </div>
      </header>

      <div className="keep-toolbar">
        <div className="keep-tabs" role="tablist" aria-label="Pad views">
          <button
            type="button"
            role="tab"
            aria-selected={!archived}
            className={`keep-tab ${!archived ? "is-active" : ""}`}
            onClick={() => setArchived(false)}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={archived}
            className={`keep-tab ${archived ? "is-active" : ""}`}
            onClick={() => setArchived(true)}
          >
            Archived
          </button>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowClaimModal(true)}>
          Claim Pad
        </button>
      </div>

      {error && (
        <p className="error" style={{ margin: '0 16px' }} role="alert">
          {error}
        </p>
      )}

      {/* Inline Composer */}
      {!archived && (
        <Composer 
          onSave={handleCreatePad} 
          isExpanded={isComposerExpanded} 
          onExpandToggle={setIsComposerExpanded} 
        />
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ padding: 16 }}>Loading...</div>
      ) : pads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-secondary)' }}>
          {debouncedQuery ? `No pads match “${debouncedQuery}”.` : "No pads here."}
        </div>
      ) : (
        <>
          {groupedPads.recent.length > 0 && (
            <div style={{ padding: '0 16px' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent</h2>
              <div className="keep-grid" role="list">
                {groupedPads.recent.map((pad) => (
                  <PadCard
                    key={pad.id}
                    pad={pad}
                    onExpand={handleExpand}
                    onArchive={handleArchive}
                    onTogglePin={handleTogglePin}
                    onChangeColor={handleChangeColor}
                    onShare={() => {}}
                    onMore={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedPads.older.length > 0 && (
            <div style={{ padding: '0 16px', marginTop: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Older</h2>
              <div className="keep-grid" role="list">
                {groupedPads.older.map((pad) => (
                  <PadCard
                    key={pad.id}
                    pad={pad}
                    onExpand={handleExpand}
                    onArchive={handleArchive}
                    onTogglePin={handleTogglePin}
                    onChangeColor={handleChangeColor}
                    onShare={() => {}}
                    onMore={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <button 
        className="fab" 
        onClick={() => isMobile ? handleCreatePad("","", "#FFFFFF", false) : setIsComposerExpanded(true)}
        aria-label="New pad"
      >
        +
      </button>

      {/* Claim Modal */}
      {showClaimModal && (
        <ClaimModal onClose={() => setShowClaimModal(false)} onSubmit={handleClaim} />
      )}
    </main>
  );
}
