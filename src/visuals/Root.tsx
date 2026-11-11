import React from 'react';
import { Composition } from 'remotion';
import type { VideoProps } from '../core/types';
import { Shell } from './Shell';

const Puzzle = Shell as unknown as React.FC<Record<string, unknown>>;

export const Root: React.FC = () => (
  <Composition
    id="Puzzle"
    component={Puzzle}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={300}
    defaultProps={{} as Record<string, unknown>}
    calculateMetadata={({ props }) => {
      const p = props as unknown as VideoProps;
      const portrait = p.layout !== 'landscape';
      return {
        fps: p.timeline.fps,
        durationInFrames: p.timeline.durationInFrames,
        width: portrait ? 1080 : 1920,
        height: portrait ? 1920 : 1080,
      };
    }}
  />
);
