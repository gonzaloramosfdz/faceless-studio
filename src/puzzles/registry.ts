import type { Family } from '../core/types';
import { magicSquare } from './magic-square';

export const families: Record<string, Family<any>> = {
  [magicSquare.id]: magicSquare,
};
