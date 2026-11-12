import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { COLORS, Choices, Fact, useSimTime } from '../../visuals/quiz';
import { birthdayGame, coinGame, diceRoll } from './index';
import type { ChanceParams } from './index';

const T = (size: number, f: number) => size * f;

const Scene: React.FC<{ p: ChanceParams; size: number; k: number; game: number; revealed: boolean; seed: number }> = ({ p, size, k, game, revealed, seed }) => {
  const W = size;
  const H = size * 0.36;
  const fs = size * 0.045;
  const txt = { fontFamily: theme.font, fontWeight: 800 } as const;
  const s = p.scene;
  if (p.variant === 'monty-hall' || p.variant === 'monty-fall') {
    const N: number = s.N;
    const M = Math.min(N, 6);
    const gap = size * 0.02;
    const dw = (W * 0.94 - gap * (M - 1)) / M;
    const dh = H * 0.72;
    return (
      <svg width={W} height={H}>
        {Array.from({ length: M }, (_, i) => {
          const x = W * 0.03 + i * (dw + gap);
          const pick = i === 0;
          const closed = pick || i === M - 1;
          return (
            <g key={i}>
              <rect x={x} y={8} width={dw} height={dh} rx={10} fill={closed ? theme.panel : theme.bg} stroke={pick ? theme.accent : theme.line} strokeWidth={pick ? 6 : 3} />
              <text x={x + dw / 2} y={8 + dh / 2 + fs * 0.35} textAnchor="middle" fill={closed ? theme.text : theme.dim} fontSize={fs} {...txt}>
                {closed ? '?' : 'goat'}
              </text>
              <text x={x + dw / 2} y={H - 8} textAnchor="middle" fill={pick ? theme.accent : theme.dim} fontSize={fs * 0.9} {...txt}>
                {pick ? 'you' : i === M - 1 ? 'other' : ''}
              </text>
            </g>
          );
        })}
        {N > M && (
          <text x={W / 2} y={8 + dh + fs * 0.9 - 4} textAnchor="middle" fill={theme.dim} fontSize={fs * 0.9} {...txt} opacity={0}>
            .
          </text>
        )}
      </svg>
    );
  }
  if (p.variant === 'two-children') {
    const TT: number = s.T;
    const cell = Math.min(size * 0.12, (size * 0.3) / TT * (TT === 2 ? 1 : 1));
    const c = TT === 2 ? size * 0.12 : (size * 0.3) / TT;
    void cell;
    const gx = (W - c * TT) / 2 + size * 0.03;
    const gy = fs * 1.6;
    const lab = ['G', 'B'];
    return (
      <svg width={W} height={H}>
        <text x={W / 2 + size * 0.03} y={fs * 0.95} textAnchor="middle" fill={theme.dim} fontSize={fs * 0.9} {...txt}>younger child</text>
        {Array.from({ length: TT }, (_, a) =>
          Array.from({ length: TT }, (_, b) => {
            const v = revealed ? s.cells[a][b] : 3;
            const fill = v === 2 ? theme.good : v === 1 ? theme.accent : v === 3 ? theme.line : theme.panel;
            return <rect key={`${a}-${b}`} x={gx + b * c + 1} y={gy + a * c + 1} width={c - 2} height={c - 2} rx={c * 0.15} fill={fill} opacity={v === 0 ? 0.4 : 1} />;
          }),
        )}
        {TT === 2
          ? lab.map((l, i) => (
              <g key={l}>
                <text x={gx + i * c + c / 2} y={gy - 4} textAnchor="middle" fill={theme.text} fontSize={fs} {...txt}>{l}</text>
                <text x={gx - 10} y={gy + i * c + c / 2 + fs * 0.35} textAnchor="end" fill={theme.text} fontSize={fs} {...txt}>{l}</text>
              </g>
            ))
          : lab.map((l, i) => (
              <g key={l}>
                <text x={gx + i * 7 * c + 3.5 * c} y={gy - 4} textAnchor="middle" fill={theme.text} fontSize={fs} {...txt}>{l}</text>
                <text x={gx - 10} y={gy + i * 7 * c + 3.5 * c + fs * 0.35} textAnchor="end" fill={theme.text} fontSize={fs} {...txt}>{l}</text>
              </g>
            ))}
        <text x={gx - 10 - fs} y={gy + (c * TT) / 2} textAnchor="middle" fill={theme.dim} fontSize={fs * 0.9} {...txt} transform={`rotate(-90 ${gx - 10 - fs} ${gy + (c * TT) / 2})`}>older</text>
        {revealed && (
          <text x={gx + c * TT + 14} y={gy + (c * TT) / 2} fill={theme.text} fontSize={fs * 0.95} {...txt}>
            <tspan x={gx + c * TT + 14} dy={-fs * 0.3} fill={theme.accent}>{s.m} fit</tspan>
            <tspan x={gx + c * TT + 14} dy={fs * 1.1} fill={theme.good}>{s.t} win</tspan>
          </text>
        )}
      </svg>
    );
  }
  if (p.variant === 'birthday') {
    const D: number = s.D;
    const cols = Math.ceil(Math.sqrt(D * 2.4));
    const rows = Math.ceil(D / cols);
    const sp = Math.min((W * 0.94) / cols, H / rows);
    const g = k > 0 ? birthdayGame(seed, game, s.n, D) : { days: [] as number[], dup: [] as number[] };
    const lit = new Set(g.days);
    const dup = new Set(g.dup);
    const ox = (W - sp * cols) / 2;
    return (
      <svg width={W} height={H}>
        {Array.from({ length: D }, (_, d) => (
          <circle key={d} cx={ox + (d % cols) * sp + sp / 2} cy={Math.floor(d / cols) * sp + sp / 2} r={dup.has(d) ? sp * 0.48 : lit.has(d) ? sp * 0.38 : sp * 0.2} fill={dup.has(d) ? '#f87171' : lit.has(d) ? theme.accent : theme.line} />
        ))}
      </svg>
    );
  }
  if (p.variant === 'coin-race') {
    const r = size * 0.048;
    const coin = (c: string, x: number, y: number, col: string, ring?: string) => (
      <g key={`${x}-${y}`}>
        <circle cx={x} cy={y} r={r} fill={c === 'H' ? '#fbbf24' : '#cbd5e1'} stroke={ring ?? 'none'} strokeWidth={5} />
        <text x={x} y={y + r * 0.36} textAnchor="middle" fill="#1b2547" fontSize={r * 1.05} {...txt}>{c}</text>
        <circle cx={x} cy={y} r={0} fill={col} />
      </g>
    );
    const g = k > 0 ? coinGame(seed, game, s.A, s.B) : null;
    const tail = g ? g.flips.slice(-11) : '';
    const sp = r * 2.3;
    return (
      <svg width={W} height={H}>
        {[s.A, s.B].map((pat: string, i: number) => (
          <g key={i}>
            <text x={W * (i ? 0.58 : 0.08)} y={fs * 1.1} fill={COLORS[i]} fontSize={fs} {...txt}>{i ? 'Player two' : 'Player one'}</text>
            {[...pat].map((c, j) => coin(c, W * (i ? 0.58 : 0.08) + r + j * sp, fs * 1.1 + r + 14, COLORS[i], COLORS[i]))}
          </g>
        ))}
        {[...tail].map((c, j) => {
          const fromEnd = tail.length - 1 - j;
          const ring = g && fromEnd < 3 ? COLORS[g.winner] : undefined;
          return coin(c, W * 0.5 - (tail.length * sp) / 2 + j * sp + sp / 2, H * 0.78, '', ring);
        })}
      </svg>
    );
  }
  // dice-duel
  const sq = size * 0.105;
  const roll = k > 0 ? diceRoll(seed, game) : null;
  const faces = [s.a, s.b];
  return (
    <svg width={W} height={H}>
      {faces.map((f: number[], d: number) => (
        <g key={d}>
          <text x={W * 0.03} y={H * (d ? 0.78 : 0.3) + fs * 0.35} fill={COLORS[d]} fontSize={fs * 1.1} {...txt}>{d ? 'B' : 'A'}</text>
          {f.map((v, i) => {
            const on = roll && (d ? roll.ib : roll.ia) === i;
            return (
              <g key={i}>
                <rect x={W * 0.12 + i * (sq + size * 0.015)} y={H * (d ? 0.78 : 0.3) - sq / 2} width={sq} height={sq} rx={sq * 0.2} fill={on ? COLORS[d] : theme.panel} stroke={COLORS[d]} strokeWidth={3} />
                <text x={W * 0.12 + i * (sq + size * 0.015) + sq / 2} y={H * (d ? 0.78 : 0.3) + fs * 0.35} textAnchor="middle" fill={on ? theme.bg : theme.text} fontSize={fs * 1.2} {...txt}>{v}</text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
};

export const ChanceBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const p = puzzle.params as ChanceParams;
  const frame = useCurrentFrame();
  const simT = useSimTime(timeline, 1);
  const k = Math.min(p.checkpoints, Math.floor(simT * p.checkpoints + 1e-6));
  const revealed = frame >= timeline.reveals[1];
  const game = k > 0 ? p.games[k - 1] : 0;
  const labelW = size * 0.27;
  const valW = size * 0.19;
  const trackW = size - labelW - valW - size * 0.04;
  const fs = size * 0.045;
  const rowH = size * 0.075;
  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.025 }}>
      <Scene p={p} size={size} k={k} game={game} revealed={revealed} seed={puzzle.seed} />
      <div style={{ width: size, display: 'flex', flexDirection: 'column', gap: size * 0.012 }}>
        {p.bars.map((b, i) => {
          const v = k > 0 ? b.run[k - 1] : 0;
          const ex = b.exact.split('/').map(Number);
          const exPct = (100 * ex[0]) / ex[1];
          return (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', height: rowH }}>
                <div style={{ width: labelW, textAlign: 'right', paddingRight: size * 0.02, fontFamily: theme.font, fontWeight: 800, fontSize: fs, color: COLORS[i] }}>{b.label}</div>
                <div style={{ position: 'relative', width: trackW, height: rowH * 0.62, background: theme.panel, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${v}%`, height: '100%', background: COLORS[i] }} />
                  {revealed && <div style={{ position: 'absolute', left: `${exPct}%`, top: 0, width: 4, height: '100%', background: theme.text }} />}
                </div>
                <div style={{ width: valW, paddingLeft: size * 0.02, fontFamily: theme.font, fontWeight: 800, fontSize: fs, color: theme.text, fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(1)}%</div>
              </div>
              {revealed && (
                <div style={{ marginLeft: labelW, fontFamily: theme.font, fontWeight: 800, fontSize: size * 0.04, color: theme.dim }}>
                  exactly {b.exact} = {b.pct}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ textAlign: 'center', fontFamily: theme.font, fontWeight: 500, fontSize: size * 0.04, color: theme.dim }}>
          {p.unit}: {k * (600 / p.checkpoints)}
        </div>
      </div>
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};
