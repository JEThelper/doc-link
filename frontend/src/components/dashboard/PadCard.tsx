import { useState } from "react";
import { PadListItem } from "../../api";
import { relativeTime } from "../../format";

interface PadCardProps {
  pad: PadListItem;
  onExpand: (pad: PadListItem) => void;
  onArchive: (pad: PadListItem) => void;
  onTogglePin: (pad: PadListItem) => void;
  onChangeColor: (pad: PadListItem, color: string) => void;
  onShare: (pad: PadListItem) => void;
  onMore: (pad: PadListItem) => void;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
}

export default function PadCard({
  pad,
  onExpand,
  onArchive,
  onTogglePin,
  onChangeColor,
  onShare,
  onMore,
  selected,
  onSelect
}: PadCardProps) {
  const isLocked = pad.locked || pad.pin_protected;
  const [shareFeedback, setShareFeedback] = useState(false);

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/${pad.name || pad.slug}`;
    navigator.clipboard?.writeText(url).then(() => {
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 1500);
    }).catch(() => {});
    // Also call the parent handler in case it wants to do something else.
    onShare(pad);
  }

  return (
    <article
      className="keep-card"
      role="article"
      aria-labelledby={`pad-title-${pad.id}`}
      aria-describedby={`pad-excerpt-${pad.id}`}
      style={{ backgroundColor: pad.color || "var(--color-surface-raised)" }}
      onClick={() => onExpand(pad)}
    >
      <div className="pad-card-header" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {onSelect && (
          <input
            type="checkbox"
            aria-label="Select pad"
            checked={selected ?? false}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "16px", height: "16px" }}
          />
        )}
        <button
          className="icon pin"
          aria-pressed={pad.pinned || false}
          aria-label="Pin pad"
          onClick={(e) => { e.stopPropagation(); onTogglePin(pad); }}
        >
          {pad.pinned ? "📌" : "📍"}
        </button>
        <h3 id={`pad-title-${pad.id}`} className="pad-title" style={{ flex: 1 }}>
          {pad.name || pad.slug}
        </h3>
        <input
          type="color"
          className="color-swatch"
          aria-label="Change color"
          value={pad.color || "#FFFFFF"}
          onChange={(e) => onChangeColor(pad, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "24px", height: "24px", padding: 0, border: "none", borderRadius: "50%", cursor: "pointer", background: "transparent" }}
        />
        {isLocked && (
          <span className="lock" aria-hidden="true" title="Locked">🔒</span>
        )}
      </div>

      <p id={`pad-excerpt-${pad.id}`} className="pad-excerpt">
        {pad.preview_text || "No content..."}
      </p>

      {isLocked && (
        <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
          Locked — enter PIN or request access
        </div>
      )}

      <div className="pad-meta">
        <span className="owner">{pad.owner || "You"}</span>
        <span className="last-edited">Last edited {relativeTime(pad.updated_at)}</span>
        <span className={`status-dot status-${pad.status || "ok"}`} title="Synced" />
      </div>

      <div className="pad-actions">
        <button
          className="icon archive"
          aria-label="Archive"
          title="Archive"
          onClick={(e) => { e.stopPropagation(); onArchive(pad); }}
        >
          📦
        </button>
        <button
          className="icon share"
          aria-label={shareFeedback ? "Link copied!" : "Share — copy link"}
          title={shareFeedback ? "Link copied!" : "Copy link"}
          onClick={handleShare}
          style={{ color: shareFeedback ? "var(--primary, #0077b6)" : undefined }}
        >
          {shareFeedback ? "✓" : "🔗"}
        </button>
        <button
          className="icon more"
          aria-label="More actions"
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onMore(pad); }}
        >
          ⋮
        </button>
      </div>
    </article>
  );
}
