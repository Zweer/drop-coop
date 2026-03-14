let profile = $state<Record<string, unknown> | null>(null);

export function getProfile(): Record<string, unknown> | null {
  return profile;
}

export function setProfile(p: Record<string, unknown> | null): void {
  profile = p;
}
