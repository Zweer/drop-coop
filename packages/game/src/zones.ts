export interface ZoneDefinition {
  slug: string;
  name: string;
  demandLevel: number;
  trafficDensity: number;
  unlockCost: number;
  requiredLevel: number;
  /** Base fee per hour for operating in this zone. */
  hourlyFee: number;
  /** Average order distance range [min, max] km. */
  distanceRange: [number, number];
}

export const ZONES: ZoneDefinition[] = [
  {
    slug: 'centro',
    name: 'Centro',
    demandLevel: 8,
    trafficDensity: 8,
    unlockCost: 0,
    requiredLevel: 1,
    hourlyFee: 0,
    distanceRange: [0.5, 4],
  },
  {
    slug: 'navigli',
    name: 'Navigli',
    demandLevel: 6,
    trafficDensity: 5,
    unlockCost: 200,
    requiredLevel: 3,
    hourlyFee: 2,
    distanceRange: [1, 6],
  },
  {
    slug: 'isola',
    name: 'Isola',
    demandLevel: 5,
    trafficDensity: 4,
    unlockCost: 500,
    requiredLevel: 8,
    hourlyFee: 3,
    distanceRange: [1, 7],
  },
  {
    slug: 'citta-studi',
    name: 'Città Studi',
    demandLevel: 4,
    trafficDensity: 3,
    unlockCost: 800,
    requiredLevel: 10,
    hourlyFee: 4,
    distanceRange: [2, 8],
  },
  {
    slug: 'periferia',
    name: 'Periferia',
    demandLevel: 3,
    trafficDensity: 2,
    unlockCost: 1200,
    requiredLevel: 15,
    hourlyFee: 5,
    distanceRange: [3, 10],
  },
];
