import { useEffect, useMemo, useState } from 'react';
import { LINE_META, nearestStation, stationDistanceMeters, type Journey } from '@/data/metro';
import { fmtEta, type Progress } from '@/lib/geo';

interface Props {
  journey: Journey;
  progress: Progress;
  speedKmh: number | null;
  position: { lat: number; lng: number } | null;
}

export function AssistantBall({ journey, progress, speedKmh, position }: Props) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const nearby = useMemo(() => {
    if (!position) return null;
    const station = nearestStation(position.lat, position.lng);
    const distanceM = stationDistanceMeters(position.lat, position.lng, station);
    return { station, distanceM };
  }, [position]);

  const nearJourneyStation = useMemo(() => {
    if (!position || !progress.nextStop) return null;
    const distanceM = stationDistanceMeters(position.lat, position.lng, progress.nextStop);
    return { distanceM, station: progress.nextStop };
  }, [position, progress.nextStop]);

  const shouldNotify = !!nearJourneyStation && nearJourneyStation.distanceM <= 700 && !progress.arrived;

  useEffect(() => {
    if (shouldNotify) setDismissed(false);
  }, [shouldNotify, nearJourneyStation?.station.name]);

  const activeLine = progress.nextStop?.line ?? journey.stops[journey.stops.length - 1].line;
  const activeColor = LINE_META[activeLine].color;
  const eta = progress.arrived ? 'Arrived' : fmtEta(progress.etaNextS);

  return (
    <>
      {shouldNotify && !dismissed && (
        <div className="assistant-nearby-toast" role="status">
          <div className="assistant-toast-icon" style={{ background: activeColor }}>→</div>
          <div className="assistant-toast-copy">
            <strong>{nearJourneyStation!.station.name} is nearby</strong>
            <span>Next stop · {eta} · {Math.round(speedKmh ?? 0)} km/h</span>
          </div>
          <button onClick={() => setDismissed(true)} aria-label="Dismiss station alert">×</button>
        </div>
      )}

      {open && (
        <section className="assistant-card" aria-label="Metro assistant details" style={{ ['--assistant-color' as string]: activeColor }}>
          <div className="assistant-card-head">
            <div>
              <div className="assistant-kicker">METRO ASSISTANT</div>
              <div className="assistant-title">You're on track</div>
            </div>
            <button className="assistant-close" onClick={() => setOpen(false)} aria-label="Close assistant">×</button>
          </div>

          <div className="assistant-primary" style={{ borderColor: activeColor }}>
            <div>
              <span className="assistant-label">NEXT STATION</span>
              <strong>{progress.arrived ? journey.destName : progress.nextStop?.name ?? '—'}</strong>
            </div>
            <div className="assistant-eta">{eta}</div>
          </div>

          <div className="assistant-stats">
            <div><span>Speed</span><strong>{Math.round(speedKmh ?? 0)} <small>km/h</small></strong></div>
            <div><span>To station</span><strong>{nearJourneyStation ? formatDistance(nearJourneyStation.distanceM) : '—'}</strong></div>
            <div><span>Destination</span><strong>{fmtEta(progress.etaDestS)}</strong></div>
          </div>

          {nearby && (
            <div className="assistant-nearest">
              <span>NEAREST METRO</span>
              <strong>{nearby.station.name}</strong>
              <em>{formatDistance(nearby.distanceM)} away</em>
            </div>
          )}

          <div className="assistant-route">
            <span>{journey.originName}</span><i /><span>{journey.destName}</span>
          </div>
        </section>
      )}

      <button
        className={`assistant-ball ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close metro assistant' : 'Open metro assistant'}
        style={{ '--assistant-color': activeColor } as React.CSSProperties}
      >
        <span className="assistant-ball-ring" />
        <span className="assistant-ball-core">
          <span className="assistant-spark">✦</span>
        </span>
        {!open && shouldNotify && <span className="assistant-badge">1</span>}
      </button>
    </>
  );
}

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
