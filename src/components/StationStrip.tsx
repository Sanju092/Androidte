import { useEffect, useRef } from 'react';
import type { Journey } from '@/data/metro';
import { LINE_META } from '@/data/metro';

interface Props {
  journey: Journey;
  segFracs: number[];
  nextIndex: number;
  arrived: boolean;
  compact?: boolean;
}

/** Horizontal strip: one point per station, filling line between points, auto-scrolls to live position. */
export function StationStrip({ journey, segFracs, nextIndex, arrived, compact }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [nextIndex]);

  const dot = compact ? 9 : 12;
  const segW = compact ? 14 : 22;

  return (
    <div
      ref={scrollRef}
      className="strip-scroll"
      style={{ overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', padding: '10px 6px 4px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', width: 'max-content' }}>
        {journey.stops.map((st, i) => {
          const passed = arrived || i < nextIndex;
          const active = !arrived && i === nextIndex;
          const color = LINE_META[st.line].color;
          return (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center' }}>
              {/* station point */}
              <div
                ref={active ? activeRef : undefined}
                title={st.name}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                {active && (
                  <span className="pulse-ring" style={{ borderColor: color, width: dot + 14, height: dot + 14 }} />
                )}
                <span
                  style={{
                    width: dot, height: dot, borderRadius: '50%', display: 'block',
                    background: passed || active ? color : '#161616',
                    border: `2px solid ${st.isInterchange ? '#EDEDE8' : passed || active ? color : '#3a3a3a'}`,
                    boxShadow: active ? `0 0 10px ${color}` : 'none',
                    transition: 'background 400ms, border-color 400ms, box-shadow 400ms',
                  }}
                />
                <span
                  className="strip-label"
                  style={{
                    color: active ? '#EDEDE8' : passed ? '#6d6d6d' : '#4a4a4a',
                    maxWidth: 64,
                  }}
                >
                  {st.isInterchange ? '⬥ ' : ''}{st.name}
                </span>
              </div>
              {/* segment with filling line */}
              {i < journey.stops.length - 1 && (() => {
                const nextColor = LINE_META[journey.stops[i + 1].line].color;
                const f = arrived ? 1 : (segFracs[i] ?? 0);
                return (
                  <div style={{ width: segW, height: 3, background: '#232323', borderRadius: 2, margin: '0 1px', marginBottom: compact ? 0 : 14, position: 'relative', flexShrink: 0 }}>
                    <div
                      style={{
                        position: 'absolute', inset: 0, width: `${f * 100}%`,
                        background: `linear-gradient(90deg, ${color}, ${nextColor})`,
                        borderRadius: 2, transition: 'width 300ms linear',
                        boxShadow: f > 0 && f < 1 ? `0 0 6px ${color}` : 'none',
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
