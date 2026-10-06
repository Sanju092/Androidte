import type { Journey, JourneyStop } from '@/data/metro';
import { AVG_SPEED_MS, DWELL_S } from '@/data/metro';

export interface LatLng { lat: number; lng: number }

export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000, d = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * d / 2) ** 2 +
    Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin((b.lng - a.lng) * d / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Project point p onto segment a→b (equirectangular approx). */
export function projectOnSegment(p: LatLng, a: LatLng, b: LatLng) {
  const kx = Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180) * 111320;
  const ky = 110540;
  const bx = (b.lng - a.lng) * kx, by = (b.lat - a.lat) * ky;
  const px = (p.lng - a.lng) * kx, py = (p.lat - a.lat) * ky;
  const len2 = bx * bx + by * by;
  let t = len2 === 0 ? 0 : (px * bx + py * by) / len2;
  t = Math.max(0, Math.min(1, t));
  const point = { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
  return { t, point, offDist: haversine(p, point) };
}

export interface Progress {
  covered: number;            // metres along journey
  remaining: number;
  progress: number;           // 0..1
  nextIndex: number;          // index of stop we are heading to
  nextStop: JourneyStop | null;
  distToNext: number;
  segFracs: number[];         // fill fraction per segment (length = stops-1)
  livePoint: LatLng;          // snapped position on route
  offRoute: number;           // metres away from route
  etaNextS: number | null;
  etaDestS: number | null;
  arrived: boolean;
  atStopIndex: number | null; // index of stop we are at (<70m), else null
}

export function computeProgress(journey: Journey, pos: LatLng, speedMs: number | null): Progress {
  const stops = journey.stops;
  // find closest segment
  let bestI = 0, bestT = 0, bestOff = Infinity, bestPoint: LatLng = stops[0];
  for (let i = 0; i < stops.length - 1; i++) {
    const r = projectOnSegment(pos, stops[i], stops[i + 1]);
    if (r.offDist < bestOff) { bestOff = r.offDist; bestI = i; bestT = r.t; bestPoint = r.point; }
  }
  const segLen = (i: number) => stops[i + 1].dist - stops[i].dist;
  let covered = stops[bestI].dist + segLen(bestI) * bestT;
  // never allow going backwards beyond destination
  covered = Math.max(0, Math.min(journey.totalDist, covered));
  const remaining = journey.totalDist - covered;

  // next stop index: first stop with dist > covered + 25 (small hysteresis)
  let nextIndex = stops.length - 1;
  for (let i = 0; i < stops.length; i++) {
    if (stops[i].dist > covered + 25) { nextIndex = i; break; }
  }
  const atStopIndex = stops.findIndex(s => Math.abs(s.dist - covered) <= 25);
  const nextStop = remaining > 60 ? stops[nextIndex] : null;
  const distToNext = nextStop ? Math.max(0, nextStop.dist - covered) : 0;

  const segFracs: number[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    segFracs.push(Math.max(0, Math.min(1, (covered - stops[i].dist) / (segLen(i) || 1))));
  }

  const v = speedMs && speedMs > 1 ? speedMs : AVG_SPEED_MS;
  const etaNextS = nextStop ? distToNext / v + (distToNext < 40 ? 0 : DWELL_S * 0) : null;
  const stopsLeft = stops.filter(s => s.dist > covered + 25).length;
  const etaDestS = remaining > 60 ? remaining / v + Math.max(0, stopsLeft - 1) * DWELL_S : null;
  const arrived = remaining <= 60;

  return {
    covered, remaining, progress: journey.totalDist ? covered / journey.totalDist : 0,
    nextIndex, nextStop, distToNext, segFracs, livePoint: bestPoint, offRoute: bestOff,
    etaNextS, etaDestS, arrived, atStopIndex: atStopIndex >= 0 ? atStopIndex : null,
  };
}

export function pointAtCovered(journey: Journey, covered: number): LatLng {
  const stops = journey.stops;
  covered = Math.max(0, Math.min(journey.totalDist, covered));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (covered <= b.dist) {
      const t = (covered - a.dist) / (b.dist - a.dist || 1);
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
  }
  const l = stops[stops.length - 1];
  return { lat: l.lat, lng: l.lng };
}

export function fmtEta(seconds: number | null): string {
  if (seconds === null) return '--';
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

export function fmtDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
