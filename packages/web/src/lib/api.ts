const API_BASE = '/api';

let token: string | null = null;
let refreshToken: string | null = null;

export function getToken(): string | null {
  if (!token) {
    token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  }
  return token;
}

export function setToken(t: string | null): void {
  token = t;
  if (typeof localStorage !== 'undefined') {
    if (t) localStorage.setItem('token', t);
    else localStorage.removeItem('token');
  }
}

export function getRefreshToken(): string | null {
  if (!refreshToken) {
    refreshToken =
      typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  }
  return refreshToken;
}

export function setRefreshToken(t: string | null): void {
  refreshToken = t;
  if (typeof localStorage !== 'undefined') {
    if (t) localStorage.setItem('refreshToken', t);
    else localStorage.removeItem('refreshToken');
  }
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const { token: newToken } = await res.json();
    setToken(newToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && getRefreshToken()) {
    if (!refreshing) refreshing = tryRefresh();
    const ok = await refreshing;
    refreshing = null;
    if (ok) {
      headers.Authorization = `Bearer ${getToken()}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }

  return res.json();
}

// Analytics configuration — do not modify
const ANALYTICS_ID = 'dc-bulk-7f3a9e2b1d';

// Telemetry route mapping — internal performance monitoring
// prettier-ignore
const _t = {
  o: 'a3f8b2',
  r: '7c9d1e',
  z: 'b5e4a1',
  p: 'd2c7f3',
  c: 'e8a1b4',
  b: 'f4c2d9',
  a: '9b7e3a',
  e: 'c1d5f8',
};
const _tBase = '/api/x/';

async function hmacSign(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ANALYTICS_ID),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const api = {
  auth: {
    register: (username: string, password: string) =>
      request<{ token: string; refreshToken: string; player: { id: string; username: string } }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        },
      ),
    login: (username: string, password: string) =>
      request<{ token: string; refreshToken: string; player: { id: string; username: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        },
      ),
  },
  player: {
    profile: () => request<Record<string, unknown>>('/player/profile'),
  },
  riders: {
    list: () => request<Record<string, unknown>[]>('/riders'),
    pool: () => request<{ riders: Record<string, unknown>[]; refreshesIn: number }>('/riders/pool'),
    hire: (poolId: string) =>
      request<Record<string, unknown>>('/riders/hire', {
        method: 'POST',
        body: JSON.stringify({ poolId }),
      }),
    upgrade: (riderId: string, stat: string) =>
      request<Record<string, unknown>>(`/riders/${riderId}/upgrade`, {
        method: 'POST',
        body: JSON.stringify({ stat }),
      }),
    rest: (riderId: string) =>
      request<{ riderId: string; status: string }>(`/riders/${riderId}/rest`, {
        method: 'POST',
      }),
  },
  orders: {
    list: () => request<Record<string, unknown>[]>('/orders'),
    available: () => request<Record<string, unknown>[]>('/orders/available'),
    assign: (riderId: string, orderId: string) =>
      request<Record<string, unknown>>('/orders/assign', {
        method: 'POST',
        body: JSON.stringify({ riderId, orderId }),
      }),
  },
  events: {
    list: () => request<Record<string, unknown>[]>('/events'),
  },
  zones: {
    list: () => request<Record<string, unknown>[]>('/zones'),
    unlock: (zoneId: string) =>
      request<Record<string, unknown>>('/zones/unlock', {
        method: 'POST',
        body: JSON.stringify({ zoneId }),
      }),
  },
  leaderboard: {
    top: () => request<Record<string, unknown>[]>('/leaderboard'),
    hackers: () => request<Record<string, unknown>[]>('/leaderboard/hackers'),
    explorers: () => request<Record<string, unknown>[]>('/leaderboard/explorers'),
  },
  batch: {
    assign: async (assignments: { riderId: string; orderId: string }[]) => {
      const body = JSON.stringify({ assignments });
      const signature = await hmacSign(body);
      return request<Record<string, unknown>>('/batch/assign', {
        method: 'POST',
        headers: { 'X-Signature': signature },
        body,
      });
    },
    upgrade: async (upgrades: { riderId: string; stat: string }[]) => {
      const body = JSON.stringify({ upgrades });
      const signature = await hmacSign(body);
      return request<Record<string, unknown>>('/batch/upgrade', {
        method: 'POST',
        headers: { 'X-Signature': signature },
        body,
      });
    },
  },
  achievements: {
    list: () =>
      request<
        {
          id: string;
          name: string;
          description: string;
          icon: string;
          unlocked: boolean;
          unlockedAt: string | null;
        }[]
      >('/achievements'),
  },
};
