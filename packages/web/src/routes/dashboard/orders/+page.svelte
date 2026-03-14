<script lang="ts">
  import { calculateDeliveryMinutes } from '@drop-coop/game'
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { onMount } from 'svelte'

  let riders: Record<string, unknown>[] = $state([])
  let orders: Record<string, unknown>[] = $state([])
  let allOrders: Record<string, unknown>[] = $state([])
  let message = $state('')
  let loading = $state(true)
  let assigning = $state(false)

  onMount(async () => {
    await refresh()
    loading = false
  })

  async function refresh() {
    ;[riders, orders, allOrders] = await Promise.all([
      api.riders.list(),
      api.orders.available(),
      api.orders.list(),
    ])
  }

  async function assign(orderId: string, riderId: string) {
    if (assigning) return
    assigning = true
    try {
      const result = await api.orders.assign(riderId, orderId)
      message = `✅ Rider assigned! Estimated delivery: ${result.estimatedMinutes} min`
      await refresh()
    } catch (e) {
      message = `❌ ${e instanceof Error ? e.message : 'Assignment failed'}`
    } finally {
      assigning = false
    }
  }

  let idleRiders = $derived(riders.filter(r => r.status === 'idle') as Record<string, unknown>[])
  let inProgress = $derived(allOrders.filter(o => o.status === 'assigned'))
  let completed = $derived(allOrders.filter(o => o.status === 'delivered').slice(-10).reverse())

  function riderName(riderId: unknown): string {
    const rider = riders.find(r => r.id === riderId)
    return rider ? String(rider.name) : 'Unknown'
  }

  const urgencyStyle: Record<string, { variant: 'destructive' | 'default' | 'secondary'; label: string }> = {
    express: { variant: 'destructive', label: '🔥 Express (2x)' },
    urgent: { variant: 'default', label: '⚡ Urgent (1.5x)' },
    normal: { variant: 'secondary', label: 'Normal' },
  }
</script>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <p class="text-muted-foreground">Loading orders...</p>
  </div>
{:else}
<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold">📦 Orders</h2>
      <p class="text-sm text-muted-foreground">
        Assign idle riders to orders. Higher urgency = more money. Orders expire if not taken!
      </p>
    </div>
    <Button variant="outline" onclick={refresh}>🔄 Refresh</Button>
  </div>

  {#if message}
    <p class="text-sm p-3 rounded bg-muted">{message}</p>
  {/if}

  {#if idleRiders.length === 0 && riders.length > 0}
    <Card class="border-amber-500/20 bg-amber-500/5">
      <CardContent class="py-4">
        <p class="text-sm">⏳ All your riders are busy delivering. Wait for them to return or <a href="/dashboard/riders" class="underline font-medium">hire more riders</a>.</p>
      </CardContent>
    </Card>
  {/if}

  {#if riders.length === 0}
    <Card>
      <CardContent class="py-12 text-center">
        <p class="text-4xl mb-3">📦</p>
        <p class="font-medium">You need riders first!</p>
        <p class="text-sm text-muted-foreground mt-1">
          <a href="/dashboard/riders" class="underline">Hire a rider</a> before you can accept orders.
        </p>
      </CardContent>
    </Card>
  {:else if orders.length === 0}
    <Card>
      <CardContent class="py-12 text-center">
        <p class="text-4xl mb-3">😴</p>
        <p class="font-medium">No orders available</p>
        <p class="text-sm text-muted-foreground mt-1">Check back soon — new orders arrive regularly.</p>
      </CardContent>
    </Card>
  {:else}
    <div class="space-y-3">
      {#each orders as order}
        {@const style = urgencyStyle[order.urgency as string] ?? urgencyStyle.normal}
        <Card>
          <CardContent class="py-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4 flex-1">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-lg font-bold">€{Number(order.reward).toFixed(2)}</span>
                    <Badge variant={style.variant}>{style.label}</Badge>
                  </div>
                  <div class="flex gap-3 text-xs text-muted-foreground">
                    <span>📏 {Number(order.distance).toFixed(1)} km</span>
                    <span>⏰ Expires {new Date(order.expiresAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {#if idleRiders.length > 0}
                <div class="flex items-center gap-2">
                  <select
                    class="border rounded-md px-3 py-1.5 text-sm bg-background"
                    onchange={(e) => {
                      const target = e.target as HTMLSelectElement
                      if (target.value) {
                        assign(order.id as string, target.value)
                        target.value = ''
                      }
                    }}
                  >
                    <option value="">Assign rider...</option>
                    {#each idleRiders as rider}
                      <option value={rider.id}>
                        {rider.name} (⚡{rider.speed} 🔋{Number(rider.energy).toFixed(0)}%)
                      </option>
                    {/each}
                  </select>
                </div>
              {:else}
                <span class="text-xs text-muted-foreground">No idle riders</span>
              {/if}
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}

  <!-- In Progress -->
  {#if inProgress.length > 0}
    <Card>
      <CardHeader>
        <CardTitle class="text-base">🚴 In Progress ({inProgress.length})</CardTitle>
        <CardDescription>These orders are being delivered right now.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        {#each inProgress as order}
          {@const style = urgencyStyle[order.urgency as string] ?? urgencyStyle.normal}
          {@const rider = riders.find(r => r.id === order.riderId)}
          {@const minutes = rider ? calculateDeliveryMinutes({ speed: Number(rider.speed), cityKnowledge: Number(rider.cityKnowledge) }, { distance: Number(order.distance) }) : 0}
          {@const eta = new Date(new Date(order.assignedAt as string).getTime() + minutes * 60 * 1000)}
          {@const remaining = Math.max(0, Math.round((eta.getTime() - Date.now()) / 60000))}
          <div class="flex items-center justify-between border rounded p-3 bg-muted/30">
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium">€{Number(order.reward).toFixed(2)}</span>
              <Badge variant={style.variant} class="text-xs">{style.label}</Badge>
              <span class="text-xs text-muted-foreground">📏 {Number(order.distance).toFixed(1)} km</span>
            </div>
            <div class="text-xs text-muted-foreground">
              🏍️ {riderName(order.riderId)} ·
              {#if remaining > 0}
                ⏱️ ~{remaining} min left
              {:else}
                ✅ Arriving soon!
              {/if}
            </div>
          </div>
        {/each}
      </CardContent>
    </Card>
  {/if}

  <!-- Recently Completed -->
  {#if completed.length > 0}
    <Card>
      <CardHeader>
        <CardTitle class="text-base">✅ Recently Completed ({completed.length})</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        {#each completed as order}
          <div class="flex items-center justify-between border rounded p-3 opacity-70">
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-green-600">+€{Number(order.reward).toFixed(2)}</span>
              <span class="text-xs text-muted-foreground">📏 {Number(order.distance).toFixed(1)} km</span>
            </div>
            <div class="text-xs text-muted-foreground">
              🏍️ {riderName(order.riderId)} · {new Date(order.deliveredAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        {/each}
      </CardContent>
    </Card>
  {/if}
</div>
{/if}
