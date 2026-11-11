// Shared parts for "predict, then watch" boards: simulation clock, answer choices, fact line.
import React from 'react';
import { interpolate, spring, useCurrentFrame } from 'remotion';
import type { Puzzle, Timeline } from '../core/types';
import { theme } from './theme';

export const COLORS = [theme.accent, '#5eead4', '#f472b6'];

/** Simulation time in seconds. Runs from 0 to `duration` while the "now watch" sentence (line s0) is spoken. */
export function useSimTime(timeline: Timeline, duration: number): number {
  const frame = useCurrentFrame();
  const run = timeline.lines.find((l) => l.id === 's0')!;
  return interpolate(frame, [run.from + (run.to - run.from) * 0.55, run.to + 28], [0, duration], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** The answer choices. The right one lights up when solver step 1 is revealed. */
export const Choices: React.FC<{ puzzle: Puzzle; timeline: Timeline; size: number }> = ({ puzzle, timeline, size }) => {
  const frame = useCurrentFrame();
  const answered = frame >= timeline.reveals[1];
  return (
    <div style={{ display: 'flex', gap: size * 0.025, flexWrap: 'wrap', justifyContent: 'center' }}>
      {puzzle.options!.map((o, i) => {
        const right = answered && i === puzzle.answerIndex;
        const s = right ? spring({ frame: frame - timeline.reveals[1], fps: 30, config: { damping: 8 } }) : 1;
        return (
          <div
            key={i}
            style={{
              padding: `${size * 0.022}px ${size * 0.035}px`,
              borderRadius: size * 0.03,
              border: `4px solid ${right ? theme.good : theme.line}`,
              background: right ? theme.good : theme.panel,
              color: right ? theme.bg : theme.text,
              opacity: answered && !right ? 0.35 : 1,
              transform: `scale(${0.9 + 0.1 * s})`,
              fontFamily: theme.font,
              fontWeight: 800,
              fontSize: size * 0.05,
            }}
          >
            {o}
          </div>
        );
      })}
    </div>
  );
};

/** One-line takeaway shown when solver step 2 is revealed. */
export const Fact: React.FC<{ text: string; timeline: Timeline; size: number }> = ({ text, timeline, size }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        minHeight: size * 0.07,
        fontFamily: theme.font,
        fontWeight: 800,
        fontSize: size * 0.05,
        color: theme.accent,
        textAlign: 'center',
        opacity: frame >= timeline.reveals[2] ? 1 : 0,
      }}
    >
      {text}
    </div>
  );
};
