import type { Family } from '../core/types';
import { magicSquare } from './magic-square';
import { motion } from './motion';
import { freefall } from './freefall';
import { seesaw } from './seesaw';
import { gears } from './gears';
import { projectile } from './projectile';
import { collision } from './collision';
import { rampRace } from './ramp-race';
import { pendulum } from './pendulum';

export const families: Record<string, Family<any>> = {
  [magicSquare.id]: magicSquare,
  [motion.id]: motion,
  [freefall.id]: freefall,
  [seesaw.id]: seesaw,
  [gears.id]: gears,
  [projectile.id]: projectile,
  [collision.id]: collision,
  [rampRace.id]: rampRace,
  [pendulum.id]: pendulum,
};
