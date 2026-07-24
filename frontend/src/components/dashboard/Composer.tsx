import { useState, useRef, useEffect } from "react";

interface ComposerProps {
  onSave: (title: string, body: string, color: string, pinned: boolean) => Promise<void>;
  isExpanded?: boolean;
  onExpandToggle?: (expanded: boolean) => void;
}

export default function Composer({ onSave, isExpanded = false, onExpandToggle }: ComposerProps) {
  const [expanded, setExpanded] = useState(isExpanded);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState("");
  const [pinned, setPinned] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpanded(isExpanded);
  }, [isExpanded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) {
        collapse();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  // Click outside to collapse and autosave
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (expanded && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded, title, body, color, pinned]);

  const collapse = () => {
    setExpanded(false);
    onExpandToggle?.(false);
    setTitle("");
    setBody("");
    setColor("");
    setPinned(false);
  };

  const handleSave = async () => {
    if (title.trim() || body.trim()) {
      await onSave(title, body, color, pinned);
    }
    collapse();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!expanded) {
    return (
      <div 
        className="composer composer-collapsed" 
        onClick={() => { setExpanded(true); onExpandToggle?.(true); }}
        role="button"
        tabIndex={0}
      >
        <input 
          type="text" 
          className="composer-input" 
          placeholder="Take a pad…" 
          readOnly 
        />
      </div>
    );
  }

  return (
    <div 
      className="composer composer-expanded" 
      ref={containerRef}
      style={{ backgroundColor: color || undefined, color: color ? '#000000' : 'inherit' }}
      role="form"
      aria-label="Create new pad"
    >
      <div className="composer-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <input 
          type="text" 
          className="composer-input composer-title" 
          placeholder="Title" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <button 
          type="button"
          className={`icon pin ${pinned ? 'active' : ''}`}
          onClick={() => setPinned(!pinned)}
          aria-pressed={pinned}
          aria-label="Pin pad"
        >
          {pinned ? "📌" : "📍"}
        </button>
      </div>
      <textarea 
        className="composer-input composer-body" 
        placeholder="Take a pad…" 
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <div className="composer-actions">
        {/* Simple color picker mockup */}
        <input 
          type="color" 
          value={color || "#ffffff"} 
          onChange={(e) => setColor(e.target.value)} 
          aria-label="Change color"
          style={{ width: '30px', height: '30px', padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer' }}
        />
        <div style={{ flex: 1 }}></div>
        <button type="button" className="btn btn-secondary" onClick={collapse}>Close</button>
      </div>
    </div>
  );
}
