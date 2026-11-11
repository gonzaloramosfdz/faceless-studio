import type { Family } from '../core/types';
import { magicSquare } from './magic-square';
import { motion } from './motion';
import { freefall } from './freefall';

export const families: Record<string, Family<any>> = {
  [magicSquare.id]: magicSquare,
  [motion.id]: motion,
  [freefall.id]: freefall,
};
