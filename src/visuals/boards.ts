import type React from 'react';
import type { Puzzle, Timeline } from '../core/types';
import { MagicSquareBoard } from '../puzzles/magic-square/Board';
import { MotionBoard } from '../puzzles/motion/Board';
import { FreefallBoard } from '../puzzles/freefall/Board';

export type BoardProps = { puzzle: Puzzle<any>; timeline: Timeline; size: number };

/** One board component per puzzle family. */
export const boards: Record<string, React.FC<BoardProps>> = {
  'magic-square': MagicSquareBoard,
  motion: MotionBoard,
  freefall: FreefallBoard,
};
