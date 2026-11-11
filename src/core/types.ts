// Shared contracts between pipeline stages. Change these only with the tests.

export type LineKind = 'hook' | 'step' | 'final';

/** One spoken sentence. `step` links it to a solver step so the scene can react. */
export interface Line {
  id: string;
  kind: LineKind;
  text: string;
  step?: number;
}

/** A puzzle produced by a generator and checked by its solver. The LLM never edits this. */
export interface Puzzle<P = unknown> {
  family: string;
  seed: number;
  /** Stable identity for dedup: family + the parameters that define the instance. */
  key: string;
  label: string;
  question: string;
  answer: string;
  params: P;
  /** Number of solver steps; the scene reveals one per step. */
  stepCount: number;
}

export interface Family<P = unknown> {
  id: string;
  generate(seed: number): Puzzle<P>;
  /** Template narration. Used as-is when the LLM is unavailable. */
  narrate(p: Puzzle<P>): Line[];
}

export interface TimedLine extends Line {
  from: number; // frame
  to: number; // frame
  audio: string;
}

export type SfxEvent = { type: 'tick' | 'pop' | 'chime'; frame: number };

export interface Timeline {
  fps: number;
  durationInFrames: number;
  lines: TimedLine[];
  countdown: { from: number; to: number };
  /** Frame at which each solver step becomes visible. */
  reveals: number[];
  sfx: SfxEvent[];
}

export interface VideoProps {
  puzzle: Puzzle;
  timeline: Timeline;
  layout: 'portrait' | 'landscape';
}
