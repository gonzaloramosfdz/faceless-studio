import React from 'react';
import { interpolate, spring, useCurrentFrame } from 'remotion';
import type { BoardProps } from '../../visuals/boards';
import { theme } from '../../visuals/theme';
import { Choices, Fact } from '../../visuals/quiz';
import type { LiarsParams } from './index';

const PALETTE = ['#ffd23f', '#5eead4', '#f472b6', '#93c5fd', '#fb923c', '#c4b5fd', '#a3e635', '#f9a8d4'];
const BAD = '#f87171';

export const LiarsBoard: React.FC<BoardProps> = ({ puzzle, timeline, size }) => {
  const frame = useCurrentFrame();
  const p = puzzle.params as LiarsParams;
  const n = p.people.length;
  const answered = frame >= timeline.reveals[1];
  const why = frame >= timeline.reveals[2];
  const isCulprit = p.variant.startsWith('culprit');
  const rowH = Math.min(size * 0.105, (size * 0.55) / n);
  const pop = spring({ frame: frame - timeline.reveals[1], fps: 30, config: { damping: 9 } });

  return (
    <div style={{ width: size, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.025 }}>
      <div style={{ width: size, display: 'flex', flexDirection: 'column', gap: size * 0.012 }}>
        {p.people.map((name, i) => {
          const appear = interpolate(frame, [6 + i * 5, 14 + i * 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const col = PALETTE[i % PALETTE.length];
          const isC = isCulprit && p.culprit === i;
          let border = theme.line;
          if (answered) border = isCulprit ? (isC ? theme.good : theme.line) : p.truthful[i] ? theme.good : BAD;
          let badge: { text: string; color: string } | null = null;
          if (isCulprit) {
            if (why) badge = { text: `${p.hyp![i]} true`, color: isC ? theme.good : theme.dim };
            else if (answered && isC) badge = { text: 'Culprit', color: theme.good };
          } else if (answered) {
            badge = p.truthful[i] ? { text: p.badgeTrue, color: theme.good } : { text: p.badgeFalse, color: BAD };
          }
          return (
            <div
              key={i}
              style={{
                boxSizing: 'border-box',
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                gap: size * 0.02,
                opacity: appear,
                transform: `translateY(${(1 - appear) * 20}px)`,
              }}
            >
              <div
                style={{
                  width: size * 0.17,
                  textAlign: 'center',
                  padding: `${size * 0.012}px 0`,
                  borderRadius: size * 0.03,
                  background: col,
                  color: theme.bg,
                  fontFamily: theme.font,
                  fontWeight: 800,
                  fontSize: size * 0.043,
                }}
              >
                {name}
              </div>
              <div
                style={{
                  flex: 1,
                  boxSizing: 'border-box',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: `0 ${size * 0.02}px`,
                  borderRadius: size * 0.03,
                  background: theme.panel,
                  border: `4px solid ${border}`,
                  color: theme.text,
                  fontFamily: theme.font,
                  fontWeight: 600,
                  fontSize: size * 0.04,
                  lineHeight: 1.1,
                  textAlign: 'left',
                }}
              >
                {`“${p.said[i]}”`}
              </div>
              <div
                style={{
                  width: size * 0.2,
                  textAlign: 'center',
                  fontFamily: theme.font,
                  fontWeight: 800,
                  fontSize: size * 0.042,
                  color: badge?.color ?? 'transparent',
                  transform: `scale(${badge ? 0.8 + 0.2 * Math.min(1, pop) : 1})`,
                }}
              >
                {badge?.text ?? '-'}
              </div>
            </div>
          );
        })}
      </div>
      {isCulprit && (
        <div style={{ height: size * 0.05, fontFamily: theme.font, fontWeight: 500, fontSize: size * 0.04, color: theme.dim, opacity: why ? 1 : 0 }}>
          True statements if that person is guilty
        </div>
      )}
      <Choices puzzle={puzzle} timeline={timeline} size={size} />
      <Fact text={p.fact} timeline={timeline} size={size} />
    </div>
  );
};
