import { useState, useEffect } from 'react';
import { PadListItem, patchPad } from '../../api';

interface InlinePadEditorProps {
  pad: PadListItem;
  onClose: () => void;
  onSaved: () => void;
}

export default function InlinePadEditor({ pad, onClose, onSaved }: InlinePadEditorProps) {
  const [title, setTitle] = useState(pad.name || '');
  const [body, setBody] = useState(pad.preview_text || '');
  const [color, setColor] = useState(pad.color || '');
  const [pinned, setPinned] = useState(pad.pinned || false);

  const handleSave = async () => {
    try {
      await patchPad(undefined as any, pad.slug, {
        name: title,
        preview_text: body,
        color,
        pinned,
      } as any);
      onSaved();
    } catch (e) {
      // error handling could be added
    }
    onClose();
  };

  // Auto‑save every 5 seconds while editing
  useEffect(() => {
    const id = setInterval(() => {
      handleSave();
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, color, pinned]);

  return (
    <div className="composer composer-expanded" role="form" aria-label="Edit pad" style={{ backgroundColor: color || undefined, color: color ? '#000000' : 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <input
          type="text"
          className="composer-input composer-title"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          className={`icon pin ${pinned ? 'active' : ''}`}
          aria-pressed={pinned}
          aria-label="Pin pad"
          onClick={() => setPinned(!pinned)}
          style={{ color: 'inherit', fontSize: '20px' }}
        >
          {pinned ? '★' : '☆'}
        </button>
      </div>
      <textarea
        className="composer-input composer-body"
        placeholder="Take a pad…"
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
      />
      <div className="composer-actions">
        <input type="color" value={color || '#ffffff'} onChange={e => setColor(e.target.value)} aria-label="Change color" style={{ width: '30px', height: '30px', padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }} />
        <div style={{ flex: 1 }}></div>
        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ color: color ? '#000000' : undefined, borderColor: color ? '#000000' : undefined }}>Close</button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
