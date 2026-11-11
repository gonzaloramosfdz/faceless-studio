import type React from 'react';
import type { Puzzle, Timeline } from '../core/types';
import { MagicSquareBoard } from '../puzzles/magic-square/Board';
import { MotionBoard } from '../puzzles/motion/Board';
import { FreefallBoard } from '../puzzles/freefall/Board';
import { SeesawBoard } from '../puzzles/seesaw/Board';
import { GearsBoard } from '../puzzles/gears/Board';
import { ProjectileBoard } from '../puzzles/projectile/Board';
import { CollisionBoard } from '../puzzles/collision/Board';
import { RampRaceBoard } from '../puzzles/ramp-race/Board';
import { PendulumBoard } from '../puzzles/pendulum/Board';

export type BoardProps = { puzzle: Puzzle<any>; timeline: Timeline; size: number };

/** One board component per puzzle family. */
export const boards: Record<string, React.FC<BoardProps>> = {
  'magic-square': MagicSquareBoard,
  motion: MotionBoard,
  freefall: FreefallBoard,
  seesaw: SeesawBoard,
  gears: GearsBoard,
  projectile: ProjectileBoard,
  collision: CollisionBoard,
  'ramp-race': RampRaceBoard,
  pendulum: PendulumBoard,
};
