import { onDestroy } from 'svelte';

/** Reactive timestamp that updates every second — for live countdowns. */
export function useTick() {
  let now = $state(Date.now());
  const id = setInterval(() => {
    now = Date.now();
  }, 1000);
  onDestroy(() => clearInterval(id));
  return {
    get now() {
      return now;
    },
  };
}

/** Poll a function every `ms` milliseconds. Auto-cleans up on destroy. */
export function usePoll(fn: () => Promise<void>, ms: number) {
  const id = setInterval(fn, ms);
  onDestroy(() => clearInterval(id));
}
