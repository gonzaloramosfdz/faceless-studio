import type { Family } from '../core/types';
import { magicSquare } from './magic-square';
import { motion } from './motion';

export const families: Record<string, Family<any>> = {
  [magicSquare.id]: magicSquare,
  [motion.id]: motion,
};
