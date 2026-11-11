import React from 'react';

import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { COLORS, Choices, Fact, useSimTime } from '../../visuals/quiz';
import { shotPos, type ProjectileParams, type Shot } from './index';

export const ProjectileBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const p = puzzle.params as ProjectileParams;
  const W = size;
  const H = size * 0.46;
  const groundY = H - H * 0.07;
  const cliff = p.variant === 'cliff';
  const R = size * (cliff ? 0.03 : 0.02);
  const half = W * 0.1;
  const tMax = Math.max(...p.shots.map((s) => s.flight));
  const simT = useSimTime(timeline, tMax);
  const started = simT > 0.02;
  const maxApex = Math.max(...p.shots.map((s) => s.apex));
  const maxRange = Math.max(...p.shots.map((s) => s.range));
  const x0 = cliff ? W * 0.5 : W * 0.07;
  const s = cliff
    ? (groundY - R - H * 0.08) / maxApex
    : Math.min((W * 0.88) / maxRange, (groundY - R - H * 0.05) / maxApex);
  const off = cliff ? half + R * 1.6 : 0;
  const sx = (i: number) => (cliff ? x0 + (i === 0 ? -off : off) : x0);
  const px = (i: number, t: number) => {
    const q = shotPos(p.shots[i], t, p.g);
    return { x: sx(i) + q.x * s, y: groundY - R - q.y * s };
  };
  const font = size * 0.042;
  const liveSpeed = (sh: Shot, t: number) => {
    const tt = Math.min(t, sh.flight);
    return Math.hypot(sh.vx, sh.vy - p.g * tt);
  };

  const readout = p.shots.map((sh) => {
    const landed = simT >= sh.flight;
    if (cliff) return `${sh.label}: ${liveSpeed(sh, simT).toFixed(1)} m/s`;
    if (p.variant === 'hang-time') return `${sh.label}: ${Math.min(simT, sh.flight).toFixed(1)} s`;
    return landed ? `${sh.label}: ${Math.round(sh.range)} m` : `${sh.label}: ...`;
  });
  const legend = p.shots.map((sh) =>
    cliff ? `${sh.label}: thrown ${sh.angle > 0 ? 'up' : 'down'}` : `${sh.label}: ${sh.angle}°`,
  );

  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.025 }}>
      <svg width={W} height={H}>
        <rect x={0} y={groundY} width={W} height={H - groundY} rx={6} fill={theme.line} />
        {cliff && (
          <rect x={x0 - half} y={groundY - p.height * s} width={half * 2} height={p.height * s} fill={theme.panel} stroke={theme.line} strokeWidth={3} />
        )}
        {cliff && (
          <text x={x0} y={groundY - (p.height * s) / 2 + font * 0.35} fill={theme.dim} fontFamily={theme.font} fontWeight={800} fontSize={font} textAnchor="middle">
            {p.height} m
          </text>
        )}
        {p.shots.map((sh, i) => {
          const now = px(i, simT);
          const n = 40;
          const trail = Array.from({ length: n + 1 }, (_, k) => px(i, (Math.min(simT, sh.flight) * k) / n));
          const a = (sh.angle * Math.PI) / 180;
          const L = size * 0.09;
          const start = px(i, 0);
          const landed = simT >= sh.flight && started;
          return (
            <g key={i}>
              {!started && (
                <g stroke={COLORS[i]} strokeWidth={size * 0.008} strokeLinecap="round" fill="none">
                  <line x1={start.x} y1={start.y} x2={start.x + Math.cos(a) * L} y2={start.y - Math.sin(a) * L} />
                  <polyline
                    points={[-0.35, 0.35]
                      .map((d) => {
                        const ax = start.x + Math.cos(a) * L;
                        const ay = start.y - Math.sin(a) * L;
                        const b = a + Math.PI + d;
                        return `${ax + Math.cos(b) * L * 0.25},${ay - Math.sin(b) * L * 0.25}`;
                      })
                      .join(` ${start.x + Math.cos(a) * L},${start.y - Math.sin(a) * L} `)}
                  />
                </g>
              )}
              <polyline
                points={trail.map((q) => `${q.x},${q.y}`).join(' ')}
                fill="none"
                stroke={COLORS[i]}
                strokeWidth={size * 0.008}
                strokeDasharray={`${size * 0.004} ${size * 0.016}`}
                strokeLinecap="round"
                opacity={0.7}
              />
              {landed && !cliff && <circle cx={now.x} cy={groundY} r={size * 0.012} fill={COLORS[i]} />}
              <circle cx={now.x} cy={now.y} r={R} fill={COLORS[i]} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: size * 0.04, justifyContent: 'center', flexWrap: 'wrap' }}>
        {legend.map((t, i) => (
          <div key={i} style={{ fontFamily: theme.font, fontWeight: 800, fontSize: font, color: COLORS[i] }}>
            {t}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: font * 1.3 }}>
        {readout.map((t, i) => (
          <div key={i} style={{ width: size * 0.3, textAlign: 'center', fontFamily: theme.font, fontWeight: 800, fontSize: font, color: COLORS[i], fontVariantNumeric: 'tabular-nums', opacity: started ? 1 : 0 }}>
            {t}
          </div>
        ))}
      </div>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};
