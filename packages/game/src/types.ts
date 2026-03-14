export type OrderUrgency = 'normal' | 'urgent' | 'express';
export type OrderStatus = 'available' | 'assigned' | 'picked_up' | 'delivered' | 'expired';
export type RiderStatus = 'idle' | 'delivering' | 'resting';

export interface Player {
  id: string;
  money: number;
  reputation: number;
  level: number;
  totalDeliveries: number;
  totalProfit: number;
  lastTickAt: Date;
}

export interface Rider {
  id: string;
  playerId: string;
  name: string;
  speed: number;
  reliability: number;
  cityKnowledge: number;
  stamina: number;
  energy: number;
  morale: number;
  status: RiderStatus;
  salary: number;
}

export interface Order {
  id: string;
  playerId: string;
  riderId: string | null;
  distance: number;
  urgency: OrderUrgency;
  status: OrderStatus;
  reward: number;
  expiresAt: Date;
  assignedAt: Date | null;
  deliveredAt: Date | null;
}

export interface Zone {
  id: string;
  name: string;
  demandLevel: number;
  trafficDensity: number;
  unlockCost: number;
}
