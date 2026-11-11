import React from 'react';
import { spring, useCurrentFrame } from 'remotion';
import type { Timeline } from '../core/types';
import { theme } from './theme';

/** Shared "working out" panel: one equation per solver step, shown as its sentence is spoken. */
export const Work: React.FC<{ rows: string[]; timeline: Timeline; width: number; fontSize: number }> = ({
  rows,
  timeline,
  width,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const current = rows.reduce((acc, _, i) => (frame >= timeline.reveals[i] ? i : acc), -1);
  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: fontSize * 0.35 }}>
      {rows.map((row, i) => {
        const at = timeline.reveals[i];
        const s = spring({ frame: frame - at, fps: 30, config: { damping: 14 } });
        const last = i === rows.length - 1;
        return (
          <div
            key={i}
            style={{
              opacity: frame >= at ? 1 : 0,
              transform: `translateY(${(1 - s) * 24}px)`,
              padding: `${fontSize * 0.3}px ${fontSize * 0.6}px`,
              borderRadius: fontSize * 0.4,
              background: last ? theme.accent : theme.panel,
              border: `3px solid ${i === current && !last ? theme.accent : 'transparent'}`,
              color: last ? theme.bg : i === current ? theme.text : theme.dim,
              fontFamily: theme.font,
              fontWeight: 800,
              fontSize,
              textAlign: 'center',
            }}
          >
            {row}
          </div>
        );
      })}
    </div>
  );
};
