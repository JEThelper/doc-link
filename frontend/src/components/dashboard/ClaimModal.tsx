import { useState } from "react";

interface ClaimModalProps {
  onClose: () => void;
  onSubmit: (url: string, token: string, pin?: string) => Promise<void>;
}

export default function ClaimModal({ onClose, onSubmit }: ClaimModalProps) {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 1 && !url.trim()) {
      setError("Please enter a valid URL.");
      return;
    }
    if (step === 2 && !token.trim()) {
      setError("Please enter a valid token.");
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setClaiming(true);
    setError(null);
    try {
      await onSubmit(url, token, pin);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      <div className="dash-overlay-backdrop" onClick={onClose} />
      <div 
        className="dash-overlay" 
        style={{ width: '400px', height: 'auto', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 201 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-modal-title"
      >
        <div className="dash-overlay-header">
          <h2 id="claim-modal-title" className="dash-overlay-title">Claim a Pad</h2>
          <button type="button" className="dash-action" onClick={onClose}>✕</button>
        </div>
        <div className="dash-overlay-body" style={{ padding: '24px' }}>
          {error && <p className="error" role="alert">{error}</p>}
          
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>Paste URL</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                  Paste pad URL (example: https://myriver.app/pad/crisp-badger-68)
                </div>
                <input 
                  type="text" 
                  className="composer-input" 
                  style={{ border: '1px solid var(--color-border-subtle)', borderRadius: '4px' }}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>Paste Token</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                  Claim token from pad share settings
                </div>
                <input 
                  type="text" 
                  className="composer-input" 
                  style={{ border: '1px solid var(--color-border-subtle)', borderRadius: '4px' }}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoFocus
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>PIN (if locked)</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                  Optional. Enter PIN if the pad is locked.
                </div>
                <input
                  type="password"
                  autoComplete="off"
                  className="composer-input"
                  style={{ border: '1px solid var(--color-border-subtle)', borderRadius: '4px' }}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  autoFocus
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={claiming}>
                  {claiming ? "Claiming..." : "Submit Claim"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
