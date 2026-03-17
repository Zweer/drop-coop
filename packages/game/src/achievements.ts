export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface AchievementInput {
  totalDeliveries: number;
  money: number;
  totalProfit: number;
  level: number;
  riderCount: number;
  unlockedZoneCount: number;
  unlockedCityCount: number;
  discoveredEndpoints: number;
  maxRiderStat: number;
  hasUsedBatch: boolean;
  hasUsedAnalytics: boolean;
  hasUsedPipeline: boolean;
  hasVoted: boolean;
}

type CheckFn = (input: AchievementInput) => boolean;

const def = (
  id: string,
  name: string,
  icon: string,
  description: string,
  check: CheckFn,
): [AchievementDefinition, CheckFn] => [{ id, name, description, icon }, check];

const DEFS = [
  // Delivery milestones
  def(
    'first_delivery',
    'First Drop',
    '📦',
    'Complete your first delivery',
    (i) => i.totalDeliveries >= 1,
  ),
  def(
    'deliveries_50',
    'Fifty Runs',
    '🚴',
    'Complete 50 deliveries',
    (i) => i.totalDeliveries >= 50,
  ),
  def(
    'deliveries_200',
    'Road Warrior',
    '🏍️',
    'Complete 200 deliveries',
    (i) => i.totalDeliveries >= 200,
  ),
  def(
    'deliveries_1000',
    'Legend',
    '👑',
    'Complete 1000 deliveries',
    (i) => i.totalDeliveries >= 1000,
  ),

  // Economy
  def('rich_1000', 'First Grand', '💰', 'Have €1,000 in the treasury', (i) => i.money >= 1000),
  def(
    'profit_10000',
    'Big Earner',
    '💎',
    'Earn €10,000 total profit',
    (i) => i.totalProfit >= 10000,
  ),
  def(
    'profit_100000',
    'Tycoon',
    '🏦',
    'Earn €100,000 total profit',
    (i) => i.totalProfit >= 100000,
  ),

  // Riders
  def('first_hire', 'Team Builder', '🤝', 'Hire your first rider', (i) => i.riderCount >= 1),
  def('riders_10', 'Fleet Manager', '🚲', 'Have 10 riders', (i) => i.riderCount >= 10),
  def('max_stat', 'Maxed Out', '⭐', 'Max out a rider stat to 10', (i) => i.maxRiderStat >= 10),

  // Expansion
  def('second_zone', 'Expanding', '🗺️', 'Unlock a second zone', (i) => i.unlockedZoneCount >= 2),
  def(
    'all_milan',
    'Milan Master',
    '🏙️',
    'Unlock all 5 Milan zones',
    (i) => i.unlockedZoneCount >= 5,
  ),
  def('second_city', 'City Hopper', '✈️', 'Unlock a second city', (i) => i.unlockedCityCount >= 2),
  def('all_cities', 'National', '🇮🇹', 'Unlock all 4 cities', (i) => i.unlockedCityCount >= 4),

  // Hacker
  def(
    'api_explorer',
    'Curious',
    '🔍',
    'Discover 5 API endpoints',
    (i) => i.discoveredEndpoints >= 5,
  ),
  def(
    'api_hacker',
    'Hacker',
    '🤖',
    'Discover 15 API endpoints',
    (i) => i.discoveredEndpoints >= 15,
  ),
  def('batch_user', 'Bulk Operator', '📋', 'Use the batch endpoint', (i) => i.hasUsedBatch),
  def(
    'analytics_user',
    'Data Driven',
    '📊',
    'Use the analytics endpoints',
    (i) => i.hasUsedAnalytics,
  ),
  def('pipeline_user', 'Pipeline Pro', '🔧', 'Use the pipeline endpoint', (i) => i.hasUsedPipeline),

  // Coop
  def('first_vote', 'Democrat', '🗳️', 'Cast your first coop vote', (i) => i.hasVoted),

  // Level
  def('level_20', 'Mogul', '🎯', 'Reach level 20', (i) => i.level >= 20),
  def('level_50', 'Automator', '⚡', 'Reach level 50', (i) => i.level >= 50),
] as const;

export const ACHIEVEMENTS: AchievementDefinition[] = DEFS.map(([d]) => d);

/** Return achievement IDs that are newly unlocked (not in `alreadyUnlocked`). */
export function checkAchievements(input: AchievementInput, alreadyUnlocked: Set<string>): string[] {
  const newlyUnlocked: string[] = [];
  for (const [d, check] of DEFS) {
    if (!alreadyUnlocked.has(d.id) && check(input)) {
      newlyUnlocked.push(d.id);
    }
  }
  return newlyUnlocked;
}
