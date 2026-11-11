import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { COLORS, Choices, Fact, useSimTime } from '../../visuals/quiz';
import type { SeesawParams } from './index';

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

export const SeesawBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const p = puzzle.params as SeesawParams;
  const frame = useCurrentFrame();
  const W = size;
  const H = size * 0.5;
  const th = W * 0.026; // beam thickness
  const s = (W * 0.92) / (p.a + p.b); // pixels per metre
  const px = W * 0.04 + p.a * s;
  const ground = H - W * 0.03;
  const py = ground - W * 0.15;

  // Real seconds since the simulation started (it plays while line s0 is spoken).
  const run = timeline.lines.find((l) => l.id === 's0')!;
  const window = ((run.to - run.from) * 0.45 + 28) / 30;
  const e = useSimTime(timeline, window);
  const started = frame >= run.from + (run.to - run.from) * 0.55;

  // Final tilt in degrees (positive = right side down).
  const total = Math.abs(p.left) + Math.abs(p.right);
  const target = p.net === 0 ? 0 : Math.sign(p.net) * (6 + 8 * clamp(Math.abs(p.net) / total));
  let ang = 0;
  let slideX: number | undefined;
  let lift = 0;
  if (p.slide === undefined) {
    const t = Math.max(0, e - 0.2);
    ang = p.net === 0 ? 2.5 * Math.exp(-3 * t) * Math.sin(8 * t) : target * (1 - Math.exp(-5 * t) * Math.cos(7 * t));
  } else {
    const w = p.weights[p.slide];
    const x0 = Math.sign(w.x) * (Math.abs(w.x) > 0 ? p.b - 0.7 : 0);
    const move = clamp((e - 0.1) / 0.9);
    const ease = move * move * (3 - 2 * move);
    slideX = x0 + (w.x - x0) * ease;
    lift = (1 - clamp((e - 1.0) / 0.3)) * W * 0.07;
    const t = Math.max(0, e - 1.3);
    ang = target * (1 - Math.exp(-5 * t) * Math.cos(7 * t)) + 2.5 * Math.exp(-3 * t) * Math.sin(8 * t) * (p.net === 0 ? 1 : 0);
  }
  const propOpacity = started ? clamp(1 - (e - 0.15) / 0.35) : 1;

  const block = (w: { kg: number }, cx: number, lifted: number, color: string, key: string) => {
    const bw = W * (0.056 + 0.0016 * w.kg);
    const bh = W * 0.1;
    return (
      <g key={key} transform={`translate(${cx * s},${-th / 2 - lifted})`}>
        <rect x={-bw / 2} y={-bh} width={bw} height={bh} rx={W * 0.008} fill={color} />
        <text x={0} y={-bh * 0.5 - W * 0.002} textAnchor="middle" fill={theme.bg} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.045}>
          {w.kg}
        </text>
        <text x={0} y={-bh * 0.12} textAnchor="middle" fill={theme.bg} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.04}>
          kg
        </text>
      </g>
    );
  };

  const ticks: number[] = [];
  for (let k = 1; k <= Math.floor(Math.min(p.a, p.b) - 0.6); k++) ticks.push(k, -k);

  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.03 }}>
      <svg width={W} height={H}>
        <rect x={0} y={ground} width={W} height={H - ground} rx={8} fill={theme.line} />
        <polygon points={`${px},${py} ${px - W * 0.07},${ground} ${px + W * 0.07},${ground}`} fill={theme.line} />
        {/* props that hold the beam level until it is released */}
        {propOpacity > 0 && (
          <g opacity={propOpacity} fill={theme.dim}>
            <rect x={px - p.a * s - W * 0.01} y={py + th / 2} width={W * 0.02} height={ground - py - th / 2} />
            <rect x={px + p.b * s - W * 0.01} y={py + th / 2} width={W * 0.02} height={ground - py - th / 2} />
          </g>
        )}
        <g transform={`translate(${px},${py}) rotate(${ang})`}>
          <rect x={-p.a * s} y={-th / 2} width={(p.a + p.b) * s} height={th} rx={th / 2} fill={p.plank ? '#c08a4a' : theme.dim} />
          {ticks.map((k) => (
            <g key={k}>
              <line x1={k * s} y1={th / 2} x2={k * s} y2={th / 2 + W * 0.012} stroke={theme.dim} strokeWidth={3} />
              <text x={k * s} y={th / 2 + W * 0.055} textAnchor="middle" fill={theme.dim} fontFamily={theme.font} fontWeight={700} fontSize={W * 0.04}>
                {Math.abs(k)}m
              </text>
            </g>
          ))}
          {p.weights.map((w, i) => {
            const color = w.x < 0 ? COLORS[0] : COLORS[1];
            if (i === p.slide) return block(w, slideX!, lift, color, `w${i}`);
            return block(w, w.x, 0, color, `w${i}`);
          })}
          {p.plank && (
            <g transform={`translate(${p.plank.x * s},${-th / 2})`}>
              <line x1={0} y1={-W * 0.1} x2={0} y2={-W * 0.02} stroke={COLORS[2]} strokeWidth={6} strokeLinecap="round" />
              <polygon points={`0,0 ${-W * 0.022},${-W * 0.032} ${W * 0.022},${-W * 0.032}`} fill={COLORS[2]} />
              <text x={0} y={-W * 0.115} textAnchor="middle" fill={COLORS[2]} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.04}>
                plank {p.plank.kg} kg
              </text>
            </g>
          )}
        </g>
        <circle cx={px} cy={py} r={W * 0.014} fill={theme.bg} stroke={theme.text} strokeWidth={3} />
      </svg>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};
