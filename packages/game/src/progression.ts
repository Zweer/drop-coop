import type { Player } from './types.js';

/** Deliveries required to reach a given level. */
export function deliveriesForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(3 * (level - 1) ** 1.5);
}

/** Calculate player level from total deliveries. */
export function calculateLevel(totalDeliveries: number): number {
  let level = 1;
  while (deliveriesForLevel(level + 1) <= totalDeliveries) {
    level++;
  }
  return level;
}

export interface Milestone {
  level: number;
  name: string;
  description: string;
}

export const MILESTONES: Milestone[] = [
  { level: 1, name: 'Fresh Start', description: 'Hire riders and accept orders' },
  { level: 3, name: 'Growing Fleet', description: 'Hiring pool shows 4 candidates' },
  { level: 5, name: 'Upgrader', description: 'Rider upgrades unlocked' },
  { level: 8, name: 'Expanding', description: 'Second zone available' },
  { level: 10, name: 'Veteran', description: 'Better order quality' },
  { level: 15, name: 'City Boss', description: 'Third zone available' },
  { level: 20, name: 'Mogul', description: 'New city unlocked' },
  { level: 50, name: 'Automator', description: 'API tab unlocked — time to automate?' },
];

export interface Progression {
  level: number;
  totalDeliveries: number;
  deliveriesForCurrentLevel: number;
  deliveriesForNextLevel: number;
  progressPercent: number;
  unlockedMilestones: Milestone[];
  nextMilestone: Milestone | null;
}

/** Get full progression info for a player. */
export function getProgression(player: Pick<Player, 'level' | 'totalDeliveries'>): Progression {
  const currentThreshold = deliveriesForLevel(player.level);
  const nextThreshold = deliveriesForLevel(player.level + 1);
  const range = nextThreshold - currentThreshold;
  const progress = player.totalDeliveries - currentThreshold;

  const unlockedMilestones = MILESTONES.filter((m) => m.level <= player.level);
  const nextMilestone = MILESTONES.find((m) => m.level > player.level) ?? null;

  return {
    level: player.level,
    totalDeliveries: player.totalDeliveries,
    deliveriesForCurrentLevel: currentThreshold,
    deliveriesForNextLevel: nextThreshold,
    progressPercent: Math.min(100, Math.round((progress / range) * 100)),
    unlockedMilestones,
    nextMilestone,
  };
}
