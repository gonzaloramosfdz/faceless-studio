import React from 'react';
import { spring, useCurrentFrame } from 'remotion';
import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { cellsOf, type MagicParams, type LineRef } from './index';

export const MagicSquareBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const frame = useCurrentFrame();
  const { grid, given, sum, sumLine, steps } = puzzle.params as MagicParams;
  const gap = size * 0.03;
  const cell = (size - gap * 2) / 3;
  const speaking = timeline.lines.find((l) => frame >= l.from && frame < l.to + 8);
  const done = frame >= timeline.reveals[steps.length - 1] + 20;

  let active: LineRef | null = null;
  let equation = '';
  if (speaking?.id === 's0') {
    active = sumLine;
    equation = cellsOf(sumLine).map(([r, c]) => grid[r][c]).join(' + ') + ` = ${sum}`;
  } else if (speaking?.step !== undefined) {
    const s = steps[speaking.step];
    active = s.line;
    const shown = frame >= timeline.reveals[speaking.step];
    equation = `${sum} − ${s.known[0]} − ${s.known[1]} = ${shown ? s.value : '?'}`;
  }
  const activeSet = new Set((active ? cellsOf(active) : []).map(([r, c]) => r * 3 + c));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.05 }}>
      <div style={{ width: size, height: size, position: 'relative' }}>
        {grid.flatMap((row, r) =>
          row.map((value, c) => {
            const i = r * 3 + c;
            const stepIndex = steps.findIndex((s) => s.cell[0] === r && s.cell[1] === c);
            const revealAt = stepIndex >= 0 ? timeline.reveals[stepIndex] : 0;
            const visible = given[r][c] || frame >= revealAt;
            const pop = given[r][c]
              ? spring({ frame: frame - i * 2, fps: 30, config: { damping: 14 } })
              : spring({ frame: frame - revealAt, fps: 30, config: { damping: 9, stiffness: 160 } });
            const hot = activeSet.has(i);
            const solved = !given[r][c] && visible;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: c * (cell + gap),
                  top: r * (cell + gap),
                  width: cell,
                  height: cell,
                  borderRadius: cell * 0.14,
                  background: hot ? '#263469' : theme.panel,
                  border: `${hot ? 8 : 4}px solid ${done ? theme.good : hot ? theme.accent : theme.line}`,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: theme.font,
                  fontWeight: 800,
                  fontSize: cell * 0.44,
                  color: solved ? theme.accent : theme.text,
                }}
              >
                {visible ? (
                  <span style={{ transform: `scale(${pop})` }}>{value}</span>
                ) : (
                  <span style={{ color: theme.line }}>?</span>
                )}
              </div>
            );
          }),
        )}
      </div>
      <div
        style={{
          height: size * 0.11,
          fontFamily: theme.font,
          fontWeight: 800,
          fontSize: size * 0.085,
          color: theme.accent,
          opacity: equation ? 1 : 0,
        }}
      >
        {equation || '.'}
      </div>
    </div>
  );
};
