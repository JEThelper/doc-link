/**
 * Skeleton shimmer components used as loading placeholders.
 * PadListSkeleton  — AccountPads dashboard grid
 * EditorSkeleton   — Pad editor page
 */

/* ── Shared shimmer base ─────────────────────────────────────────────────── */
const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, var(--color-surface-raised, #edeeef) 25%, var(--color-surface-container, #e7e8e9) 50%, var(--color-surface-raised, #edeeef) 75%)",
  backgroundSize: "200% 100%",
  animation: "skeleton-shimmer 1.4s ease-in-out infinite",
  borderRadius: "6px",
};

/* ── PadListSkeleton ─────────────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "var(--color-surface-raised, #edeeef)",
        border: "1px solid var(--color-border-subtle, #bfc7d1)",
        borderRadius: "8px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* title bar */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ ...shimmerStyle, width: "20px", height: "20px", borderRadius: "50%" }} />
        <div style={{ ...shimmerStyle, flex: 1, height: "16px" }} />
        <div style={{ ...shimmerStyle, width: "20px", height: "20px", borderRadius: "50%" }} />
      </div>
      {/* preview lines */}
      <div style={{ ...shimmerStyle, height: "13px", width: "90%" }} />
      <div style={{ ...shimmerStyle, height: "13px", width: "75%" }} />
      {/* meta row */}
      <div style={{ ...shimmerStyle, height: "11px", width: "50%", marginTop: "4px" }} />
    </div>
  );
}

export function PadListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {/* inject keyframes once */}
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* section header stub */}
      <div style={{ padding: "0 16px", marginTop: "8px" }}>
        <div
          aria-hidden="true"
          style={{ ...shimmerStyle, height: "12px", width: "80px", marginBottom: "12px" }}
        />
        <div
          className="keep-grid"
          role="status"
          aria-label="Loading pads…"
        >
          {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </>
  );
}

/* ── EditorSkeleton ──────────────────────────────────────────────────────── */

export function EditorSkeleton() {
  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div
        className="pad-state"
        role="status"
        aria-label="Loading document…"
        aria-busy="true"
        style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "24px", maxWidth: "740px", margin: "0 auto", width: "100%" }}
      >
        {/* simulated title / toolbar area */}
        <div style={{ ...shimmerStyle, height: "20px", width: "35%" }} />
        {/* paragraph lines */}
        {[100, 88, 95, 72, 90, 60].map((w, i) => (
          <div key={i} style={{ ...shimmerStyle, height: "15px", width: `${w}%` }} />
        ))}
        <div style={{ ...shimmerStyle, height: "15px", width: "42%", marginTop: "8px" }} />
        {[85, 78, 93].map((w, i) => (
          <div key={i} style={{ ...shimmerStyle, height: "15px", width: `${w}%` }} />
        ))}
      </div>
    </>
  );
}
