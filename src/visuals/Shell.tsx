import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import type { VideoProps } from '../core/types';
import { theme } from './theme';
import { Captions } from './Captions';
import { boards } from './boards';

const Countdown: React.FC<{ from: number; to: number; size: number }> = ({ from, to, size }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const left = Math.ceil((to - frame) / 30);
  const within = ((frame - from) % 30) / 30;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={theme.line} strokeWidth={12} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.accent}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * ((frame - from) / (to - from))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: theme.font,
          fontWeight: 800,
          fontSize: size * 0.5,
          color: theme.text,
          transform: `scale(${interpolate(within, [0, 0.15], [1.25, 1], { extrapolateRight: 'clamp' })})`,
        }}
      >
        {left}
      </div>
    </div>
  );
};

export const Shell: React.FC<VideoProps> = ({ puzzle, timeline, layout }) => {
  const frame = useCurrentFrame();
  const portrait = layout !== 'landscape';
  const Board = boards[puzzle.family];
  const progress = frame / timeline.durationInFrames;
  const intro = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const counting = frame >= timeline.countdown.from && frame < timeline.countdown.to;
  const boardSize = portrait ? 780 : 640;

  const header = (
    <div style={{ opacity: intro, transform: `translateY(${(1 - intro) * 30}px)` }}>
      <div
        style={{
          display: 'inline-block',
          padding: '12px 28px',
          borderRadius: 999,
          background: theme.accent,
          color: theme.bg,
          fontFamily: theme.font,
          fontWeight: 800,
          fontSize: portrait ? 34 : 30,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        {puzzle.label}
      </div>
      <div
        style={{
          marginTop: 28,
          fontFamily: theme.font,
          fontWeight: 500,
          fontSize: portrait ? 46 : 44,
          lineHeight: 1.25,
          color: theme.dim,
        }}
      >
        {puzzle.question}
      </div>
    </div>
  );

  const lower = (
    <div style={{ height: portrait ? 230 : 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {counting ? (
        <Countdown from={timeline.countdown.from} to={timeline.countdown.to} size={portrait ? 210 : 180} />
      ) : (
        <Captions timeline={timeline} size={portrait ? 68 : 56} />
      )}
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 35%, ${theme.bg2} 0%, ${theme.bg} 70%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${theme.line} 2px, transparent 2px)`,
          backgroundSize: '54px 54px',
          opacity: 0.25,
        }}
      />
      {portrait ? (
        // Bottom 20% and the right edge stay clear for the platform's own buttons.
        <AbsoluteFill style={{ padding: '150px 90px 400px 90px', textAlign: 'center', alignItems: 'center', justifyContent: 'space-between' }}>
          {header}
          <Board puzzle={puzzle} timeline={timeline} size={boardSize} />
          <div style={{ width: '100%' }}>{lower}</div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ padding: '90px 110px', flexDirection: 'row', alignItems: 'center', gap: 100 }}>
          <Board puzzle={puzzle} timeline={timeline} size={boardSize} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 60 }}>
            {header}
            {lower}
          </div>
        </AbsoluteFill>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, height: 10, width: `${progress * 100}%`, background: theme.accent }} />
    </AbsoluteFill>
  );
};
