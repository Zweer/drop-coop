<script lang="ts">
  import { calculateUpgradeCost } from '@drop-coop/game'
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Progress } from '$lib/components/ui/progress'
  import { getProfile } from '$lib/stores/profile.svelte'
  import { usePoll } from '$lib/stores/tick.svelte'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  let riders: Record<string, unknown>[] = $state([])
  let pool: Record<string, unknown>[] = $state([])
  let poolRefreshesIn = $state(0)
  let showPool = $state(false)
  let loading = $state(true)
  let busy = $state(false)

  async function refreshRiders() {
    try {
      riders = await api.riders.list()
    } catch {
      // Silently ignore refresh errors
    }
  }

  onMount(async () => {
    await refreshRiders()
    loading = false
  })

  usePoll(refreshRiders, 15_000)

  async function openPool() {
    const result = await api.riders.pool()
    pool = result.riders
    poolRefreshesIn = result.refreshesIn
    showPool = true
  }

  async function hire(candidate: Record<string, unknown>) {
    if (busy) return
    busy = true
    try {
      await api.riders.hire(candidate.id as string)
      toast.success(`${candidate.name} hired!`, { description: `Salary: €${candidate.salary}/hr` })
      await refreshRiders()
      await openPool()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hire failed')
    } finally {
      busy = false
    }
  }

  async function upgrade(riderId: string, riderName: string, stat: string) {
    if (busy) return
    busy = true
    try {
      const result = await api.riders.upgrade(riderId, stat)
      toast.success(`${riderName}: ${stat} → ${result.newValue}`, { description: `-€${result.cost}` })
      await refreshRiders()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upgrade failed')
    } finally {
      busy = false
    }
  }

  let canUpgrade = $derived(Number(getProfile()?.level) >= 5)

  const stats = [
    { key: 'speed', icon: '⚡', label: 'Speed' },
    { key: 'reliability', icon: '🎯', label: 'Reliability' },
    { key: 'cityKnowledge', icon: '🗺️', label: 'Knowledge' },
    { key: 'stamina', icon: '💪', label: 'Stamina' },
  ]
</script>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <p class="text-muted-foreground">Loading riders...</p>
  </div>
{:else}
<div class="space-y-6">
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-2xl font-bold">🏍️ Riders</h2>
      <p class="text-sm text-muted-foreground">
        Manage your fleet. {canUpgrade ? 'Click stats to upgrade them!' : `Upgrades unlock at level 5.`}
      </p>
    </div>
    <Button onclick={openPool} class="w-full sm:w-auto">
      {showPool ? 'Refresh pool' : 'Browse hiring pool'}
    </Button>
  </div>

  <!-- Hiring pool -->
  {#if showPool && pool.length > 0}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle class="text-base">📋 Hiring Pool</CardTitle>
        <CardDescription>Better stats = higher cost and salary. Pool refreshes in {Math.floor(poolRefreshesIn / 3600)}h {Math.floor((poolRefreshesIn % 3600) / 60)}m.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        {#each pool as candidate}
          <div class="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div class="space-y-1">
              <p class="font-medium">{candidate.name}</p>
              <div class="flex gap-3 text-xs text-muted-foreground">
                <span>⚡ {candidate.speed}</span>
                <span>🎯 {candidate.reliability}</span>
                <span>🗺️ {candidate.cityKnowledge}</span>
                <span>💪 {candidate.stamina}</span>
              </div>
              <p class="text-xs text-muted-foreground">Salary: €{candidate.salary}/hr</p>
            </div>
            <Button onclick={() => hire(candidate)} disabled={busy}>
              Hire €{candidate.hireCost}
            </Button>
          </div>
        {/each}
      </CardContent>
    </Card>
  {/if}

  <!-- Current riders -->
  {#if riders.length === 0}
    <Card>
      <CardContent class="py-12 text-center">
        <p class="text-4xl mb-3">🏍️</p>
        <p class="font-medium">No riders yet</p>
        <p class="text-sm text-muted-foreground mt-1">Hire from the pool above to start.</p>
      </CardContent>
    </Card>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2">
      {#each riders as rider}
        <Card>
          <CardContent class="pt-6 space-y-3">
            <div class="flex items-center justify-between">
              <p class="font-medium text-lg">{rider.name}</p>
              <Badge variant={rider.status === 'idle' ? 'default' : rider.status === 'delivering' ? 'secondary' : 'outline'}>
                {rider.status === 'idle' ? '✅ Idle' : rider.status === 'delivering' ? '🚴 Delivering' : '😴 Resting'}
              </Badge>
            </div>

            <div class="grid grid-cols-4 gap-2 text-center">
              {#each stats as s}
                {@const val = Number(rider[s.key])}
                {@const cost = calculateUpgradeCost(val)}
                <div>
                  <p class="text-xs text-muted-foreground">{s.label}</p>
                  <p class="font-bold">{s.icon} {val}</p>
                  {#if canUpgrade && val < 10}
                    <button
                      class="text-[10px] text-primary hover:underline disabled:opacity-50"
                      disabled={busy}
                      onclick={() => upgrade(rider.id as string, rider.name as string, s.key)}
                    >
                      ↑ €{cost}
                    </button>
                  {:else if val >= 10}
                    <span class="text-[10px] text-green-600">MAX</span>
                  {/if}
                </div>
              {/each}
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>🔋 Energy</span>
                <span>{Number(rider.energy).toFixed(0)}%</span>
              </div>
              <Progress value={Number(rider.energy)} class="h-2" />
            </div>

            <p class="text-xs text-muted-foreground">💰 Salary: €{rider.salary}/hr</p>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}
</div>
{/if}
