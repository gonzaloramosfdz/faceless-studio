import type { Line, Timeline, TimedLine, SfxEvent } from './types';

export const FPS = 30;
const GAP = 0.3; // seconds of silence between sentences
const COUNTDOWN = 3; // seconds for the viewer to think
const TAIL = 1.6; // hold on the solved puzzle

/** Lays sentences on a frame grid from their measured audio lengths. */
export function buildTimeline(
  lines: Line[],
  audio: Record<string, { file: string; seconds: number }>,
): Timeline {
  const f = (s: number) => Math.round(s * FPS);
  let t = 0.4;
  const timed: TimedLine[] = [];
  const sfx: SfxEvent[] = [];
  const reveals: number[] = [];
  let countdown = { from: 0, to: 0 };
  const lastHook = lines.map((l) => l.kind).lastIndexOf('hook');

  lines.forEach((line, i) => {
    const a = audio[line.id];
    if (!a) throw new Error(`no audio for line ${line.id}`);
    timed.push({ ...line, from: f(t), to: f(t + a.seconds), audio: a.file });
    if (line.kind === 'step' && line.step !== undefined && reveals[line.step] === undefined) {
      // The number appears as the sentence finishes, when the result is spoken.
      const at = f(t + a.seconds * 0.72);
      reveals[line.step] = at;
      sfx.push({ type: 'pop', frame: at });
    }
    t += a.seconds + GAP;
    if (i === lastHook) {
      countdown = { from: f(t), to: f(t + COUNTDOWN) };
      for (let s = 0; s < COUNTDOWN; s++) sfx.push({ type: 'tick', frame: f(t + s) });
      t += COUNTDOWN + GAP;
    }
    if (line.kind === 'final') sfx.push({ type: 'chime', frame: f(t - a.seconds - GAP) });
  });

  for (let i = 0; i < reveals.length; i++) if (reveals[i] === undefined) reveals[i] = f(t);
  return { fps: FPS, durationInFrames: f(t + TAIL), lines: timed, countdown, reveals, sfx };
}
