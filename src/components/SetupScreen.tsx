import { useMemo, useState } from 'react';
import { ALL_STATIONS, LINE_META, STATION_BY_ID, buildJourney, nearestStation, type Journey, type Station } from '@/data/metro';

interface Props {
  onBegin: (journey: Journey, opts: { simulate: boolean; simSpeed: number; voice: boolean }) => void;
}

type Step = 'idle' | 'origin' | 'dest' | 'review';

const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };

export function SetupScreen({ onBegin }: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [origin, setOrigin] = useState<Station | null>(null);
  const [dest, setDest] = useState<Station | null>(null);
  const [query, setQuery] = useState('');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [simulate, setSimulate] = useState(false);
  const [simSpeed, setSimSpeed] = useState(20);
  const [voice, setVoice] = useState(true);

  const journey = useMemo(
    () => (origin && dest ? buildJourney(origin.id, dest.id) : null),
    [origin, dest],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? ALL_STATIONS.filter(s => s.name.toLowerCase().includes(q))
      : ALL_STATIONS;
    // de-dupe by name (interchanges appear once per line)
    const seen = new Set<string>();
    return list.filter(s => (seen.has(s.name) ? false : (seen.add(s.name), true)));
  }, [query]);

  const useMyLocation = () => {
    setGpsBusy(true);
    setGpsMsg(null);
    if (!('geolocation' in navigator)) {
      setGpsBusy(false);
      setGpsMsg('Geolocation not supported — pick your station below.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (g) => {
        const st = nearestStation(g.coords.latitude, g.coords.longitude);
        setOrigin(st);
        setGpsBusy(false);
        setGpsMsg(`Nearest station detected: ${st.name}`);
      },
      () => {
        setGpsBusy(false);
        setGpsMsg('Location permission denied — pick your station below.');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const pick = (s: Station) => {
    if (step === 'origin') { setOrigin(s); setStep('dest'); setQuery(''); }
    else if (step === 'dest') { setDest(s); setStep('review'); setQuery(''); }
  };

  return (
    <div style={{ position: 'relative', zIndex: 10, minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: 'max(20px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))' }}>
      {/* masthead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: 3, color: '#6d6d6d' }}>HYDERABAD METRO RAIL</div>
        <div style={{ ...mono, fontSize: 11, letterSpacing: 2, color: '#3f3f3f' }}>LTS·01</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 520, width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(38px, 9vw, 64px)', lineHeight: 0.98, fontWeight: 700, letterSpacing: -1.5, margin: '18px 0 8px', color: '#EDEDE8' }}>
          Live station<br />tracker<span style={{ color: '#F03830' }}>.</span>
        </h1>
        <p style={{ color: '#7d7d7d', fontSize: 14, lineHeight: 1.6, margin: '0 0 26px', maxWidth: 380 }}>
          Real-time position on the Red, Blue &amp; Green lines. Pick your destination —
          a floating tracker follows you on screen and reminds you of interchanges and your stop.
        </p>

        {/* START */}
        {step === 'idle' && (
          <button className="start-btn" onClick={() => setStep('origin')}>
            <span style={{ ...mono, fontSize: 13, letterSpacing: 4 }}>START</span>
            <span className="start-btn-ring" />
          </button>
        )}

        {/* picking */}
        {(step === 'origin' || step === 'dest') && (
          <div>
            <div style={{ ...mono, fontSize: 10, letterSpacing: 2.5, color: '#565656', marginBottom: 8 }}>
              {step === 'origin' ? 'STEP 1 / 2 — WHERE ARE YOU?' : 'STEP 2 / 2 — WHERE TO?'}
            </div>
            {step === 'origin' && (
              <>
                <button className="ghost-btn" onClick={useMyLocation} disabled={gpsBusy} style={{ marginBottom: 10 }}>
                  <span className="live-dot" style={{ background: '#2FD566' }} />
                  {gpsBusy ? 'LOCATING…' : 'USE MY LIVE LOCATION'}
                </button>
                {gpsMsg && <div style={{ ...mono, fontSize: 11, color: '#8a8a8a', margin: '2px 0 10px' }}>{gpsMsg}</div>}
              </>
            )}
            <input
              className="station-input"
              placeholder={step === 'origin' ? 'Search boarding station…' : 'Search destination station…'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <div className="station-list">
              {results.map(s => {
                const meta = LINE_META[s.line];
                const disabled = step === 'dest' && origin?.name === s.name;
                return (
                  <button key={s.name} className="station-row" disabled={disabled} onClick={() => pick(s)} style={disabled ? { opacity: 0.25 } : undefined}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color, flexShrink: 0, boxShadow: `0 0 6px ${meta.dim}` }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{s.name}</span>
                    <span style={{ ...mono, fontSize: 9, letterSpacing: 2, color: meta.color }}>{meta.short}</span>
                  </button>
                );
              })}
            </div>
            <button className="link-btn" onClick={() => { setStep('idle'); setQuery(''); }}>← cancel</button>
          </div>
        )}

        {/* review */}
        {step === 'review' && journey && (
          <div>
            <div style={{ ...mono, fontSize: 10, letterSpacing: 2.5, color: '#565656', marginBottom: 10 }}>ROUTE READY</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#EDEDE8' }}>{journey.originName}</span>
              <span style={{ color: '#4a4a4a' }}>→</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#EDEDE8' }}>{journey.destName}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {journey.legs.map((leg, i) => (
                <span key={i} className="leg-chip" style={{ borderColor: LINE_META[leg.line].color, color: LINE_META[leg.line].color }}>
                  {LINE_META[leg.line].short} · {leg.stops} stops
                </span>
              ))}
              <span className="leg-chip" style={{ borderColor: '#3a3a3a', color: '#9a9a9a' }}>
                ~{Math.max(1, Math.round(journey.totalDist / 1000 / 32 * 60))} min · {(journey.totalDist / 1000).toFixed(1)} km
              </span>
            </div>
            {journey.legs.length > 1 && (
              <div style={{ ...mono, fontSize: 11, color: '#d8a13a', marginBottom: 16, lineHeight: 1.7 }}>
                {journey.stops.filter(s => s.changeTo).map((s, i) => (
                  <div key={i}>⬥ CHANGE AT {s.name.toUpperCase()} → {LINE_META[s.changeTo!].name.toUpperCase()}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
              <ToggleRow label="VOICE REMINDERS" desc="speaks interchanges & destination" on={voice} onClick={() => setVoice(v => !v)} />
              <ToggleRow label="SIMULATE JOURNEY" desc="demo mode — rides the route for you" on={simulate} onClick={() => setSimulate(s => !s)} />
              {simulate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
                  <span style={{ ...mono, fontSize: 10, color: '#565656', letterSpacing: 1.5 }}>SIM SPEED</span>
                  {[5, 20, 60].map(m => (
                    <button key={m} className="speed-chip" data-on={simSpeed === m} onClick={() => setSimSpeed(m)} style={simSpeed === m ? { borderColor: '#EDEDE8', color: '#EDEDE8' } : undefined}>
                      {m}×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="begin-btn" onClick={() => onBegin(journey, { simulate, simSpeed, voice })}>
              BEGIN TRACKING →
            </button>
            <button className="link-btn" onClick={() => setStep('dest')}>← change destination</button>
          </div>
        )}
      </div>

      <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: '#3f3f3f', textAlign: 'center' }}>
        58 STATIONS · 3 LINES · 67 KM NETWORK
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, on, onClick }: { label: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <button className="toggle-row" onClick={onClick}>
      <span style={{ flex: 1, textAlign: 'left' }}>
        <span style={{ ...mono, fontSize: 11, letterSpacing: 2, color: '#EDEDE8', display: 'block' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#6d6d6d' }}>{desc}</span>
      </span>
      <span style={{
        width: 40, height: 22, borderRadius: 11, background: on ? '#EDEDE8' : '#232323',
        position: 'relative', transition: 'background 200ms', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: '50%',
          background: on ? '#0a0a0a' : '#565656', transition: 'left 200ms',
        }} />
      </span>
    </button>
  );
}

export function stationById(id: string) { return STATION_BY_ID.get(id); }
