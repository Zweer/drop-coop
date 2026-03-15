<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { api, getToken, setToken } from '$lib/api'
  import { Button } from '$lib/components/ui/button'
  import { Progress } from '$lib/components/ui/progress'
  import { getProfile, setProfile } from '$lib/stores/profile.svelte'
  import { getTheme, setTheme } from '$lib/stores/theme.svelte'
  import { onMount } from 'svelte'

  let { children } = $props()

  let loading = $state(true)

  onMount(async () => {
    if (!getToken()) { goto('/login'); return }
    try {
      setProfile(await api.player.profile())
    } catch {
      setToken(null)
      goto('/login')
      return
    }
    loading = false
  })

  function logout() {
    setToken(null)
    goto('/login')
  }

  const navItems = [
    { href: '/dashboard', label: '📊 Dashboard' },
    { href: '/dashboard/riders', label: '🏍️ Riders' },
    { href: '/dashboard/orders', label: '📦 Orders' },
    { href: '/dashboard/leaderboard', label: '🏆 Leaderboard' },
  ]

  const themeIcons: Record<string, string> = { light: '☀️', dark: '🌙', system: '💻' }
  const themeOrder: Array<'light' | 'dark' | 'system'> = ['system', 'light', 'dark']

  function cycleTheme() {
    const idx = themeOrder.indexOf(getTheme())
    setTheme(themeOrder[(idx + 1) % themeOrder.length])
  }
  let progression = $derived(getProfile()?.progression as Record<string, unknown> | undefined)
  let nextMilestone = $derived(progression?.nextMilestone as Record<string, unknown> | undefined)
</script>

{#if loading}
  <div class="flex min-h-screen items-center justify-center">
    <p class="text-muted-foreground">Loading your co-op...</p>
  </div>
{:else if getProfile()}
  <div class="min-h-screen flex flex-col">
    <header class="border-b px-4 py-3 flex items-center justify-between bg-card">
      <div class="flex items-center gap-6">
        <a href="/dashboard" class="text-xl font-bold">🚲 drop-coop</a>
        <nav class="flex gap-1">
          {#each navItems as item}
            <a
              href={item.href}
              class="px-3 py-1.5 rounded text-sm transition-colors {$page.url.pathname === item.href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
            >
              {item.label}
            </a>
          {/each}
        </nav>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium">€{Number(getProfile()?.money).toFixed(0)}</span>
        <!-- Level + progress -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">Lv.{getProfile()?.level}</span>
          {#if progression}
            <div class="w-16" title={nextMilestone ? `Next: Lv.${nextMilestone.level} — ${nextMilestone.description}` : 'Max level reached'}>
              <Progress value={Number(progression.progressPercent)} class="h-1.5" />
            </div>
          {/if}
        </div>
        <Button variant="ghost" size="sm" onclick={cycleTheme} title={getTheme()}>
          {themeIcons[getTheme()]}
        </Button>
        <Button variant="ghost" size="sm" onclick={logout}>Logout</Button>
      </div>
    </header>

    <main class="flex-1 p-6 max-w-5xl mx-auto w-full">
      {@render children?.()}
    </main>
  </div>
{/if}
