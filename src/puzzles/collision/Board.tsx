import React from 'react';
import { useCurrentFrame } from 'remotion';

import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { COLORS, Choices, Fact, useSimTime } from '../../visuals/quiz';
import type { CollisionParams } from './index';

const STEEL = '#8fa0c8';
const TC = 1.2; // simulated seconds before impact
const TPOST = 1.8; // simulated seconds after impact

export const CollisionBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const q = puzzle.params as CollisionParams;
  const frame = useCurrentFrame();
  const W = size;
  const H = size * 0.38;
  const font = size * 0.042;
  const cradle = q.variant === 'cradle';
  // One and a half swings, so the animation ends with the balls out on the far side (the answer), not back at the start.
  const duration = cradle ? 3 * Math.PI : TC + TPOST;
  const simT = useSimTime(timeline, duration);
  const started = simT > 0.02;
  const base = H * 0.8;
  const label = (x: number, y: number, t: string, c: string) => (
    <text x={x} y={y} fill={c} fontFamily={theme.font} fontWeight={800} fontSize={font} textAnchor="middle">
      {t}
    </text>
  );
  let scene: React.ReactNode = null;
  let legend: string[] = [];

  if (cradle) {
    const total = q.total!;
    const n = q.n!;
    const r = (W * 0.66) / (2 * total);
    const topY = H * 0.06;
    const L = H * 0.68;
    const th0 = ((q.angle ?? 30) * Math.PI) / 180;
    const cx = W / 2;
    const swing = -th0 * Math.cos(simT);
    const phase = simT % (2 * Math.PI);
    const inLeft = phase < Math.PI / 2 || phase >= (3 * Math.PI) / 2;
    legend = [`${total} balls in a row`, `${n} pulled back`];
    scene = (
      <>
        <rect x={cx - total * r - 20} y={topY - 8} width={total * 2 * r + 40} height={10} rx={5} fill={theme.line} />
        {Array.from({ length: total }, (_, i) => {
          const moving = inLeft ? i < n : i >= total - n;
          const a = moving ? swing : 0;
          const px = cx + (i - (total - 1) / 2) * 2 * r;
          const bx = px + L * Math.sin(a);
          const by = topY + L * Math.cos(a);
          return (
            <g key={i}>
              <line x1={px} y1={topY} x2={bx} y2={by} stroke={theme.dim} strokeWidth={size * 0.004} />
              <circle cx={bx} cy={by} r={r} fill={moving && Math.abs(a) > 1e-6 ? COLORS[0] : STEEL} stroke={theme.bg} strokeWidth={2} />
            </g>
          );
        })}
      </>
    );
  } else {
    const m1 = q.m1!;
    const m2 = q.m2!;
    const v1 = q.v1After!;
    const v2 = q.v2After!;
    const ratio1 = v1 / q.v!;
    const ratio2 = v2 / q.v!;
    const sticky = q.variant === 'sticky';
    legend = [`A: ${m1} kg, ${q.v} m/s`, `B: ${m2} kg, at rest`];
    // Half-sizes (balls) or widths (carts).
    let wA: number, wB: number, hA: number, hB: number;
    if (sticky) {
      wA = W * (0.11 + 0.02 * m1);
      wB = W * (0.11 + 0.02 * m2);
      hA = hB = W * 0.12;
    } else if (q.variant === 'equal') {
      wA = wB = W * 0.1;
      hA = hB = wA;
    } else {
      wA = W * 0.17;
      wB = Math.max(W * 0.044, wA / Math.cbrt(m1 / m2));
      hA = wA;
      hB = wB;
    }
    // Left edges of bodies (width = diameter for balls). u = approach speed on screen.
    const xa0 = W * 0.04;
    const f = sticky ? ratio1 : ratio2;
    const u = (W * 0.96 - xa0 - wA - wB) / (TC + f * TPOST);
    const xb0 = xa0 + wA + u * TC;
    const afterA = ratio1 * u;
    const afterB = (sticky ? ratio1 : ratio2) * u;
    const tt = Math.max(0, simT - TC);
    const xa = simT < TC ? xa0 + u * simT : xa0 + u * TC + afterA * tt;
    const xb = simT < TC ? xb0 : xb0 + afterB * tt;
    const wheel = W * 0.02;
    const body = (x: number, w: number, h: number, i: number, text: string) =>
      sticky ? (
        <g>
          <rect x={x} y={base - 2 * wheel - h} width={w} height={h} rx={10} fill={COLORS[i]} />
          <text x={x + w / 2} y={base - 2 * wheel - h / 2 + font * 0.35} fill={theme.bg} fontFamily={theme.font} fontWeight={800} fontSize={font} textAnchor="middle">
            {text}
          </text>
          <circle cx={x + w * 0.22} cy={base - wheel} r={wheel} fill={theme.text} />
          <circle cx={x + w * 0.78} cy={base - wheel} r={wheel} fill={theme.text} />
        </g>
      ) : (
        <circle cx={x + w / 2} cy={base - w / 2} r={w / 2} fill={COLORS[i]} />
      );
    const topA = sticky ? base - 2 * wheel - hA : base - wA;
    const topB = sticky ? base - 2 * wheel - hB : base - wB;
    const together = sticky && simT >= TC;
    const arrowY = sticky ? base - 2 * wheel - hA / 2 : base - wA / 2;
    scene = (
      <>
        {!started && (
          <g stroke={COLORS[0]} strokeWidth={size * 0.01} strokeLinecap="round" fill="none">
            <line x1={xa + wA + 14} y1={arrowY} x2={xa + wA + 14 + W * 0.08} y2={arrowY} />
            <polyline points={`${xa + wA + 14 + W * 0.05},${arrowY - 14} ${xa + wA + 14 + W * 0.08},${arrowY} ${xa + wA + 14 + W * 0.05},${arrowY + 14}`} />
          </g>
        )}
        {body(xa, wA, hA, 0, `${m1} kg`)}
        {body(xb, wB, hB, 1, `${m2} kg`)}
        {together && <rect x={xb - 6} y={base - 2 * wheel - hA * 0.55} width={12} height={hA * 0.2} fill={theme.text} />}
        {label(xa + wA / 2, topA - font * 0.4, 'A', COLORS[0])}
        {label(xb + wB / 2, topB - font * 0.4, 'B', COLORS[1])}
        {together && frame >= timeline.reveals[1] &&
          label((xa + xb + wB) / 2, Math.min(topA, topB) - font * 1.9, `${Math.round(v1 * 10) / 10} m/s`, theme.accent)}
      </>
    );
  }

  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.025 }}>
      <svg width={W} height={H}>
        {!cradle && <rect x={0} y={base} width={W} height={H * 0.05} rx={6} fill={theme.line} />}
        {scene}
      </svg>
      <div style={{ display: 'flex', gap: size * 0.04, justifyContent: 'center', flexWrap: 'wrap' }}>
        {legend.map((t, i) => (
          <div key={i} style={{ fontFamily: theme.font, fontWeight: 800, fontSize: font, color: cradle ? theme.dim : COLORS[i] }}>
            {t}
          </div>
        ))}
      </div>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={q.fact} timeline={timeline} size={size} />
    </div>
  );
};
