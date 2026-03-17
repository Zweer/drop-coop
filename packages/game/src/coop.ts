import type { Rider, TickModifiers } from './types.js';

export type PolicyType = 'pay_structure' | 'work_hours' | 'equipment_budget';
export type PayStructure = 'equal_split' | 'performance_based';
export type WorkHours = 'standard' | 'extended';
export type EquipmentBudget = 'basic' | 'premium';
export type PolicyOption = PayStructure | WorkHours | EquipmentBudget;

export interface PolicyDefinition {
  type: PolicyType;
  name: string;
  options: { value: PolicyOption; label: string; description: string }[];
  defaultOption: PolicyOption;
}

export const POLICIES: PolicyDefinition[] = [
  {
    type: 'pay_structure',
    name: 'Pay Structure',
    options: [
      {
        value: 'equal_split',
        label: 'Equal Split',
        description: 'Same salary for everyone. Riders appreciate fairness.',
      },
      {
        value: 'performance_based',
        label: 'Performance Based',
        description: '+15% delivery revenue. Top riders love it, others not so much.',
      },
    ],
    defaultOption: 'equal_split',
  },
  {
    type: 'work_hours',
    name: 'Work Hours',
    options: [
      { value: 'standard', label: 'Standard', description: 'Normal hours. Balanced workload.' },
      {
        value: 'extended',
        label: 'Extended',
        description: '+30% order rate but riders tire faster (−10% speed).',
      },
    ],
    defaultOption: 'standard',
  },
  {
    type: 'equipment_budget',
    name: 'Equipment Budget',
    options: [
      { value: 'basic', label: 'Basic', description: 'Standard equipment. Keep costs low.' },
      { value: 'premium', label: 'Premium', description: '+10% speed but upgrades cost 20% more.' },
    ],
    defaultOption: 'basic',
  },
];

const POLICY_EFFECTS: Record<string, Partial<TickModifiers>> = {
  // Defaults have no effect (all 1.0)
  equal_split: {},
  standard: {},
  basic: {},
  // Non-defaults have trade-offs
  performance_based: { rewardMultiplier: 1.15 },
  extended: { orderRateMultiplier: 1.3, speedMultiplier: 0.9 },
  premium: { speedMultiplier: 1.1, upgradeCostMultiplier: 1.2 },
};

/** Compute combined TickModifiers from active policies. */
export function mergePolicyEffects(
  activePolicies: { type: PolicyType; option: PolicyOption }[],
): TickModifiers {
  const base: TickModifiers = {
    speedMultiplier: 1,
    rewardMultiplier: 1,
    orderRateMultiplier: 1,
    upgradeCostMultiplier: 1,
  };
  for (const policy of activePolicies) {
    const fx = POLICY_EFFECTS[policy.option] ?? {};
    base.speedMultiplier *= fx.speedMultiplier ?? 1;
    base.rewardMultiplier *= fx.rewardMultiplier ?? 1;
    base.orderRateMultiplier *= fx.orderRateMultiplier ?? 1;
    base.upgradeCostMultiplier *= fx.upgradeCostMultiplier ?? 1;
  }
  return base;
}

/** Minimum riders required to hold a vote. */
export const MIN_RIDERS_FOR_VOTE = 3;

/**
 * Simulate rider votes for a policy proposal.
 * Returns the winning option and vote breakdown.
 */
export function simulateVote(
  riders: Pick<Rider, 'speed' | 'reliability' | 'cityKnowledge' | 'stamina' | 'morale'>[],
  policyType: PolicyType,
  currentOption: PolicyOption,
): { winner: PolicyOption; votes: Record<string, number> } {
  const def = POLICIES.find((p) => p.type === policyType);
  if (!def) return { winner: currentOption, votes: {} };

  const [optA, optB] = def.options;
  const votes: Record<string, number> = { [optA.value]: 0, [optB.value]: 0 };

  for (const rider of riders) {
    const avgStat = (rider.speed + rider.reliability + rider.cityKnowledge + rider.stamina) / 4;
    let prefersB: boolean;

    switch (policyType) {
      case 'pay_structure':
        // High-stat riders prefer performance_based
        prefersB = avgStat > 5;
        break;
      case 'work_hours':
        // High-morale riders tolerate extended hours
        prefersB = rider.morale > 60;
        break;
      case 'equipment_budget':
        // Low-speed riders want premium gear
        prefersB = rider.speed < 6;
        break;
    }

    votes[prefersB ? optB.value : optA.value]++;
  }

  // Tie → keep current
  const winner =
    votes[optA.value] > votes[optB.value]
      ? optA.value
      : votes[optB.value] > votes[optA.value]
        ? optB.value
        : currentOption;

  return { winner, votes };
}
