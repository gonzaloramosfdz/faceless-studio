import React from 'react';

import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { COLORS, Choices, Fact, useSimTime } from '../../visuals/quiz';
import { slidePath, slideX, trackSlope, trackY } from './index';
import type { RampParams } from './index';

const rad = (d: number) => (d * Math.PI) / 180;

const Readouts: React.FC<{ items: { color: string; text: string }[]; size: number }> = ({ items, size }) => (
  <div style={{ display: 'flex', gap: size * 0.05 }}>
    {items.map((it, i) => (
      <div key={i} style={{ fontFamily: theme.font, fontWeight: 800, fontSize: size * 0.05, color: it.color, fontVariantNumeric: 'tabular-nums' }}>
        {it.text}
      </div>
    ))}
  </div>
);

const Letter: React.FC<{ x: number; y: number; i: number; size: number }> = ({ x, y, i, size }) => (
  <text x={x} y={y} fill={COLORS[i]} fontFamily={theme.font} fontWeight={800} fontSize={size * 0.05} textAnchor="middle">
    {i === 0 ? 'A' : 'B'}
  </text>
);

/** Two tracks: one straight, one with a dip. Balls slide for real along the computed motion. */
const DipScene: React.FC<{ p: RampParams; simT: number; size: number }> = ({ p, simT, size }) => {
  const { track, dipIsA } = p.dip!;
  const W = size;
  const s = Math.min((0.84 * W) / track.L, (0.17 * W) / track.H);
  const r = W * 0.032;
  const x0 = (W - track.L * s) / 2;
  const laneH = track.H * s + 2 * r + W * 0.08;
  const H = laneH * 2 + W * 0.02;
  const tracks = [dipIsA ? track : { ...track, d: 0 }, dipIsA ? { ...track, d: 0 } : track];
  const paths = tracks.map((k) => slidePath(k, p.g, 0.004));
  return (
    <svg width={W} height={H}>
      {tracks.map((k, i) => {
        const base = laneH * (i + 1) - W * 0.01;
        const X = (x: number) => x0 + x * s;
        const Y = (y: number) => base - y * s;
        const pts = Array.from({ length: 81 }, (_, j) => {
          const x = (k.L * j) / 80;
          return `${X(x)},${Y(trackY(k, x))}`;
        }).join(' ');
        const x = slideX(paths[i], simT, k.L);
        const sl = trackSlope(k, x);
        const n = Math.sqrt(1 + sl * sl);
        const cx = X(x) + (r * -sl) / n;
        const cy = Y(trackY(k, x)) - r / n;
        return (
          <g key={i}>
            <polyline points={pts} fill="none" stroke={theme.dim} strokeWidth={W * 0.01} strokeLinecap="round" strokeLinejoin="round" />
            <line x1={X(k.L)} y1={Y(k.E) - 2.6 * r} x2={X(k.L)} y2={Y(k.E) + W * 0.01} stroke={theme.good} strokeWidth={4} strokeDasharray="8 8" />
            <Letter x={cx} y={cy - r - W * 0.012} i={i} size={size} />
            <circle cx={cx} cy={cy} r={r} fill={COLORS[i]} />
          </g>
        );
      })}
    </svg>
  );
};

/** Two lanes on the same tilted ramp; the balls roll with the spin that matches their travel. */
const RollScene: React.FC<{ p: RampParams; simT: number; size: number }> = ({ p, simT, size }) => {
  const { theta, length, balls } = p.rolling!;
  const W = size;
  const th = rad(theta);
  const Lpx = Math.min((0.86 * W) / Math.cos(th), (0.26 * W) / Math.sin(th));
  const drop = Lpx * Math.sin(th);
  const run = Lpx * Math.cos(th);
  const gapY = W * 0.21;
  const off = W * 0.12;
  const rOf = (i: number) => (balls[0].radius === balls[1].radius ? W * 0.05 : balls[i].radius > balls[1 - i].radius ? W * 0.062 : W * 0.038);
  const H = W * 0.08 + off + drop + gapY + W * 0.04;
  const x0 = (W - run) / 2;
  return (
    <svg width={W} height={H}>
      {balls.map((b, i) => {
        const y0 = W * 0.08 + i * gapY;
        const r = rOf(i);
        const s = Math.min(0.5 * b.a * simT * simT, length) / length; // fraction of the ramp covered
        const px = s * Lpx;
        const tx = x0 + px * Math.cos(th);
        const ty = y0 + off + px * Math.sin(th);
        const cx = tx + r * Math.sin(th);
        const cy = ty - r * Math.cos(th);
        const spin = ((px / r) * 180) / Math.PI;
        return (
          <g key={i}>
            <line x1={x0} y1={y0 + off} x2={x0 + run} y2={y0 + off + drop} stroke={theme.dim} strokeWidth={W * 0.01} strokeLinecap="round" />
            <line x1={x0 + run} y1={y0 + off + drop - 2.4 * r} x2={x0 + run} y2={y0 + off + drop + W * 0.01} stroke={theme.good} strokeWidth={4} strokeDasharray="8 8" />
            <Letter x={cx} y={cy - r - W * 0.012} i={i} size={size} />
            <g transform={`rotate(${spin} ${cx} ${cy})`}>
              {b.hollow ? (
                <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke={COLORS[i]} strokeWidth={r * 0.28} />
              ) : (
                <circle cx={cx} cy={cy} r={r} fill={COLORS[i]} />
              )}
              <line x1={cx} y1={cy} x2={cx + r * 0.9} y2={cy} stroke={b.hollow ? COLORS[i] : theme.bg} strokeWidth={Math.max(3, r * 0.16)} strokeLinecap="round" />
              {!b.hollow && <line x1={cx} y1={cy} x2={cx - r * 0.9} y2={cy} stroke={theme.bg} strokeWidth={Math.max(3, r * 0.16)} strokeLinecap="round" opacity={0.5} />}
            </g>
          </g>
        );
      })}
    </svg>
  );
};

/** Two ramps of equal height: A runs down to the right from the left edge, B down to the left from the right edge. */
const SteepScene: React.FC<{ p: RampParams; simT: number; size: number }> = ({ p, simT, size }) => {
  const { height, angles, accels } = p.ramps!;
  const W = size;
  const cot = angles.map((a) => 1 / Math.tan(rad(a)));
  const hpx = Math.min(W * 0.3, (0.88 * W) / (cot[0] + cot[1] + 0.25));
  const r = W * 0.028;
  const top = W * 0.1;
  const ground = top + hpx;
  const H = ground + W * 0.04;
  return (
    <svg width={W} height={H}>
      <line x1={W * 0.04} y1={top} x2={W * 0.96} y2={top} stroke={theme.line} strokeWidth={3} strokeDasharray="10 10" />
      <rect x={0} y={ground} width={W} height={W * 0.018} rx={6} fill={theme.line} />
      {angles.map((a, i) => {
        const th = rad(a);
        const sx = i === 0 ? 1 : -1;
        const x0 = i === 0 ? W * 0.05 : W * 0.95;
        const len = hpx / Math.sin(th); // px
        const sMax = height / Math.sin(th); // m
        const dist = Math.min(0.5 * accels[i] * simT * simT, sMax) * (len / sMax);
        const tx = x0 + sx * dist * Math.cos(th);
        const ty = top + dist * Math.sin(th);
        const cx = tx + sx * r * Math.sin(th);
        const cy = ty - r * Math.cos(th);
        return (
          <g key={i}>
            <line x1={x0} y1={top} x2={x0 + sx * len * Math.cos(th)} y2={ground} stroke={theme.dim} strokeWidth={W * 0.01} strokeLinecap="round" />
            <Letter x={cx} y={cy - r - W * 0.012} i={i} size={size} />
            <circle cx={cx} cy={cy} r={r} fill={COLORS[i]} />
          </g>
        );
      })}
      <text x={W * 0.5} y={top + hpx * 0.55} fill={theme.dim} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.045} textAnchor="middle">
        {height} m
      </text>
      <line x1={W * 0.5} y1={top + W * 0.01} x2={W * 0.5} y2={top + hpx * 0.3} stroke={theme.dim} strokeWidth={3} />
      <line x1={W * 0.5} y1={top + hpx * 0.68} x2={W * 0.5} y2={ground - W * 0.01} stroke={theme.dim} strokeWidth={3} />
    </svg>
  );
};

export const RampRaceBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const p = puzzle.params as RampParams;
  const tMax = Math.max(p.lands[0], p.lands[1]);
  const simT = useSimTime(timeline, tMax);
  const Scene = p.variant === 'dip' ? DipScene : p.variant === 'rolling' ? RollScene : SteepScene;
  const items = [0, 1].map((i) => {
    const label = i === 0 ? 'A' : 'B';
    if (p.variant === 'steep-shallow') {
      const v = Math.min(p.ramps!.accels[i] * simT, p.ramps!.speed);
      return { color: COLORS[i], text: `${label}: ${v.toFixed(1)} m/s` };
    }
    return { color: COLORS[i], text: `${label}: ${Math.min(simT, p.lands[i]).toFixed(1)} s` };
  });
  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.025 }}>
      <Scene p={p} simT={simT} size={size} />
      <Readouts items={items} size={size} />
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};
