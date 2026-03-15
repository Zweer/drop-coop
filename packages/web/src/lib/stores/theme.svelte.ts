export type Theme = 'light' | 'dark' | 'system';

let theme = $state<Theme>('system');

export function getTheme(): Theme {
  return theme;
}

export function setTheme(t: Theme): void {
  theme = t;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('theme', t);
  }
  applyTheme(t);
}

export function initTheme(): void {
  if (typeof localStorage !== 'undefined') {
    theme = (localStorage.getItem('theme') as Theme) ?? 'system';
  }
  applyTheme(theme);
}

function applyTheme(t: Theme): void {
  if (typeof document === 'undefined') return;
  const isDark =
    t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}
