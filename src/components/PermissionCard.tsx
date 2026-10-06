import { useState } from 'react';

export interface Perm { location: boolean; overlay: boolean }

function Row({ ok, icon, title, sub, label, onClick }: {
  ok: boolean; icon: string; title: string; sub: string; label: string; onClick: () => void;
}) {
  return (
    <div className={`perm-row ${ok ? 'is-ok' : ''}`}>
      <div className="perm-icon">{ok ? '✓' : icon}</div>
      <div className="perm-copy"><b>{title}</b><span>{sub}</span></div>
      {!ok && <button className="perm-btn" onClick={onClick}>{label}</button>}
    </div>
  );
}

export function PermissionCard({ perm, onLocation, onOverlay }: { perm: Perm; onLocation: () => void; onOverlay: () => void }) {
  const [help, setHelp] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden || (perm.location && perm.overlay)) return null;
  return (
    <div className="perm-card" role="dialog" aria-label="Finish setup">
      <div className="perm-head">
        <div><div className="perm-kicker">ONE-TIME SETUP</div><div className="perm-title">Track over other apps</div></div>
        <button className="perm-x" onClick={() => setHidden(true)} aria-label="Dismiss">×</button>
      </div>
      <Row ok={perm.location} icon="◎" title="Precise location" sub="Follows your train, even with the screen off" label="Allow" onClick={onLocation} />
      <Row ok={perm.overlay} icon="▣" title="Display over other apps" sub="Shows the live bar and ball above YouTube, Home…" label="Open" onClick={onOverlay} />
      {!perm.overlay && (
        <button className="perm-link" onClick={() => setHelp(h => !h)}>
          {help ? 'Hide help' : 'Toggle greyed out or blocked?'}
        </button>
      )}
      {help && !perm.overlay && (
        <div className="perm-help">
          Settings → Apps → Hyd Metro Tracker → ⋮ (top right) → <b>Allow restricted settings</b>, then tap Open again.
          Android blocks this for apps installed outside the Play Store.
        </div>
      )}
    </div>
  );
}
