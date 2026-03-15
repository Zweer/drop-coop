<script lang="ts">
  import { calculateDeliveryMinutes } from '@drop-coop/game'
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { usePoll, useTick } from '$lib/stores/tick.svelte'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  let riders: Record<string, unknown>[] = $state([])
  let orders: Record<string, unknown>[] = $state([])
  let allOrders: Record<string, unknown>[] = $state([])
  let loading = $state(true)
  let assigning = $state<string | null>(null)
  let selectedRider = $state<Record<string, unknown> | null>(null)

  const clock = useTick()

  async function refresh() {
    try {
      ;[riders, orders, allOrders] = await Promise.all([
        api.riders.list(),
        api.orders.available(),
        api.orders.list(),
      ])
    } catch {
      // Silently ignore refresh errors
    }
  }

  onMount(async () => {
    await refresh()
    loading = false
  })

  usePoll(refresh, 15_000)

  async function assign(orderId: string, riderId: string) {
    if (assigning) return
    assigning = orderId
    try {
      const result = await api.orders.assign(riderId, orderId)
      toast.success(`Rider dispatched!`, { description: `ETA: ${result.estimatedMinutes} min` })
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assignment failed')
    } finally {
      assigning = null
    }
  }

  /** Quick-assign: pick a rider, then click orders to assign. */
  function toggleRiderSelect(rider: Record<string, unknown>) {
    selectedRider = selectedRider?.id === rider.id ? null : rider
  }

  function quickAssign(orderId: string) {
    if (!selectedRider) return
    assign(orderId, selectedRider.id as string)
    selectedRider = null
  }

  let idleRiders = $derived(riders.filter(r => r.status === 'idle') as Record<string, unknown>[])
  let inProgress = $derived(allOrders.filter(o => o.status === 'assigned'))
  let completed = $derived(allOrders.filter(o => o.status === 'delivered').slice(-10).reverse())
  let failed = $derived(allOrders.filter(o => o.status === 'failed').slice(-5).reverse())

  function riderName(riderId: unknown): string {
    return String(riders.find(r => r.id === riderId)?.name ?? 'Unknown')
  }

  function formatCountdown(targetMs: number): string {
    const diff = Math.max(0, targetMs - clock.now)
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    if (diff <= 0) return '0:00'
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  function expiryUrgency(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - clock.now
    if (diff < 5 * 60000) return 'text-red-500 font-medium'
    if (diff < 10 * 60000) return 'text-orange-500'
    return 'text-muted-foreground'
  }

  const urgencyStyle: Record<string, { variant: 'destructive' | 'default' | 'secondary'; label: string }> = {
    express: { variant: 'destructive', label: '🔥 Express 2x' },
    urgent: { variant: 'default', label: '⚡ Urgent 1.5x' },
    normal: { variant: 'secondary', label: 'Normal' },
  }
</script>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <p class="text-muted-foreground">Loading orders...</p>
  </div>
{:else}
<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold">📦 Orders</h2>
    <p class="text-sm text-muted-foreground">
      {#if selectedRider}
        🎯 <span class="font-medium text-primary">{selectedRider.name}</span> selected — click an order to assign.
        <button class="underline ml-1" onclick={() => selectedRider = null}>Cancel</button>
      {:else}
        Pick a rider below, then click an order to dispatch.
      {/if}
    </p>
  </div>

  <!-- Idle riders bar -->
  {#if idleRiders.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each idleRiders as rider}
        <button
          class="flex items-center gap-2 border rounded-full px-3 py-1.5 text-sm transition-all {selectedRider?.id === rider.id ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30' : 'hover:bg-muted'}"
          onclick={() => toggleRiderSelect(rider)}
        >
          <span>🏍️ {rider.name}</span>
          <span class="text-xs opacity-70">⚡{rider.speed} 🔋{Number(rider.energy).toFixed(0)}%</span>
        </button>
      {/each}
    </div>
  {:else if riders.length > 0}
    <Card class="border-amber-500/20 bg-amber-500/5">
      <CardContent class="py-3">
        <p class="text-sm">⏳ All riders busy. Wait or <a href="/dashboard/riders" class="underline font-medium">hire more</a>.</p>
      </CardContent>
    </Card>
  {/if}

  <!-- Available orders -->
  {#if riders.length === 0}
    <Card>
      <CardContent class="py-12 text-center">
        <p class="text-4xl mb-3">📦</p>
        <p class="font-medium">You need riders first!</p>
        <p class="text-sm text-muted-foreground mt-1">
          <a href="/dashboard/riders" class="underline">Hire a rider</a> to start.
        </p>
      </CardContent>
    </Card>
  {:else if orders.length === 0}
    <Card>
      <CardContent class="py-12 text-center">
        <p class="text-4xl mb-3">😴</p>
        <p class="font-medium">No orders available</p>
        <p class="text-sm text-muted-foreground mt-1">New orders arrive over time. Check back soon!</p>
      </CardContent>
    </Card>
  {:else}
    <div class="space-y-2">
      {#each orders as order}
        {@const style = urgencyStyle[order.urgency as string] ?? urgencyStyle.normal}
        {@const expiresMs = new Date(order.expiresAt as string).getTime()}
        {@const isAssigning = assigning === order.id}
        <button
          class="w-full text-left border rounded-lg p-4 transition-all {selectedRider ? 'hover:border-primary hover:bg-primary/5 cursor-pointer' : ''} {isAssigning ? 'opacity-50' : ''}"
          disabled={!selectedRider || !!assigning}
          onclick={() => quickAssign(order.id as string)}
        >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div class="flex items-center gap-3">
              <span class="text-lg font-bold">€{Number(order.reward).toFixed(2)}</span>
              <Badge variant={style.variant}>{style.label}</Badge>
              <span class="text-xs text-muted-foreground">📏 {Number(order.distance).toFixed(1)} km</span>
            </div>
            <span class="text-xs font-mono {expiryUrgency(order.expiresAt as string)}">
              ⏰ {formatCountdown(expiresMs)}
            </span>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  <!-- In Progress -->
  {#if inProgress.length > 0}
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">🚴 In Progress ({inProgress.length})</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        {#each inProgress as order}
          {@const style = urgencyStyle[order.urgency as string] ?? urgencyStyle.normal}
          {@const rider = riders.find(r => r.id === order.riderId)}
          {@const minutes = rider ? calculateDeliveryMinutes({ speed: Number(rider.speed), cityKnowledge: Number(rider.cityKnowledge) }, { distance: Number(order.distance) }) : 0}
          {@const etaMs = new Date(order.assignedAt as string).getTime() + minutes * 60 * 1000}
          <div class="flex items-center justify-between border rounded p-3 bg-muted/30">
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium">€{Number(order.reward).toFixed(2)}</span>
              <Badge variant={style.variant} class="text-xs">{style.label}</Badge>
            </div>
            <div class="text-xs text-muted-foreground">
              🏍️ {riderName(order.riderId)} · <span class="font-mono">⏱️ {formatCountdown(etaMs)}</span>
            </div>
          </div>
        {/each}
      </CardContent>
    </Card>
  {/if}

  <!-- Failed -->
  {#if failed.length > 0}
    <Card class="border-red-500/20">
      <CardHeader class="pb-2">
        <CardTitle class="text-base">❌ Failed ({failed.length})</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        {#each failed as order}
          <div class="flex items-center justify-between border rounded p-3 opacity-70">
            <span class="text-sm text-red-500">✗ €{Number(order.reward).toFixed(2)} lost</span>
            <span class="text-xs text-muted-foreground">🏍️ {riderName(order.riderId)}</span>
          </div>
        {/each}
      </CardContent>
    </Card>
  {/if}

  <!-- Completed -->
  {#if completed.length > 0}
    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">✅ Completed ({completed.length})</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        {#each completed as order}
          <div class="flex items-center justify-between border rounded p-3 opacity-70">
            <span class="text-sm text-green-600">+€{Number(order.reward).toFixed(2)}</span>
            <span class="text-xs text-muted-foreground">
              🏍️ {riderName(order.riderId)} · {new Date(order.deliveredAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        {/each}
      </CardContent>
    </Card>
  {/if}
</div>
{/if}
