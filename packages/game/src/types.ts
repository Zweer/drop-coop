export type OrderUrgency = 'normal' | 'urgent' | 'express';

export interface Rider {
  id: string;
  name: string;
  speed: number;
  reliability: number;
  cityKnowledge: number;
  stamina: number;
  energy: number;
  morale: number;
}

export interface Order {
  id: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  urgency: OrderUrgency;
  reward: number;
  expiresAt: Date;
}

export interface Zone {
  id: string;
  name: string;
  demandLevel: number;
  trafficDensity: number;
  unlockCost: number;
}
