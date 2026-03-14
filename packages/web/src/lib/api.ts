const API_BASE = '/api';

let token: string | null = null;

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }

  return res.json();
}

export const api = {
  auth: {
    register: (username: string, password: string) =>
      request<{ token: string; player: { id: string; username: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    login: (username: string, password: string) =>
      request<{ token: string; player: { id: string; username: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
  },
  player: {
    profile: () => request<Record<string, unknown>>('/player/profile'),
  },
  riders: {
    list: () => request<Record<string, unknown>[]>('/riders'),
    pool: () => request<Record<string, unknown>[]>('/riders/pool'),
    hire: (rider: Record<string, unknown>) =>
      request<Record<string, unknown>>('/riders/hire', {
        method: 'POST',
        body: JSON.stringify(rider),
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
};
