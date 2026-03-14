<script lang="ts">
  import { calculateDeliveryMinutes } from '@drop-coop/game'
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Progress } from '$lib/components/ui/progress'
  import { getProfile, setProfile } from '$lib/stores/profile.svelte'
  import { onMount } from 'svelte'

  let riders: Record<string, unknown>[] = $state([])
  let orders: Record<string, unknown>[] = $state([])
  let allOrders: Record<string, unknown>[] = $state([])
  let loading = $state(true)

  onMount(async () => {
    const [p, r, o, all] = await Promise.all([
      api.player.profile(),
      api.riders.list(),
      api.orders.available(),
      api.orders.list(),
    ])
    setProfile(p)
    riders = r
    orders = o
    allOrders = all
    loading = false
  })

  let idleRiders = $derived(riders.filter(r => r.status === 'idle').length)
  let deliveringRiders = $derived(riders.filter(r => r.status === 'delivering').length)
  let availableOrders = $derived(orders.filter(o => o.status === 'available').length)
  let activeDeliveries = $derived(allOrders.filter(o => o.status === 'assigned'))

  // Contextual guidance based on game state
  let nextStep = $derived.by(() => {
    if (riders.length === 0) return { text: 'Hire your first rider to start delivering!', action: '/dashboard/riders', label: 'Hire a rider' }
    if (availableOrders > 0 && idleRiders > 0) return { text: 'You have idle riders and pending orders. Assign them!', action: '/dashboard/orders', label: 'View orders' }
    if (idleRiders === 0 && deliveringRiders > 0) return { text: 'All riders are out delivering. Wait for them to return or hire more!', action: '/dashboard/riders', label: 'Hire more' }
    if (availableOrders === 0) return { text: 'No orders right now. Check back soon or expand your reputation!', action: '/dashboard/orders', label: 'Check orders' }
    return null
  })
</script>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <p class="text-muted-foreground">Loading dashboard...</p>
  </div>
{:else}
<div class="space-y-6">
  <!-- Goal banner -->
  <Card class="border-primary/20 bg-primary/5">
    <CardHeader class="pb-2">
      <CardTitle class="text-lg">🎯 Your Goal</CardTitle>
      <CardDescription>
        Grow your delivery co-op! Hire riders, complete orders, earn money, and expand your business.
        The more you deliver, the more orders you unlock.
      </CardDescription>
    </CardHeader>
    {#if nextStep}
      <CardContent class="pt-0">
        <div class="flex items-center justify-between bg-background rounded p-3 border">
          <p class="text-sm font-medium">{nextStep.text}</p>
          <Button size="sm" href={nextStep.action}>{nextStep.label}</Button>
        </div>
      </CardContent>
    {/if}
  </Card>

  <!-- Stats grid -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card>
        <CardContent class="pt-6">
          <p class="text-sm text-muted-foreground">💰 Money</p>
          <p class="text-2xl font-bold">€{Number(getProfile().money).toFixed(0)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <p class="text-sm text-muted-foreground">⭐ Reputation</p>
          <p class="text-2xl font-bold">{Number(getProfile().reputation).toFixed(0)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <p class="text-sm text-muted-foreground">📦 Deliveries</p>
          <p class="text-2xl font-bold">{getProfile().totalDeliveries}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <p class="text-sm text-muted-foreground">💵 Total Profit</p>
          <p class="text-2xl font-bold">€{Number(getProfile().totalProfit).toFixed(0)}</p>
        </CardContent>
      </Card>
    </div>

    <!-- Tick summary -->
    {#if Number(getProfile().lastTick?.revenue) > 0 || Number(getProfile().lastTick?.costs) > 0}
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-base">📋 Since your last visit</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex gap-6 text-sm">
            {#if Number(getProfile().lastTick?.revenue) > 0}
              <span class="text-green-600">+€{Number(getProfile().lastTick?.revenue).toFixed(2)} revenue</span>
            {/if}
            {#if Number(getProfile().lastTick?.costs) > 0}
              <span class="text-red-500">-€{Number(getProfile().lastTick?.costs).toFixed(2)} salaries</span>
            {/if}
          </div>
        </CardContent>
      </Card>
    {/if}

    <!-- Active deliveries -->
    {#if activeDeliveries.length > 0}
      <Card class="border-blue-500/20">
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <CardTitle class="text-base">🚴 Active Deliveries ({activeDeliveries.length})</CardTitle>
            <Button size="sm" variant="outline" href="/dashboard/orders">View all</Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-2">
          {#each activeDeliveries as order}
            {@const rider = riders.find(r => r.id === order.riderId)}
            {@const minutes = rider ? calculateDeliveryMinutes({ speed: Number(rider.speed), cityKnowledge: Number(rider.cityKnowledge) }, { distance: Number(order.distance) }) : 0}
            {@const eta = new Date(new Date(order.assignedAt as string).getTime() + minutes * 60 * 1000)}
            {@const remaining = Math.max(0, Math.round((eta.getTime() - Date.now()) / 60000))}
            <div class="flex items-center justify-between border rounded p-2 text-sm">
              <span>🏍️ {rider?.name ?? 'Unknown'} → €{Number(order.reward).toFixed(2)}</span>
              <span class="text-xs text-muted-foreground">
                {#if remaining > 0}
                  ⏱️ ~{remaining} min left
                {:else}
                  ✅ Arriving soon!
                {/if}
              </span>
            </div>
          {/each}
        </CardContent>
      </Card>
    {/if}

    <!-- Fleet overview -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle class="text-base">🏍️ Fleet Overview</CardTitle>
          <Button size="sm" variant="outline" href="/dashboard/riders">Manage riders</Button>
        </div>
      </CardHeader>
      <CardContent>
        {#if riders.length === 0}
          <p class="text-muted-foreground text-sm">No riders yet. Hire your first one to start earning!</p>
        {:else}
          <div class="space-y-3">
            {#each riders as rider}
              <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm">{rider.name}</span>
                    <Badge variant={rider.status === 'idle' ? 'default' : rider.status === 'delivering' ? 'secondary' : 'outline'} class="text-xs">
                      {rider.status}
                    </Badge>
                  </div>
                </div>
                <div class="flex items-center gap-2 w-32">
                  <span class="text-xs text-muted-foreground">🔋</span>
                  <Progress value={Number(rider.energy)} class="h-2" />
                  <span class="text-xs text-muted-foreground w-8">{Number(rider.energy).toFixed(0)}%</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>

</div>
{/if}
