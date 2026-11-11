import React from 'react';

import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { COLORS, Choices, Fact, useSimTime } from '../../visuals/quiz';
import { angleAt, swingTable } from './index';
import type { PendulumParams } from './index';

export const PendulumBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const p = puzzle.params as PendulumParams;
  const W = size;
  const simT = useSimTime(timeline, p.simSeconds);
  const maxL = Math.max(p.pends[0].length, p.pends[1].length);
  const unit = (0.4 * W) / maxL;
  const top = W * 0.1;
  
  const rMax = p.variant === 'mass' ? W * 0.05 : W * 0.035;
  const capY = top + 0.4 * W + 2 * rMax + W * 0.05;
  const H = capY + W * 0.065;
  const amp = (p.amp * Math.PI) / 180;
  const tables = React.useMemo(() => p.pends.map((q) => swingTable(q.length, q.g, p.amp, p.simSeconds)), [puzzle.key]);
  const px = [W * 0.27, W * 0.73];
  const massRatio = p.variant === 'mass' ? Math.max(p.pends[0].mass, p.pends[1].mass) / Math.min(p.pends[0].mass, p.pends[1].mass) : 1;

  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.025 }}>
      <svg width={W} height={H}>
        <rect x={W * 0.08} y={top - W * 0.012} width={W * 0.84} height={W * 0.012} rx={4} fill={theme.line} />
        {p.pends.map((q, i) => {
          const L = q.length * unit;
          const big = massRatio > 1 && q.mass === Math.max(p.pends[0].mass, p.pends[1].mass);
          const r = Math.min(massRatio > 1 ? (big ? W * 0.05 : W * 0.026) : W * 0.035, L * 0.28);
          const th = angleAt(tables[i], simT);
          const bx = px[i] + (L + r) * Math.sin(th);
          const by = top + (L + r) * Math.cos(th);
          const ex = px[i] + L * Math.sin(th);
          const ey = top + L * Math.cos(th);
          const swings = Math.floor(simT / p.periods[i] + 1e-9);
          return (
            <g key={i}>
              {[-amp, amp].map((a, k) => (
                <line key={k} x1={px[i]} y1={top} x2={px[i] + (L + 2 * r) * Math.sin(a)} y2={top + (L + 2 * r) * Math.cos(a)} stroke={theme.line} strokeWidth={3} strokeDasharray="6 10" />
              ))}
              <line x1={px[i]} y1={top} x2={ex} y2={ey} stroke={theme.dim} strokeWidth={4} strokeLinecap="round" />
              <circle cx={px[i]} cy={top} r={6} fill={theme.dim} />
              <circle cx={bx} cy={by} r={r} fill={COLORS[i]} />
              <text x={px[i]} y={top - W * 0.03} fill={COLORS[i]} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.05} textAnchor="middle">
                {q.label}
              </text>
              <text x={px[i]} y={capY} fill={COLORS[i]} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.045} textAnchor="middle">
                {q.caption}
              </text>
              <text x={px[i]} y={capY + W * 0.055} fill={COLORS[i]} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.045} textAnchor="middle">
                {swings} {swings === 1 ? 'swing' : 'swings'}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontFamily: theme.font, fontWeight: 800, fontSize: size * 0.05, color: theme.dim, fontVariantNumeric: 'tabular-nums' }}>Time: {simT.toFixed(1)} s</div>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};
