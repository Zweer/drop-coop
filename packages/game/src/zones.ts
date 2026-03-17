export interface CityDefinition {
  slug: string;
  name: string;
  archetype: 'dense-metro' | 'university-town' | 'tourist-city' | 'industrial';
  /** Required player level to unlock this city. */
  requiredLevel: number;
  /** Base latitude for order coordinate generation. */
  baseLat: number;
  /** Base longitude for order coordinate generation. */
  baseLng: number;
  /** Coordinate spread for random order positions. */
  coordSpread: number;
}

export interface ZoneDefinition {
  slug: string;
  name: string;
  city: string;
  demandLevel: number;
  trafficDensity: number;
  unlockCost: number;
  requiredLevel: number;
  /** Base fee per hour for operating in this zone. */
  hourlyFee: number;
  /** Average order distance range [min, max] km. */
  distanceRange: [number, number];
}

export const CITIES: CityDefinition[] = [
  {
    slug: 'milan',
    name: 'Milano',
    archetype: 'dense-metro',
    requiredLevel: 1,
    baseLat: 45.464,
    baseLng: 9.19,
    coordSpread: 0.04,
  },
  {
    slug: 'bologna',
    name: 'Bologna',
    archetype: 'university-town',
    requiredLevel: 20,
    baseLat: 44.494,
    baseLng: 11.347,
    coordSpread: 0.03,
  },
  {
    slug: 'florence',
    name: 'Firenze',
    archetype: 'tourist-city',
    requiredLevel: 30,
    baseLat: 43.773,
    baseLng: 11.256,
    coordSpread: 0.03,
  },
  {
    slug: 'turin',
    name: 'Torino',
    archetype: 'industrial',
    requiredLevel: 40,
    baseLat: 45.07,
    baseLng: 7.687,
    coordSpread: 0.04,
  },
];

export const ZONES: ZoneDefinition[] = [
  // --- Milan (Dense Metro) ---
  {
    slug: 'centro',
    name: 'Centro',
    city: 'milan',
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
    city: 'milan',
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
    city: 'milan',
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
    city: 'milan',
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
    city: 'milan',
    demandLevel: 3,
    trafficDensity: 2,
    unlockCost: 1200,
    requiredLevel: 15,
    hourlyFee: 5,
    distanceRange: [3, 10],
  },

  // --- Bologna (University Town) ---
  {
    slug: 'centro-storico',
    name: 'Centro Storico',
    city: 'bologna',
    demandLevel: 7,
    trafficDensity: 6,
    unlockCost: 5000,
    requiredLevel: 20,
    hourlyFee: 6,
    distanceRange: [0.5, 4],
  },
  {
    slug: 'zona-universitaria',
    name: 'Zona Universitaria',
    city: 'bologna',
    demandLevel: 9,
    trafficDensity: 5,
    unlockCost: 2000,
    requiredLevel: 22,
    hourlyFee: 5,
    distanceRange: [0.5, 3],
  },
  {
    slug: 'fiera',
    name: 'Fiera',
    city: 'bologna',
    demandLevel: 4,
    trafficDensity: 3,
    unlockCost: 3000,
    requiredLevel: 25,
    hourlyFee: 7,
    distanceRange: [2, 8],
  },

  // --- Florence (Tourist City) ---
  {
    slug: 'duomo',
    name: 'Duomo',
    city: 'florence',
    demandLevel: 9,
    trafficDensity: 9,
    unlockCost: 10000,
    requiredLevel: 30,
    hourlyFee: 8,
    distanceRange: [0.3, 3],
  },
  {
    slug: 'oltrarno',
    name: 'Oltrarno',
    city: 'florence',
    demandLevel: 6,
    trafficDensity: 4,
    unlockCost: 5000,
    requiredLevel: 33,
    hourlyFee: 6,
    distanceRange: [1, 5],
  },
  {
    slug: 'santa-croce',
    name: 'Santa Croce',
    city: 'florence',
    demandLevel: 7,
    trafficDensity: 6,
    unlockCost: 6000,
    requiredLevel: 35,
    hourlyFee: 7,
    distanceRange: [0.5, 4],
  },

  // --- Turin (Industrial) ---
  {
    slug: 'centro-torino',
    name: 'Centro',
    city: 'turin',
    demandLevel: 6,
    trafficDensity: 5,
    unlockCost: 20000,
    requiredLevel: 40,
    hourlyFee: 8,
    distanceRange: [1, 6],
  },
  {
    slug: 'lingotto',
    name: 'Lingotto',
    city: 'turin',
    demandLevel: 5,
    trafficDensity: 3,
    unlockCost: 10000,
    requiredLevel: 43,
    hourlyFee: 7,
    distanceRange: [2, 9],
  },
  {
    slug: 'mirafiori',
    name: 'Mirafiori',
    city: 'turin',
    demandLevel: 4,
    trafficDensity: 2,
    unlockCost: 12000,
    requiredLevel: 45,
    hourlyFee: 9,
    distanceRange: [3, 12],
  },
];
