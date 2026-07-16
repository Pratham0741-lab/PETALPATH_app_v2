export interface XPState {
  xp: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressToNext: number;
  xpForCurrentLevel: number;
}

export interface LevelMilestone {
  level: number;
  requiredXP: number;
  label: string;
  reward: string;
}

const XP_PER_LEVEL = 100;

export const LEVEL_MILESTONES: LevelMilestone[] = [
  { level: 1, requiredXP: 0, label: 'Sprout', reward: 'Welcome badge' },
  { level: 2, requiredXP: 100, label: 'Seedling', reward: '10 bonus stars' },
  { level: 3, requiredXP: 200, label: 'Bud', reward: 'Garden sticker' },
  { level: 4, requiredXP: 300, label: 'Bloom', reward: '25 bonus stars' },
  { level: 5, requiredXP: 400, label: 'Flower', reward: 'Blossom badge' },
  { level: 6, requiredXP: 500, label: 'Gardener', reward: '50 bonus stars' },
  { level: 7, requiredXP: 600, label: 'Cultivator', reward: 'Golden trowel' },
  { level: 8, requiredXP: 700, label: 'Steward', reward: '75 bonus stars' },
  { level: 9, requiredXP: 800, label: 'Guardian', reward: 'Forest badge' },
  { level: 10, requiredXP: 900, label: 'Luminary', reward: '100 bonus stars' },
];

export function deriveXPState(totalStars: number): XPState {
  const xp = Math.max(0, totalStars);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentLevelXP = (level - 1) * XP_PER_LEVEL;
  const nextLevelXP = level * XP_PER_LEVEL;
  const xpForCurrentLevel = xp - currentLevelXP;
  const progressToNext = Math.min(
    100,
    Math.round((xpForCurrentLevel / XP_PER_LEVEL) * 100),
  );
  return {
    xp,
    level,
    currentLevelXP,
    nextLevelXP,
    progressToNext,
    xpForCurrentLevel,
  };
}

export function getMilestoneForLevel(level: number): LevelMilestone | undefined {
  return LEVEL_MILESTONES.find((m) => m.level === level);
}

export function getNextMilestone(level: number): LevelMilestone | undefined {
  return LEVEL_MILESTONES.find((m) => m.level > level);
}
