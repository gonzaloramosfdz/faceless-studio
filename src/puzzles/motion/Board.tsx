import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { Work } from '../../visuals/Work';
import type { MotionParams } from './index';

export const MotionBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const frame = useCurrentFrame();
  const p = puzzle.params as MotionParams;
  const pad = size * 0.08;
  const x0 = pad;
  const x1 = size - pad;
  const y = size * 0.17;
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

  let dots: { x: number; color: string; label: string }[];
  if (p.variant === 'round-trip') {
    // The trip plays once while the question is read: the slow leg visibly takes longer.
    const end = timeline.countdown.from;
    const turn = (p.t1 / (p.t1 + p.t2)) * end;
    const out = interpolate(frame, [10, turn], [0, 1], clamp);
    const back = interpolate(frame, [turn, end], [0, 1], clamp);
    const pos = frame < turn ? out : 1 - back;
    dots = [{ x: x0 + (x1 - x0) * pos, color: theme.accent, label: `${frame < turn ? p.v1 : p.v2} km/h` }];
  } else {
    // The two only move once the meeting time has been worked out, so the picture never gives the answer away.
    const go = interpolate(frame, [timeline.reveals[1], timeline.reveals[2]], [0, 1], clamp);
    const meet = p.result / p.distance;
    dots = [
      { x: x0 + (x1 - x0) * meet * go, color: theme.accent, label: `${p.v1} km/h` },
      { x: x1 - (x1 - x0) * (1 - meet) * go, color: '#5eead4', label: `${p.v2} km/h` },
    ];
  }

  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.04 }}>
      <svg width={size} height={size * 0.3}>
        <line x1={x0} y1={y} x2={x1} y2={y} stroke={theme.line} strokeWidth={10} strokeLinecap="round" />
        {[x0, x1].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={16} fill={theme.dim} />
            <text x={x} y={y + 62} fill={theme.dim} fontFamily={theme.font} fontWeight={800} fontSize={34} textAnchor="middle">
              {i === 0 ? 'A' : 'B'}
            </text>
          </g>
        ))}
        <text x={size / 2} y={y + 62} fill={theme.dim} fontFamily={theme.font} fontWeight={500} fontSize={34} textAnchor="middle">
          {p.distance} km
        </text>
        {dots.map((d, i) => (
          <g key={i}>
            <circle cx={d.x} cy={y} r={26} fill={d.color} />
            <text
              x={Math.min(Math.max(d.x, pad + 70), size - pad - 70)}
              y={y - 46 - (dots.length > 1 && i === 1 && Math.abs(dots[0].x - dots[1].x) < 220 ? 44 : 0)}
              fill={d.color}
              fontFamily={theme.font}
              fontWeight={800}
              fontSize={36}
              textAnchor="middle"
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
      <Work rows={p.rows} timeline={timeline} width={size * 0.94} fontSize={size * 0.056} />
    </div>
  );
};
