import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { COLORS, Choices, Fact, useSimTime } from '../../visuals/quiz';
import { radius } from './index';
import type { GearSpec, GearsParams } from './index';

const TAU = Math.PI * 2;
const RED = '#f87171';

/** Gear outline in unit coordinates (one tooth = one unit of pitch diameter). Tooth 0 is centred on angle 0. */
function gearPath(teeth: number): string {
  const r = radius(teeth);
  const rr = r - 1.25;
  const ro = r + 1.0;
  const step = TAU / teeth;
  const aR = 0.3 * step;
  const aT = 0.14 * step;
  const pt = (rad: number, a: number) => `${(rad * Math.cos(a)).toFixed(3)},${(rad * Math.sin(a)).toFixed(3)}`;
  let d = '';
  for (let k = 0; k < teeth; k++) {
    const c = k * step;
    d += `${k === 0 ? 'M' : 'L'}${pt(rr, c - aR)} L${pt(ro, c - aT)} L${pt(ro, c + aT)} L${pt(rr, c + aR)} `;
    d += `A${rr.toFixed(3)},${rr.toFixed(3)} 0 0 1 ${pt(rr, c + step - aR)} `;
  }
  return d + 'Z';
}

/** A clockwise (dir = 1) or counter-clockwise arrow drawn around the origin, radius `ra`. */
const Arrow: React.FC<{ ra: number; dir: number; color: string; w: number }> = ({ ra, dir, color, w }) => {
  const a0 = (-200 * Math.PI) / 180;
  const a1 = (60 * Math.PI) / 180;
  const P = (a: number) => [ra * Math.cos(a), ra * Math.sin(a)];
  const [x0, y0] = P(a0);
  const [x1, y1] = P(a1);
  const tx = -Math.sin(a1), ty = Math.cos(a1);
  const nx = Math.cos(a1), ny = Math.sin(a1);
  const h = ra * 0.5;
  const tip = [x1 + tx * h, y1 + ty * h];
  const b1 = [x1 + nx * h * 0.6, y1 + ny * h * 0.6];
  const b2 = [x1 - nx * h * 0.6, y1 - ny * h * 0.6];
  return (
    <g transform={`scale(${dir >= 0 ? 1 : -1},1)`}>
      <path d={`M${x0},${y0} A${ra},${ra} 0 1 1 ${x1},${y1}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`${tip[0]},${tip[1]} ${b1[0]},${b1[1]} ${b2[0]},${b2[1]}`} fill={color} />
    </g>
  );
};

export const GearsBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const p = puzzle.params as GearsParams;
  const frame = useCurrentFrame();
  const W = size;
  const H = size * 0.56;
  const titleH = W * 0.06;

  // Real seconds since the simulation started; gears keep turning after the "now watch" sentence.
  const run = timeline.lines.find((l) => l.id === 's0')!;
  const windowFrames = (run.to - run.from) * 0.45 + 28;
  const inWindow = useSimTime(timeline, windowFrames / 30);
  const extra = Math.max(0, frame - (run.to + 28)) / 30;
  const e = inWindow + extra;

  const allOmega = p.rigs.flatMap((r) => r.gears.map((g) => Math.abs(g.omega)));
  const rate = Math.min(p.variant === 'speed' ? 0.385 : 0.35, 0.9 / Math.max(...allOmega)); // turns/s of each rig's first gear
  const jamming = p.rigs.some((r) => r.jam);
  let firstTurns = Math.min(rate * e, p.oneTurn ? 1 : Infinity);
  if (jamming) firstTurns = (6 * (1 - Math.exp(-6 * Math.min(e, 1.2)))) / 360;
  const answered = frame >= timeline.reveals[1];

  // Fit all rigs into W x H.
  const box = (rigIdx: number) => {
    const gs = p.rigs[rigIdx].gears;
    const pad = (g: GearSpec) => radius(g.teeth) + 1.1;
    return {
      x0: Math.min(...gs.map((g) => g.x - pad(g))),
      x1: Math.max(...gs.map((g) => g.x + pad(g))),
      y0: Math.min(...gs.map((g) => g.y - pad(g))),
      y1: Math.max(...gs.map((g) => g.y + pad(g))),
    };
  };
  const boxes = p.rigs.map((_, i) => box(i));
  const gapU = 1.5;
  const titles = p.rigs.filter((r) => r.title).length;
  const unitsW = Math.max(...boxes.map((b) => b.x1 - b.x0));
  const unitsH = boxes.reduce((n, b) => n + (b.y1 - b.y0), 0) + gapU * (boxes.length - 1);
  const sc = Math.min((W * 0.94) / unitsW, (H - titles * titleH - W * 0.02) / unitsH);
  const totalH = unitsH * sc + titles * titleH;
  let cursor = (H - totalH) / 2;

  const label = p.variant === 'speed' ? p.rigs[0].gears.map((g, i) => ({ g, i })) : [];
  const rendered = p.rigs.map((rig, ri) => {
    const b = boxes[ri];
    if (rig.title) cursor += titleH;
    const top = cursor;
    cursor += (b.y1 - b.y0) * sc + gapU * sc;
    const ox = W / 2 - ((b.x0 + b.x1) / 2) * sc;
    const oy = top - b.y0 * sc;
    return (
      <g key={ri}>
        {rig.title && (
          <text x={W / 2} y={top - titleH * 0.25} textAnchor="middle" fill={theme.dim} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.042}>
            {rig.title}
          </text>
        )}
        {rig.gears.map((g, i) => {
          const r = radius(g.teeth);
          const deg = (g.phase * 180) / Math.PI + g.omega * firstTurns * 360;
          const color = COLORS[i % 3];
          const hubR = r * 0.5;
          const center = { x: ox + g.x * sc, y: oy + g.y * sc };
          const dirNow = Math.sign(g.omega);
          return (
            <g key={i}>
              <g transform={`translate(${center.x},${center.y}) scale(${sc}) rotate(${deg})`}>
                <path d={gearPath(g.teeth)} fill={color} stroke={theme.bg} strokeWidth={0.18} strokeLinejoin="round" />
                <circle r={hubR} fill={theme.bg} />
                <line x1={0} y1={0} x2={r * 0.78} y2={0} stroke={theme.bg} strokeWidth={r * 0.1} />
                <circle cx={r * 0.78} cy={0} r={r * 0.13} fill={theme.text} stroke={theme.bg} strokeWidth={0.2} />
              </g>
              <g transform={`translate(${center.x},${center.y})`}>
                {g.hub === 'teeth' && (
                  <text x={0} y={W * 0.015} textAnchor="middle" fill={theme.text} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.045}>
                    {g.teeth}
                  </text>
                )}
                {g.hub === 'start' && <g transform={`scale(${sc})`}><Arrow ra={hubR * 0.58} dir={1} color={theme.text} w={hubR * 0.2} /></g>}
                {g.hub === 'last' &&
                  (answered ? (
                    <g transform={`scale(${sc})`}><Arrow ra={hubR * 0.58} dir={dirNow} color={theme.good} w={hubR * 0.2} /></g>
                  ) : (
                    <text x={0} y={W * 0.016} textAnchor="middle" fill={theme.text} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.05}>
                      ?
                    </text>
                  ))}
              </g>
            </g>
          );
        })}
        {rig.jam && e > 0.5 && (() => {
          const [u, v] = rig.jam;
          const gu = rig.gears[u], gv = rig.gears[v];
          const ru = radius(gu.teeth), rv = radius(gv.teeth);
          const f = ru / (ru + rv);
          const cx = ox + (gu.x + (gv.x - gu.x) * f) * sc;
          const cy = oy + (gu.y + (gv.y - gu.y) * f) * sc;
          const pulse = 0.6 + 0.4 * Math.sin(e * 12);
          return <circle cx={cx} cy={cy} r={sc * 2.2} fill="none" stroke={RED} strokeWidth={5} opacity={pulse} />;
        })()}
      </g>
    );
  });

  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.025 }}>
      <svg width={W} height={H}>
        {rendered}
        {jamming && e > 0.5 && (
          <text x={W * 0.03} y={H * 0.1} textAnchor="start" fill={RED} fontFamily={theme.font} fontWeight={800} fontSize={W * 0.06}>
            STUCK!
          </text>
        )}
      </svg>
      {p.variant === 'speed' && (
        <div style={{ display: 'flex', gap: size * 0.05 }}>
          {label.map(({ g, i }) => (
            <div key={i} style={{ fontFamily: theme.font, fontWeight: 800, fontSize: size * 0.045, color: COLORS[i], fontVariantNumeric: 'tabular-nums' }}>
              {i === 0 ? 'First' : 'Second'}: {(Math.abs(g.omega) * firstTurns).toFixed(2)} turns
            </div>
          ))}
        </div>
      )}
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};
