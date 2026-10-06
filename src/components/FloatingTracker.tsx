import { useCallback, useEffect, useRef, useState } from 'react';
import type { Journey } from '@/data/metro';
import { LINE_META } from '@/data/metro';
import type { Progress } from '@/lib/geo';
import { fmtEta } from '@/lib/geo';
import { StationStrip } from './StationStrip';
import type { PositionSource } from '@/hooks/usePosition';

interface Props {
  journey: Journey;
  progress: Progress;
  speedKmh: number | null;
  position: { lat: number; lng: number } | null;
  source: PositionSource;
  onClose: () => void;
}

/** Draggable floating HUD. Drag anywhere on the panel; hold × for 3 s to close. */
export function FloatingTracker({ journey, progress, speedKmh, position, source, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number; id: number } | null>(null);

  // hold-to-close state
  const [hold, setHold] = useState(0);
  const holdRaf = useRef(0);

  // initial position: top center, below safe-area
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    setPos({ x: Math.max(8, (window.innerWidth - w) / 2), y: 12 });
  }, []);

  const clamp = useCallback((x: number, y: number) => {
    const el = panelRef.current;
    const w = el?.offsetWidth ?? 320, h = el?.offsetHeight ?? 220;
    return {
      x: Math.min(Math.max(4, x), window.innerWidth - w - 4),
      y: Math.min(Math.max(4, y), window.innerHeight - h - 4),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-close-btn]')) return;
    const el = panelRef.current;
    if (!el || !pos) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    setPos(clamp(e.clientX - d.dx, e.clientY - d.dy));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
  };

  // ---- hold × for 3 seconds to close ----
  const startHold = (e: React.PointerEvent) => {
    e.stopPropagation();
    const t0 = performance.now();
    const tick = () => {
      const p = (performance.now() - t0) / 3000;
      if (p >= 1) { setHold(1); onClose(); return; }
      setHold(p);
      holdRaf.current = requestAnimationFrame(tick);
    };
    holdRaf.current = requestAnimationFrame(tick);
  };
  const cancelHold = () => { cancelAnimationFrame(holdRaf.current); setHold(0); };
  useEffect(() => () => cancelAnimationFrame(holdRaf.current), []);

  const currentLine = progress.nextStop
    ? journey.stops[Math.min(progress.nextIndex, journey.stops.length - 1)].line
    : journey.stops[journey.stops.length - 1].line;
  const activeColor = LINE_META[currentLine].color;

  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };

  return (
    <div
      ref={panelRef}
      className="tracker-panel"
      style={{
        position: 'fixed', zIndex: 60, left: pos?.x ?? -9999, top: pos?.y ?? -9999,
        width: 'min(92vw, 340px)', touchAction: 'none', userSelect: 'none',
        visibility: pos ? 'visible' : 'hidden',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* header bar */}
      <div className="tracker-head" style={{ cursor: 'grab' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span className="live-dot" style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }} />
          <span style={{ ...mono, fontSize: 10, letterSpacing: 2, color: '#9a9a9a' }}>
            LIVE · {LINE_META[currentLine].short}
          </span>
          <span style={{ ...mono, fontSize: 9, letterSpacing: 1, color: '#565656' }}>
            {source === 'gps' ? 'GPS' : source === 'sim' ? 'SIM' : '—'}
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="22" height="10" viewBox="0 0 22 10" style={{ opacity: 0.35 }}>
            {[0, 5, 10, 15].map(y => <rect key={y} x="0" y={y} width="22" height="1.6" rx="0.8" fill="#EDEDE8" />)}
          </svg>
          {/* hold 3s to close */}
          <button
            data-close-btn
            aria-label="Hold 3 seconds to close tracker"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            style={{
              position: 'relative', width: 30, height: 30, borderRadius: '50%',
              border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center',
              background: `conic-gradient(${activeColor} ${hold * 360}deg, rgba(255,255,255,0.08) 0deg)`,
              transition: hold === 0 ? 'background 200ms' : 'none',
            }}
          >
            <span style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: '#101010', display: 'grid', placeItems: 'center' }}>
              <svg width="11" height="11" viewBox="0 0 11 11">
                <path d="M1 1 L10 10 M10 1 L1 10" stroke="#EDEDE8" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        </span>
      </div>

      {/* station points + filling line */}
      <StationStrip journey={journey} segFracs={progress.segFracs} nextIndex={progress.nextIndex} arrived={progress.arrived} />

      {/* data rows */}
      <div style={{ padding: '4px 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        <DataCell label="NEXT STATION" value={progress.arrived ? '—' : progress.nextStop?.name ?? '—'}
          sub={progress.arrived ? 'journey complete' : fmtEta(progress.etaNextS)} accent={activeColor} mono={mono} />
        <DataCell label="DESTINATION" value={journey.destName}
          sub={progress.arrived ? 'arrived' : fmtEta(progress.etaDestS)} accent="#EDEDE8" mono={mono} />
        <DataCell label="SPEED" value={`${Math.round(speedKmh ?? 0)}`} sub="km/h" accent="#EDEDE8" mono={mono} />
        <DataCell label="LOCATION"
          value={position ? `${position.lat.toFixed(4)}°` : '…'}
          sub={position ? `${position.lng.toFixed(4)}°` : 'locating'} accent="#EDEDE8" mono={mono} small />
      </div>

      {/* bottom progress line */}
      <div style={{ height: 2, background: '#1c1c1c' }}>
        <div style={{
          height: '100%', width: `${progress.progress * 100}%`,
          background: `linear-gradient(90deg, ${LINE_META[journey.legs[0].line].color}, ${activeColor})`,
          transition: 'width 300ms linear',
        }} />
      </div>
      <div style={{ ...mono, fontSize: 8.5, letterSpacing: 1.5, color: '#4a4a4a', padding: '5px 12px 7px', display: 'flex', justifyContent: 'space-between' }}>
        <span>DRAG TO MOVE</span>
        <span>HOLD ✕ 3S TO CLOSE</span>
      </div>
    </div>
  );
}

function DataCell({ label, value, sub, accent, mono, small }: {
  label: string; value: string; sub: string; accent: string; mono: React.CSSProperties; small?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...mono, fontSize: 8.5, letterSpacing: 1.8, color: '#565656', marginBottom: 2 }}>{label}</div>
      <div style={{
        fontSize: small ? 12 : 15, fontWeight: 600, color: accent, lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
      <div style={{ ...mono, fontSize: 10, color: '#8a8a8a', marginTop: 1 }}>{sub}</div>
    </div>
  );
}
