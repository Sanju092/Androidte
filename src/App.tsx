import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { AVG_SPEED_MS, LINE_META, buildJourney, type Journey } from '@/data/metro';
import { computeProgress, fmtEta, type LatLng } from '@/lib/geo';
import { usePosition } from '@/hooks/usePosition';
import { FloatingTracker } from '@/components/FloatingTracker';
import { MetroMap } from '@/components/MetroMap';
import { SetupScreen } from '@/components/SetupScreen';
import { AssistantBall } from '@/components/AssistantBall';
import { registerPlugin } from '@capacitor/core';
import { PermissionCard, type Perm } from '@/components/PermissionCard';

const MetroOverlay = registerPlugin<{
  start: (options: { journeyJson: string }) => Promise<{ started: boolean }>;
  stop: () => Promise<void>;
  status: () => Promise<Perm>;
  requestLocation: () => Promise<Perm>;
  requestOverlay: () => Promise<Perm>;
}>('MetroOverlay');

interface Alert { id: number; title: string; sub: string; tone: 'info' | 'warn' | 'arrive' }

const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };

let alertId = 0;

const SESSION_KEY = 'hyd-metro-journey';

export default function App() {
  const [journey, setJourney] = useState<Journey | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      return buildJourney(saved.originId, saved.destId);
    } catch { return null; }
  });
  const [opts, setOpts] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) { const s = JSON.parse(raw); return { simulate: !!s.simulate, simSpeed: s.simSpeed ?? 20, voice: s.voice !== false }; }
    } catch { /* noop */ }
    return { simulate: false, simSpeed: 20, voice: true };
  });
  const [trackerVisible, setTrackerVisible] = useState(true);
  const [alert, setAlert] = useState<Alert | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const voiceRef = useRef(true);
  voiceRef.current = opts.voice;

  // Native Android overlay: starts only once location + "display over other apps" are granted.
  const [perm, setPerm] = useState<Perm>({ location: true, overlay: true }); // web preview: nothing to ask
  const syncNative = useCallback(async () => {
    if (!journey) return;
    try {
      const st = await MetroOverlay.status();
      setPerm(st);
      if (st.location && st.overlay) await MetroOverlay.start({ journeyJson: JSON.stringify(journey) });
    } catch { /* web-only preview */ }
  }, [journey]);

  useEffect(() => {
    if (!journey) return;
    syncNative();
    const onVisibility = () => { if (document.visibilityState === 'visible') syncNative(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [journey, syncNative]);

  const askLocation = async () => { try { await MetroOverlay.requestLocation(); } catch { /* noop */ } syncNative(); };
  const askOverlay = async () => { try { await MetroOverlay.requestOverlay(); } catch { /* noop */ } };

  // ?demo=1 auto-starts a simulated journey (shareable preview)
  useEffect(() => {
    if (journey) return;
    if (!new URLSearchParams(window.location.search).has('demo')) return;
    const j = buildJourney('red-10', 'green-7');
    if (j) begin(j, { simulate: true, simSpeed: 20, voice: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posState = usePosition(journey ? (opts.simulate ? 'sim' : 'gps') : 'gps', journey, opts.simSpeed);

  // fall back to origin station point before first GPS fix
  const effectivePos: LatLng | null = useMemo(() => {
    if (posState.position) return posState.position;
    if (journey) { const o = journey.stops[0]; return { lat: o.lat, lng: o.lng }; }
    return null;
  }, [posState.position, journey]);

  // ETAs should reflect the *felt* speed — in simulation the train rides faster
  const etaSpeedMs = opts.simulate ? AVG_SPEED_MS * opts.simSpeed : posState.speedMs;
  const progress = useMemo(
    () => (journey && effectivePos ? computeProgress(journey, effectivePos, etaSpeedMs) : null),
    [journey, effectivePos, etaSpeedMs],
  );

  const speedKmh = posState.speedMs !== null ? posState.speedMs * 3.6 : null;

  // ---------- alerts ----------
  const fireAlert = useCallback((title: string, sub: string, tone: Alert['tone'], speak?: string) => {
    setAlert({ id: ++alertId, title, sub, tone });
    try { navigator.vibrate?.(tone === 'arrive' ? [300, 120, 300, 120, 500] : [180, 80, 180]); } catch { /* noop */ }
    if (voiceRef.current && speak && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(speak);
      u.rate = 1.02; u.pitch = 1;
      window.speechSynthesis.speak(u);
    }
  }, []);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(t);
  }, [alert]);

  useEffect(() => {
    if (!journey || !progress) return;
    const fired = firedRef.current;
    const next = progress.nextStop;

    // approaching next station
    if (next && progress.distToNext < 350 && progress.distToNext > 60 && !fired.has('appr-' + next.name)) {
      fired.add('appr-' + next.name);
      if (next.changeTo) {
        fireAlert(
          `Change at ${next.name}`,
          `${LINE_META[next.line].name} → ${LINE_META[next.changeTo].name}`,
          'warn',
          `Attention. Next station is ${next.name}. Change here to the ${LINE_META[next.changeTo].name}.`,
        );
      } else {
        fireAlert(`Approaching ${next.name}`, `arriving in ~${fmtEta(progress.etaNextS)}`, 'info');
      }
    }
    // interchange reminder a bit earlier
    if (next?.changeTo && progress.distToNext < 900 && !fired.has('pre-' + next.name)) {
      fired.add('pre-' + next.name);
      fireAlert(`Interchange coming up`, `get ready to change at ${next.name}`, 'warn',
        `Upcoming interchange. You will change at ${next.name} to the ${LINE_META[next.changeTo!].name}.`);
    }
    // destination near
    if (!progress.arrived && progress.remaining < 600 && !fired.has('dest-near')) {
      fired.add('dest-near');
      fireAlert(`Destination approaching`, `${journey.destName} — get ready to deboard`, 'arrive',
        `Your destination ${journey.destName} is approaching. Please get ready to deboard.`);
    }
    // arrived
    if (progress.arrived && !fired.has('dest-arrive')) {
      fired.add('dest-arrive');
      fireAlert(`You have arrived`, journey.destName, 'arrive',
        `You have arrived at ${journey.destName}. Have a good day.`);
    }
  }, [journey, progress, fireAlert]);

  const begin = (j: Journey, o: { simulate: boolean; simSpeed: number; voice: boolean }) => {
    firedRef.current = new Set();
    setOpts(o);
    setTrackerVisible(true);
    setJourney(j);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        originId: j.stops[0].id, destId: j.stops[j.stops.length - 1].id, ...o,
      }));
    } catch { /* noop */ }
    const legs = j.legs.map(l => LINE_META[l.line].name).join(', then ');
    const changes = j.stops.filter(s => s.changeTo).map(s => s.name);
    setTimeout(() => {
      fireAlert(
        'Journey started',
        `${j.originName} → ${j.destName}`,
        'info',
        `Journey started from ${j.originName} to ${j.destName}. Take the ${legs}.` +
        (changes.length ? ` Change at ${changes.join(' and ')}.` : ' No interchange needed.'),
      );
    }, 400);
  };

  const endJourney = () => {
    MetroOverlay.stop().catch(() => { /* web-only preview */ });
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
    setJourney(null);
    setAlert(null);
  };

  // ---------- tracking view ----------
  if (journey && progress) {
    return (
      <div className="app-root">
        {/* full-screen map backdrop */}
        <div className="map-wrap">
          <MetroMap journey={journey} livePoint={progress.livePoint} nextIndex={progress.nextIndex} />
        </div>

        {/* corner readouts (desktop breathing room, hidden on small screens) */}
        <div className="corner-readout" style={{ left: 16, top: 'max(14px, env(safe-area-inset-top))' }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: 2.5, color: '#565656' }}>HYD METRO · LIVE</div>
          <div style={{ ...mono, fontSize: 10, letterSpacing: 1.5, color: '#3f3f3f', marginTop: 4 }}>
            {journey.originName.toUpperCase()} → {journey.destName.toUpperCase()}
          </div>
        </div>

        {/* floating tracker HUD */}
        {trackerVisible && (
          <FloatingTracker
            journey={journey}
            progress={progress}
            speedKmh={speedKmh}
            position={effectivePos}
            source={posState.source}
            onClose={() => setTrackerVisible(false)}
          />
        )}

        {/* reopen pill when tracker is closed */}
        {!trackerVisible && (
          <button className="reopen-pill" onClick={() => setTrackerVisible(true)}>
            <span className="live-dot" style={{ background: LINE_META[progress.nextStop?.line ?? journey.stops[0].line].color }} />
            <span style={{ ...mono, fontSize: 11, letterSpacing: 2 }}>
              {progress.arrived ? 'ARRIVED' : `NEXT · ${progress.nextStop?.name.toUpperCase()} · ${fmtEta(progress.etaNextS)}`}
            </span>
          </button>
        )}

        {/* GPS error hint */}
        {posState.error && !opts.simulate && (
          <div className="gps-hint">
            <span style={{ ...mono, fontSize: 10, letterSpacing: 1.5 }}>GPS: {posState.error} — using network location or waiting for fix.</span>
          </div>
        )}

        {/* alert banner */}
        {alert && (
          <div key={alert.id} className={`alert-banner tone-${alert.tone}`}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: 2.5, color: 'rgba(10,10,10,0.55)' }}>
              {alert.tone === 'warn' ? 'INTERCHANGE' : alert.tone === 'arrive' ? 'DESTINATION' : 'NEXT STATION'}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.15 }}>{alert.title}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(10,10,10,0.7)', marginTop: 2 }}>{alert.sub}</div>
          </div>
        )}

        <PermissionCard perm={perm} onLocation={askLocation} onOverlay={askOverlay} />

        <AssistantBall journey={journey} progress={progress} speedKmh={speedKmh} position={posState.position} />

        {/* bottom bar */}
        <div className="bottom-bar">
          <div style={{ ...mono, fontSize: 10, letterSpacing: 1.5, color: '#7d7d7d', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {progress.arrived
              ? '✓ JOURNEY COMPLETE'
              : `${Math.round(progress.progress * 100)}% · ${(progress.remaining / 1000).toFixed(1)} KM LEFT · ETA ${fmtEta(progress.etaDestS)}`}
          </div>
          <button className="end-btn" onClick={endJourney}>END</button>
        </div>
      </div>
    );
  }

  // ---------- setup ----------
  return (
    <div className="app-root">
      <div className="map-wrap" style={{ opacity: 0.5 }}>
        <MetroMap journey={null} livePoint={null} nextIndex={0} />
      </div>
      <SetupScreen onBegin={begin} />
    </div>
  );
}
