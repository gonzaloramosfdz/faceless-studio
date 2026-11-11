import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { Timeline } from '../core/types';
import { theme } from './theme';

/** Splits a sentence into short chunks and gives each a share of the sentence's time by length. */
export function chunk(text: string, max = 26): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(' ')) {
    if (cur && (cur + ' ' + w).length > max) {
      out.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

export const Captions: React.FC<{ timeline: Timeline; size: number }> = ({ timeline, size }) => {
  const frame = useCurrentFrame();
  const line = timeline.lines.find((l) => frame >= l.from && frame < l.to + 6);
  if (!line) return null;
  const parts = chunk(line.text);
  const total = parts.reduce((s, p) => s + p.length, 0);
  const span = line.to - line.from;
  let start = line.from;
  let current = parts[parts.length - 1];
  let currentStart = start;
  for (const p of parts) {
    const len = (p.length / total) * span;
    if (frame < start + len) {
      current = p;
      currentStart = start;
      break;
    }
    start += len;
    currentStart = start;
  }
  const pop = interpolate(frame - currentStart, [0, 4], [0.92, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  return (
    <div
      style={{
        fontFamily: theme.font,
        fontWeight: 800,
        fontSize: size,
        color: theme.text,
        textAlign: 'center',
        lineHeight: 1.15,
        transform: `scale(${pop})`,
        textShadow: '0 4px 24px rgba(0,0,0,0.6)',
      }}
    >
      {current}
    </div>
  );
};
