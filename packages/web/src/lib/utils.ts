import { type ClassValue, clsx } from 'clsx';
import type { HTMLAttributes } from 'svelte/elements';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type WithElementRef<T extends HTMLAttributes<HTMLElement>> = T & {
  ref?: HTMLElement | null;
};
