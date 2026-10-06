import { useMemo } from 'react';
import { ALL_STATIONS, LINE_META, RED_LINE, BLUE_LINE, GREEN_LINE, type Journey } from '@/data/metro';
import type { LatLng } from '@/lib/geo';

interface Props {
  journey: Journey | null;
  livePoint: LatLng | null;
  nextIndex: number;
}

/** Schematic geographic map of the Hyderabad Metro with a live position dot. */
export function MetroMap({ journey, livePoint, nextIndex }: Props) {
  const W = 1000, H = 760, PAD = 60;

  const { project, lines } = useMemo(() => {
    const lats = ALL_STATIONS.map(s => s.lat), lngs = ALL_STATIONS.map(s => s.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const midLat = (minLat + maxLat) / 2;
    const kx = Math.cos(midLat * Math.PI / 180);
    const sx = (W - 2 * PAD) / ((maxLng - minLng) * kx || 1);
    const sy = (H - 2 * PAD) / (maxLat - minLat || 1);
    const s = Math.min(sx, sy);
    const ox = (W - (maxLng - minLng) * kx * s) / 2;
    const oy = (H - (maxLat - minLat) * s) / 2;
    const project = (lat: number, lng: number) => ({
      x: ox + (lng - minLng) * kx * s,
      y: H - (oy + (lat - minLat) * s),
    });
    return { project, lines: [RED_LINE, BLUE_LINE, GREEN_LINE] };
  }, []);

  const journeyNames = useMemo(() => new Set(journey?.stops.map(s => s.name) ?? []), [journey]);
  const dest = journey?.stops[journey.stops.length - 1];
  const origin = journey?.stops[0];
  const next = journey?.stops[nextIndex];
  const labelStations = useMemo(() => {
    const set = new Set<string>();
    if (journey) {
      for (const st of journey.stops) if (st.isInterchange) set.add(st.name);
      if (origin) set.add(origin.name);
      if (dest) set.add(dest.name);
      if (next) set.add(next.name);
    }
    return set;
  }, [journey, origin, dest, next]);

  const live = livePoint ? project(livePoint.lat, livePoint.lng) : null;
  const activeLine = next?.line ?? dest?.line ?? 'red';
  const activeColor = LINE_META[activeLine].color;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* grid */}
      {Array.from({ length: 12 }, (_, i) => (
        <line key={'v' + i} x1={(W / 12) * (i + 1)} y1={0} x2={(W / 12) * (i + 1)} y2={H} stroke="#ffffff" strokeOpacity="0.025" />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={'h' + i} x1={0} y1={(H / 9) * (i + 1)} x2={W} y2={(H / 9) * (i + 1)} stroke="#ffffff" strokeOpacity="0.025" />
      ))}

      {/* lines */}
      {lines.map(line => {
        const meta = LINE_META[line[0].line];
        const pts = line.map(s => project(s.lat, s.lng));
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const dimmed = journey && !journey.legs.some(l => l.line === meta.id);
        return (
          <g key={meta.id} opacity={dimmed ? 0.22 : 1} style={{ transition: 'opacity 600ms' }}>
            <path d={d} fill="none" stroke={meta.color} strokeWidth="10" strokeOpacity="0.12" strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke={meta.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}

      {/* stations */}
      {ALL_STATIONS.map(st => {
        const p = project(st.lat, st.lng);
        const onJourney = journeyNames.has(st.name);
        const dimmed = journey && !onJourney;
        const isInter = st.name === 'Ameerpet' || st.name === 'MG Bus Station' || st.name === 'Parade Ground';
        return (
          <circle key={st.id} cx={p.x} cy={p.y}
            r={isInter ? 6 : 3.2}
            fill={onJourney ? '#0a0a0a' : '#0a0a0a'}
            stroke={dimmed ? '#3a3a3a' : onJourney ? '#EDEDE8' : '#6d6d6d'}
            strokeWidth={isInter ? 2.4 : 1.6}
            opacity={dimmed ? 0.35 : 1}
            style={{ transition: 'opacity 600ms' }}
          />
        );
      })}

      {/* labels */}
      {(() => {
        const seen = new Set<string>();
        const labeled = ALL_STATIONS.filter(s => {
          if (!labelStations.has(s.name) || seen.has(s.name)) return false;
          seen.add(s.name);
          return true;
        });
        return labeled.map(st => {
          const p = project(st.lat, st.lng);
          const isDest = dest?.name === st.name, isOrigin = origin?.name === st.name;
          return (
            <text key={'lbl' + st.id} x={p.x + 10} y={p.y - 8} fill={isDest ? '#F03830' : isOrigin ? '#2FD566' : '#9a9a9a'}
              fontSize="15" fontFamily="ui-monospace, Menlo, monospace" letterSpacing="1.5"
              style={{ textTransform: 'uppercase' }}>
              {st.name.toUpperCase()}
            </text>
          );
        });
      })()}

      {/* origin / dest markers */}
      {origin && (() => { const p = project(origin.lat, origin.lng); return (
        <circle cx={p.x} cy={p.y} r="11" fill="none" stroke="#2FD566" strokeWidth="2.5" opacity="0.9" />); })()}
      {dest && (() => { const p = project(dest.lat, dest.lng); return (
        <g>
          <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="#F03830" strokeWidth="2.5" opacity="0.9" />
          <circle cx={p.x} cy={p.y} r="18" fill="none" stroke="#F03830" strokeWidth="1" opacity="0.3">
            <animate attributeName="r" values="12;24" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>); })()}

      {/* live dot */}
      {live && (
        <g filter="url(#glow)">
          <circle cx={live.x} cy={live.y} r="16" fill={activeColor} opacity="0.18">
            <animate attributeName="r" values="10;22" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={live.x} cy={live.y} r="7" fill={activeColor} stroke="#0a0a0a" strokeWidth="2.5" />
        </g>
      )}
    </svg>
  );
}
