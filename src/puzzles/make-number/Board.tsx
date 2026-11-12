import React from 'react';
import { interpolate, spring, useCurrentFrame } from 'remotion';
import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { COLORS, Choices, Fact, useSimTime } from '../../visuals/quiz';
import { Work } from '../../visuals/Work';
import type { MakeNumberParams } from './index';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const f = theme.font;

const Tile: React.FC<{ text: string; size: number; color?: string; bg?: string; pop?: number }> = ({ text, size, color = theme.text, bg = theme.panel, pop = 1 }) => (
  <div
    style={{
      minWidth: size, height: size, padding: `0 ${size * 0.15}px`, boxSizing: 'border-box', borderRadius: size * 0.2,
      background: bg, color, fontFamily: f, fontWeight: 800, fontSize: size * 0.52, display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: `scale(${pop})`,
    }}
  >
    {text}
  </div>
);

const Make24: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const frame = useCurrentFrame();
  const p = puzzle.params as MakeNumberParams;
  const stage = p.pools!.reduce((acc, _, i) => (frame >= timeline.reveals[i] ? i : acc), -1);
  const pool = stage < 0 ? p.numbers!.map(String) : p.pools![stage];
  const newest = stage >= 0 ? pool.length - 1 : -1;
  const s = stage >= 0 ? spring({ frame: frame - timeline.reveals[stage], fps: 30, config: { damping: 9 } }) : 1;
  const tile = size * 0.15;
  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.05 }}>
      <div style={{ display: 'flex', gap: size * 0.025, justifyContent: 'center', alignItems: 'center', minHeight: tile }}>
        {pool.map((t, i) => (
          <Tile key={i} text={t} size={tile} color={i === newest ? theme.bg : theme.text} bg={i === newest ? theme.accent : theme.panel} pop={i === newest ? 0.7 + 0.3 * s : 1} />
        ))}
      </div>
      <Work rows={p.rows!} timeline={timeline} width={size * 0.94} fontSize={size * 0.055} />
    </div>
  );
};

const CannotMake: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const frame = useCurrentFrame();
  const p = puzzle.params as MakeNumberParams;
  const answered = frame >= timeline.reveals[1];
  const explained = frame >= timeline.reveals[2];
  const tile = size * 0.1;
  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.025 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.02, width: size * 0.96 }}>
        {p.sets!.map((set, i) => {
          const bad = i === puzzle.answerIndex;
          const lit = answered && bad;
          return (
            <div key={i} style={{ opacity: answered && !bad ? 0.7 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.02 }}>
                <div style={{ width: size * 0.15, fontFamily: f, fontWeight: 800, fontSize: size * 0.045, color: lit ? theme.good : COLORS[i], textAlign: 'right' }}>{'ABC'[i]}</div>
                {set.map((n, k) => (
                  <Tile key={k} text={String(n)} size={tile} bg={lit ? theme.good : theme.panel} color={lit ? theme.bg : theme.text} />
                ))}
              </div>
              <div style={{ marginLeft: size * 0.17, height: size * 0.055, fontFamily: f, fontWeight: 700, fontSize: size * 0.042, color: bad ? theme.good : theme.dim, opacity: explained ? 1 : 0, whiteSpace: 'nowrap' }}>
                {bad ? 'no way to reach 24' : `${p.results![i]} = 24`}
              </div>
            </div>
          );
        })}
      </div>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};

const Rows: React.FC<{ rows: string[]; show: (i: number) => boolean; size: number; fs: number }> = ({ rows, show, size, fs }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.015, alignItems: 'center', minHeight: rows.length * fs * 1.5 }}>
    {rows.map((t, i) => (
      <div key={i} style={{ opacity: show(i) ? 1 : 0, fontFamily: f, fontWeight: 700, fontSize: fs, color: theme.text, background: theme.panel, padding: `${fs * 0.2}px ${fs * 0.6}px`, borderRadius: fs * 0.4, whiteSpace: 'nowrap' }}>
        {t}
      </div>
    ))}
  </div>
);

const InsertSigns: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const p = puzzle.params as MakeNumberParams;
  const sim = useSimTime(timeline, 1);
  const found = Math.floor(sim * p.count!);
  const shown = p.solutions!.map((s) => `${s} = ${p.target}`);
  const digits = Array.from({ length: p.n! }, (_, i) => i + 1);
  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.03 }}>
      <div style={{ display: 'flex', gap: size * 0.02, alignItems: 'center' }}>
        {digits.map((d, i) => (
          <React.Fragment key={d}>
            <Tile text={String(d)} size={size * 0.085} />
            {i < digits.length - 1 && <div style={{ fontFamily: f, fontWeight: 800, fontSize: size * 0.05, color: theme.dim }}>?</div>}
          </React.Fragment>
        ))}
        <div style={{ fontFamily: f, fontWeight: 800, fontSize: size * 0.07, color: theme.accent, marginLeft: size * 0.01 }}>{p.target}</div>
      </div>
      <Rows rows={shown} show={(i) => found > i} size={size} fs={size * 0.045} />
      <div style={{ fontFamily: f, fontWeight: 800, fontSize: size * 0.06, color: theme.accent, fontVariantNumeric: 'tabular-nums' }}>Found so far: {found}</div>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};

const PlusMinus: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const p = puzzle.params as MakeNumberParams;
  const sim = useSimTime(timeline, 1);
  const shown = Math.floor(sim * (p.examples!.length + 0.999));
  const digits = Array.from({ length: p.n! }, (_, i) => i + 1);
  const fs = size * (p.n! > 8 ? 0.038 : 0.044);
  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.03 }}>
      <div style={{ display: 'flex', gap: size * 0.012, alignItems: 'center' }}>
        {digits.map((d) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: size * 0.004 }}>
            <span style={{ fontFamily: f, fontWeight: 800, fontSize: size * 0.045, color: theme.dim }}>±</span>
            <Tile text={String(d)} size={size * (p.n! > 8 ? 0.065 : 0.075)} />
          </div>
        ))}
      </div>
      <Rows rows={p.examples!} show={(i) => shown > i} size={size} fs={fs} />
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};

const Coins: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const frame = useCurrentFrame();
  const p = puzzle.params as MakeNumberParams;
  const N = p.gridMax!;
  const sim = useSimTime(timeline, 1);
  const ok: boolean[] = new Array(N + 1).fill(false);
  ok[0] = true;
  for (let v = 1; v <= N; v++) ok[v] = p.coins!.some((c) => v >= c && ok[v - c]);
  const cols = 10;
  const cell = (size * 0.94) / cols;
  const answered = frame >= timeline.reveals[1];
  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.025 }}>
      <div style={{ display: 'flex', gap: size * 0.025, alignItems: 'center' }}>
        {p.coins!.map((c, i) => (
          <div key={i} style={{ width: size * 0.1, height: size * 0.1, borderRadius: '50%', background: COLORS[i % 3], color: theme.bg, fontFamily: f, fontWeight: 800, fontSize: size * 0.05, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {c}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cell}px)` }}>
        {Array.from({ length: N }, (_, k) => k + 1).map((v) => {
          const lit = ok[v] && (v - 1) / N <= sim;
          const isAns = answered && v === p.miss;
          return (
            <div key={v} style={{ width: cell, height: cell * 0.8, boxSizing: 'border-box', padding: 2 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: cell * 0.2, background: isAns ? theme.good : lit ? theme.accent : theme.panel, color: isAns || lit ? theme.bg : theme.dim, fontFamily: f, fontWeight: 800, fontSize: size * 0.04, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {v}
              </div>
            </div>
          );
        })}
      </div>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};

const DigitTrick: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const frame = useCurrentFrame();
  const p = puzzle.params as MakeNumberParams;
  const sim = useSimTime(timeline, 1);
  const shown = Math.floor(sim * 3.999);
  const answered = frame >= timeline.reveals[1];
  const fs = size * (p.digits! > 3 ? 0.042 : 0.05);
  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.04 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.025, alignItems: 'center', minHeight: size * 0.4 }}>
        {p.sample!.map((s, i) => (
          <div key={i} style={{ opacity: shown > i ? 1 : 0, fontFamily: f, fontWeight: 700, fontSize: fs, color: theme.text, background: theme.panel, padding: `${fs * 0.3}px ${fs * 0.7}px`, borderRadius: fs * 0.4, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {s}
            <span style={{ color: theme.good, opacity: answered ? 1 : 0 }}> = {p.g} × {p.mult![i]}</span>
          </div>
        ))}
      </div>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};

export const MakeNumberBoard: React.FC<BoardProps> = (props) => {
  const v = (props.puzzle.params as MakeNumberParams).variant;
  if (v === 'make-24') return <Make24 {...props} />;
  if (v === 'cannot-make') return <CannotMake {...props} />;
  if (v === 'insert-signs') return <InsertSigns {...props} />;
  if (v === 'plus-minus') return <PlusMinus {...props} />;
  if (v === 'coins') return <Coins {...props} />;
  return <DigitTrick {...props} />;
};
// keep interpolate imported for future tweaks
void interpolate;
void clamp;
