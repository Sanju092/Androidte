// Hyderabad Metro Rail — station data & journey routing
// Lines: Red (Miyapur ↔ LB Nagar), Blue (Nagole ↔ Raidurg), Green (JBS ↔ MG Bus Station)

export type LineId = 'red' | 'blue' | 'green';

export interface Station {
  id: string;
  name: string;
  line: LineId;
  lat: number;
  lng: number;
  index: number;
}

export const LINE_META: Record<LineId, { id: LineId; name: string; short: string; color: string; dim: string }> = {
  red:   { id: 'red',   name: 'Red Line',   short: 'RED', color: '#F03830', dim: 'rgba(240,56,48,0.35)' },
  blue:  { id: 'blue',  name: 'Blue Line',  short: 'BLU', color: '#2E9BFF', dim: 'rgba(46,155,255,0.35)' },
  green: { id: 'green', name: 'Green Line', short: 'GRN', color: '#2FD566', dim: 'rgba(47,213,102,0.35)' },
};

function mk(line: LineId, index: number, name: string, lat: number, lng: number): Station {
  return { id: `${line}-${index}`, name, line, lat, lng, index };
}

export const RED_LINE: Station[] = [
  mk('red', 0,  'Miyapur', 17.4968, 78.3614),
  mk('red', 1,  'JNTU College', 17.4986, 78.3880),
  mk('red', 2,  'KPHB Colony', 17.4940, 78.3999),
  mk('red', 3,  'Kukatpally', 17.4849, 78.4138),
  mk('red', 4,  'Balanagar', 17.4760, 78.4212),
  mk('red', 5,  'Moosapet', 17.4710, 78.4250),
  mk('red', 6,  'Bharat Nagar', 17.4620, 78.4300),
  mk('red', 7,  'Erragadda', 17.4560, 78.4330),
  mk('red', 8,  'ESI Hospital', 17.4500, 78.4350),
  mk('red', 9,  'SR Nagar', 17.4440, 78.4400),
  mk('red', 10, 'Ameerpet', 17.4374, 78.4482),
  mk('red', 11, 'Punjagutta', 17.4290, 78.4530),
  mk('red', 12, 'Irrum Manzil', 17.4230, 78.4570),
  mk('red', 13, 'Khairatabad', 17.4170, 78.4600),
  mk('red', 14, 'Lakdi-ka-pul', 17.4080, 78.4650),
  mk('red', 15, 'Assembly', 17.4020, 78.4690),
  mk('red', 16, 'Nampally', 17.3950, 78.4730),
  mk('red', 17, 'Gandhi Bhavan', 17.3900, 78.4760),
  mk('red', 18, 'Osmania Medical College', 17.3840, 78.4790),
  mk('red', 19, 'MG Bus Station', 17.3793, 78.4835),
  mk('red', 20, 'Malakpet', 17.3730, 78.4900),
  mk('red', 21, 'New Market', 17.3710, 78.4960),
  mk('red', 22, 'Musarambagh', 17.3680, 78.5040),
  mk('red', 23, 'Dilsukhnagar', 17.3680, 78.5150),
  mk('red', 24, 'Chaitanyapuri', 17.3650, 78.5270),
  mk('red', 25, 'Victoria Memorial', 17.3610, 78.5340),
  mk('red', 26, 'LB Nagar', 17.3550, 78.5450),
];

export const BLUE_LINE: Station[] = [
  mk('blue', 0,  'Nagole', 17.3930, 78.5590),
  mk('blue', 1,  'Uppal', 17.3980, 78.5490),
  mk('blue', 2,  'Stadium', 17.4050, 78.5400),
  mk('blue', 3,  'NGRI', 17.4090, 78.5320),
  mk('blue', 4,  'Habsiguda', 17.4140, 78.5260),
  mk('blue', 5,  'Tarnaka', 17.4230, 78.5160),
  mk('blue', 6,  'Mettuguda', 17.4300, 78.5080),
  mk('blue', 7,  'Secunderabad East', 17.4360, 78.5010),
  mk('blue', 8,  'Parade Ground', 17.4398, 78.4975),
  mk('blue', 9,  'Paradise', 17.4415, 78.4890),
  mk('blue', 10, 'Rasoolpura', 17.4430, 78.4790),
  mk('blue', 11, 'Prakash Nagar', 17.4430, 78.4700),
  mk('blue', 12, 'Begumpet', 17.4420, 78.4600),
  mk('blue', 13, 'Ameerpet', 17.4374, 78.4482),
  mk('blue', 14, 'Madhura Nagar', 17.4330, 78.4390),
  mk('blue', 15, 'Yousufguda', 17.4300, 78.4300),
  mk('blue', 16, 'Jubilee Hills Road No 5', 17.4260, 78.4190),
  mk('blue', 17, 'Jubilee Hills Check Post', 17.4230, 78.4110),
  mk('blue', 18, 'Peddamma Gudi', 17.4210, 78.4040),
  mk('blue', 19, 'Madhapur', 17.4190, 78.3960),
  mk('blue', 20, 'Durgam Cheruvu', 17.4160, 78.3890),
  mk('blue', 21, 'Hitec City', 17.4170, 78.3810),
  mk('blue', 22, 'Raidurg', 17.4170, 78.3740),
];

export const GREEN_LINE: Station[] = [
  mk('green', 0, 'JBS Parade Ground', 17.4420, 78.4980),
  mk('green', 1, 'Secunderabad West', 17.4410, 78.4970),
  mk('green', 2, 'Gandhi Hospital', 17.4280, 78.4960),
  mk('green', 3, 'Musheerabad', 17.4200, 78.4960),
  mk('green', 4, 'RTC X Roads', 17.4090, 78.4930),
  mk('green', 5, 'Chikkadpally', 17.4040, 78.4890),
  mk('green', 6, 'Narayanguda', 17.3960, 78.4860),
  mk('green', 7, 'Sultan Bazar', 17.3860, 78.4830),
  mk('green', 8, 'MG Bus Station', 17.3793, 78.4835),
];

export const ALL_STATIONS: Station[] = [...RED_LINE, ...BLUE_LINE, ...GREEN_LINE];
export const STATION_BY_ID = new Map(ALL_STATIONS.map(s => [s.id, s]));

// Cross-line transfer links (station name pairs treated as the same physical interchange)
const EXTRA_LINKS: Array<[string, string]> = [
  ['Parade Ground', 'JBS Parade Ground'],
];

const byName = new Map<string, Station[]>();
for (const s of ALL_STATIONS) {
  const arr = byName.get(s.name) ?? [];
  arr.push(s);
  byName.set(s.name, arr);
}

export const INTERCHANGE_NAMES = new Set<string>();
byName.forEach((arr, name) => { if (arr.length > 1) INTERCHANGE_NAMES.add(name); });
EXTRA_LINKS.forEach(([a, b]) => { INTERCHANGE_NAMES.add(a); INTERCHANGE_NAMES.add(b); });

// ---------- routing ----------
const adjacency = new Map<string, string[]>();
function link(a: string, b: string) {
  (adjacency.get(a) ?? adjacency.set(a, []).get(a)!).push(b);
  (adjacency.get(b) ?? adjacency.set(b, []).get(b)!).push(a);
}
for (const line of [RED_LINE, BLUE_LINE, GREEN_LINE]) {
  for (let i = 0; i < line.length - 1; i++) link(line[i].id, line[i + 1].id);
}
byName.forEach((arr) => { for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) link(arr[i].id, arr[j].id); });
for (const [a, b] of EXTRA_LINKS) {
  const as = byName.get(a) ?? [], bs = byName.get(b) ?? [];
  for (const x of as) for (const y of bs) link(x.id, y.id);
}

export interface JourneyStop {
  id: string;
  name: string;
  line: LineId;
  lat: number;
  lng: number;
  dist: number;              // metres from journey start
  isInterchange: boolean;
  changeTo: LineId | null;   // line to board after alighting here
  arrived: boolean;          // computed at runtime
}

export interface JourneyLeg { line: LineId; from: string; to: string; stops: number; }

export interface Journey {
  stops: JourneyStop[];
  legs: JourneyLeg[];
  totalDist: number;
  originName: string;
  destName: string;
}

function hav(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, d = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * d / 2) ** 2 +
    Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin((b.lng - a.lng) * d / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function buildJourney(originId: string, destId: string): Journey | null {
  if (originId === destId) return null;
  // BFS
  const prev = new Map<string, string | null>();
  const q: string[] = [originId];
  prev.set(originId, null);
  while (q.length) {
    const cur = q.shift()!;
    if (cur === destId) break;
    for (const nb of adjacency.get(cur) ?? []) {
      if (!prev.has(nb)) { prev.set(nb, cur); q.push(nb); }
    }
  }
  if (!prev.has(destId)) return null;
  const path: string[] = [];
  for (let cur: string | null = destId; cur; cur = prev.get(cur)!) path.unshift(cur);

  // Group consecutive same-name nodes (transfer edges) into single stops
  const stops: JourneyStop[] = [];
  let dist = 0;
  let prevCoord: { lat: number; lng: number } | null = null;
  for (const id of path) {
    const s = STATION_BY_ID.get(id)!;
    const last = stops[stops.length - 1];
    if (last && last.name === s.name) { last.changeTo = s.line; continue; }
    if (prevCoord) dist += hav(prevCoord, s);
    stops.push({
      id: s.id, name: s.name, line: s.line, lat: s.lat, lng: s.lng,
      dist, isInterchange: INTERCHANGE_NAMES.has(s.name), changeTo: null, arrived: false,
    });
    prevCoord = s;
  }

  const legs: JourneyLeg[] = [];
  for (let i = 0; i < stops.length; i++) {
    const st = stops[i];
    const lastLeg = legs[legs.length - 1];
    if (lastLeg && lastLeg.line === st.line) { lastLeg.to = st.name; lastLeg.stops++; }
    else legs.push({ line: st.line, from: st.name, to: st.name, stops: 1 });
  }
  return { stops, legs, totalDist: dist, originName: stops[0].name, destName: stops[stops.length - 1].name };
}

export function stationDistanceMeters(lat: number, lng: number, station: { lat: number; lng: number }): number {
  return hav({ lat, lng }, station);
}

export function nearestStation(lat: number, lng: number): Station {
  let best = ALL_STATIONS[0], bd = Infinity;
  for (const s of ALL_STATIONS) {
    const d = hav({ lat, lng }, s);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export const AVG_SPEED_MS = 9;   // ~32 km/h average including slowdowns
export const DWELL_S = 20;       // dwell per intermediate stop
