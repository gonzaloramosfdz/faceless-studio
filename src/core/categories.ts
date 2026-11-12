// Puzzle categories. Each has its own look (background and badge colour) so the feed does not read as one template,
// and the planner uses them to keep a day's posts varied.
export type Category = 'physics' | 'logic' | 'math' | 'chance';

export const CATEGORY_OF: Record<string, Category> = {
  freefall: 'physics',
  seesaw: 'physics',
  gears: 'physics',
  projectile: 'physics',
  collision: 'physics',
  'ramp-race': 'physics',
  pendulum: 'physics',
  motion: 'physics',
  'magic-square': 'math',
  liars: 'logic',
  moves: 'logic',
  'make-number': 'math',
  equations: 'math',
  patterns: 'math',
  chance: 'chance',
};

export const categoryOf = (family: string): Category => CATEGORY_OF[family] ?? 'physics';

export const LOOK: Record<Category, { bg: string; bg2: string; dot: string; badge: string }> = {
  physics: { bg: '#0b1020', bg2: '#141c38', dot: '#33407a', badge: '#ffd23f' },
  logic: { bg: '#06191a', bg2: '#0d3033', dot: '#27665f', badge: '#5eead4' },
  math: { bg: '#130a24', bg2: '#2a1550', dot: '#4b2f85', badge: '#c4b5fd' },
  chance: { bg: '#1d0c0c', bg2: '#3d1616', dot: '#7a2e2e', badge: '#fb923c' },
};

export const lookOf = (family: string) => LOOK[categoryOf(family)];
