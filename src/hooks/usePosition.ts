import { useEffect, useRef, useState } from 'react';
import type { Journey } from '@/data/metro';
import { AVG_SPEED_MS } from '@/data/metro';
import { pointAtCovered, type LatLng } from '@/lib/geo';

export type PositionSource = 'gps' | 'sim' | 'none';

export interface PositionState {
  position: LatLng | null;
  speedMs: number | null;
  accuracy: number | null;
  source: PositionSource;
  error: string | null;
}

/** Live GPS watch, or a metro-speed simulator that walks the journey polyline. */
export function usePosition(mode: 'gps' | 'sim', journey: Journey | null, simMult: number): PositionState {
  const [state, setState] = useState<PositionState>({
    position: null, speedMs: null, accuracy: null, source: 'none', error: null,
  });
  const lastRef = useRef<{ p: LatLng; t: number } | null>(null);
  const simRef = useRef({ covered: 0, mult: simMult });
  simRef.current.mult = simMult;

  useEffect(() => {
    if (!journey) return;
    lastRef.current = null;
    simRef.current.covered = 0;

    if (mode === 'sim') {
      const t0 = performance.now();
      let last = t0;
      const id = window.setInterval(() => {
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        simRef.current.covered += AVG_SPEED_MS * simRef.current.mult * dt;
        const c = Math.min(simRef.current.covered, journey.totalDist);
        setState({
          position: pointAtCovered(journey, c),
          speedMs: c >= journey.totalDist ? 0 : AVG_SPEED_MS,
          accuracy: 5, source: 'sim', error: null,
        });
      }, 200);
      return () => window.clearInterval(id);
    }

    // real GPS
    if (!('geolocation' in navigator)) {
      setState(s => ({ ...s, source: 'none', error: 'Geolocation is not supported on this device.' }));
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (g) => {
        const p = { lat: g.coords.latitude, lng: g.coords.longitude };
        let speed = g.coords.speed;
        if ((speed === null || Number.isNaN(speed)) && lastRef.current) {
          const dt = (g.timestamp - lastRef.current.t) / 1000;
          if (dt > 0.5) {
            const dx = (p.lat - lastRef.current.p.lat), dy = (p.lng - lastRef.current.p.lng);
            const approx = Math.sqrt(dx * dx + dy * dy) * 111320 / dt;
            speed = approx;
          }
        }
        lastRef.current = { p, t: g.timestamp };
        setState({
          position: p,
          speedMs: speed !== null && !Number.isNaN(speed) ? Math.max(0, speed) : null,
          accuracy: g.coords.accuracy, source: 'gps', error: null,
        });
      },
      (err) => setState(s => ({ ...s, source: 'none', error: err.message })),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [mode, journey]);

  return state;
}
