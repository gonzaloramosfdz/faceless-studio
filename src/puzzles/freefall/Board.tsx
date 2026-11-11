import React from 'react';

import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { COLORS, Choices, Fact, useSimTime } from '../../visuals/quiz';
import type { FreefallParams } from './index';

export const FreefallBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const p = puzzle.params as FreefallParams;
  const W = size;
  const H = size * 0.6;
  const ground = H - 24;
  const top = 64;
  const maxH = Math.max(...p.bodies.map((b) => b.height));
  const tMax = Math.max(...p.bodies.map((b) => b.lands));
  const yScale = (ground - top) / maxH;
  const reach = Math.max(...p.bodies.map((b) => b.vx * b.lands));
  const xScale = reach > 0 ? (W * 0.5) / reach : 0;
  const startX = reach > 0 ? [W * 0.24, W * 0.31] : [W * 0.32, W * 0.68];

  const simT = useSimTime(timeline, tMax);
  const pos = (i: number, t: number) => {
    const b = p.bodies[i];
    const tt = Math.min(t, b.lands);
    return { x: startX[i] + b.vx * tt * xScale, y: ground - Math.max(0, b.height - 0.5 * p.g * tt * tt) * yScale };
  };

  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.03 }}>
      <svg width={W} height={H}>
        <rect x={0} y={ground} width={W} height={H - ground} rx={8} fill={theme.line} />
        {p.bodies.map((b, i) => {
          const y0 = ground - b.height * yScale;
          const now = pos(i, simT);
          const r = b.big ? 34 : 20;
          const trail = Array.from({ length: 14 }, (_, k) => pos(i, (Math.min(simT, b.lands) * k) / 13));
          return (
            <g key={i}>
              <line x1={startX[i] - 70} y1={y0 + r} x2={startX[i] + 30} y2={y0 + r} stroke={theme.dim} strokeWidth={6} strokeLinecap="round" />
              {(i === 0 || b.height !== p.bodies[0].height || reach === 0) && (
                <text x={startX[i] - 84} y={y0 + r + 12} fill={theme.dim} fontFamily={theme.font} fontWeight={800} fontSize={32} textAnchor="end">
                  {b.height} m
                </text>
              )}
              <text x={now.x} y={now.y - 2 * r - 12} fill={COLORS[i]} fontFamily={theme.font} fontWeight={800} fontSize={34} textAnchor="middle">
                {b.label}
              </text>
              <polyline points={trail.map((q) => `${q.x},${q.y - r}`).join(' ')} fill="none" stroke={COLORS[i]} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" opacity={0.6} />
              <circle cx={now.x} cy={now.y - r} r={r} fill={COLORS[i]} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: size * 0.04 }}>
        {p.bodies.map((b, i) => (
          <div key={i} style={{ fontFamily: theme.font, fontWeight: 800, fontSize: size * 0.05, color: COLORS[i], fontVariantNumeric: 'tabular-nums' }}>
            {b.label}: {Math.min(simT, b.lands).toFixed(1)} s
          </div>
        ))}
      </div>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};
