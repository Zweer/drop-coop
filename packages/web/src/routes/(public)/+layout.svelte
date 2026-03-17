<script lang="ts">
  import { page } from '$app/stores'
  import { Button } from '$lib/components/ui/button'
  import { getTheme, setTheme } from '$lib/stores/theme.svelte'

  let { children } = $props()

  const nav = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/challenges', label: 'Challenges' },
    { href: '/process', label: 'Process' },
  ]

  const themeIcons: Record<string, string> = { light: '☀️', dark: '🌙', system: '💻' }
  const themeOrder: Array<'light' | 'dark' | 'system'> = ['system', 'light', 'dark']
  function cycleTheme() {
    const idx = themeOrder.indexOf(getTheme())
    setTheme(themeOrder[(idx + 1) % themeOrder.length])
  }
</script>

<header class="border-b px-4 py-3 flex items-center justify-between bg-card">
  <div class="flex items-center gap-6">
    <a href="/" class="text-xl font-bold">🚲 drop-coop</a>
    <nav class="hidden sm:flex gap-1">
      {#each nav as item}
        <a
          href={item.href}
          class="px-3 py-1.5 rounded text-sm transition-colors {$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
        >
          {item.label}
        </a>
      {/each}
    </nav>
  </div>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" onclick={cycleTheme}>{themeIcons[getTheme()]}</Button>
    <Button size="sm" href="/login">Play</Button>
  </div>
</header>

<main class="flex-1 p-6 max-w-3xl mx-auto w-full">
  <article class="prose dark:prose-invert max-w-none">
    {@render children?.()}
  </article>
</main>

<!-- Mobile nav -->
<nav class="sm:hidden fixed bottom-0 inset-x-0 border-t bg-card flex z-50">
  {#each nav as item}
    <a
      href={item.href}
      class="flex-1 text-center py-3 text-xs transition-colors {$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/') ? 'text-primary font-medium' : 'text-muted-foreground'}"
    >
      {item.label}
    </a>
  {/each}
</nav>
