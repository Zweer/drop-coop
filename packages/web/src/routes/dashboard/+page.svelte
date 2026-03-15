<script lang="ts">
  import { calculateDeliveryMinutes } from '@drop-coop/game'
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Progress } from '$lib/components/ui/progress'
  import { getProfile, setProfile } from '$lib/stores/profile.svelte'
  import { usePoll, useTick } from '$lib/stores/tick.svelte'
  import { onMount } from 'svelte'

  let riders: Record<string, unknown>[] = $state([])
  let orders: Record<string, unknown>[] = $state([])
  let allOrders: Record<string, unknown>[] = $state([])
  let activeEvents: Record<string, unknown>[] = $state([])
  let loading = $state(true)

  const clock = useTick()

  async function refresh() {
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
    activeEvents = (p.events ?? []) as Record<string, unknown>[]
  }

  onMount(async () => {
    await refresh()
    loading = false
  })

  usePoll(refresh, 15_000)

  let idleRiders = $derived(riders.filter(r => r.status === 'idle').length)
  let deliveringRiders = $derived(riders.filter(r => r.status === 'delivering').length)
  let availableOrders = $derived(orders.filter(o => o.status === 'available').length)
  let activeDeliveries = $derived(allOrders.filter(o => o.status === 'assigned'))

  let progression = $derived(getProfile()?.progression as Record<string, unknown> | undefined)
  let nextMilestone = $derived(progression?.nextMilestone as Record<string, unknown> | undefined)
  let unlockedMilestones = $derived((progression?.unlockedMilestones ?? []) as Record<string, unknown>[])
  let lastTick = $derived(getProfile()?.lastTick as Record<string, unknown> | undefined)

  let nextStep = $derived.by(() => {
    if (riders.length === 0) return { text: 'Hire your first rider to start delivering!', action: '/dashboard/riders', label: 'Hire a rider', icon: '🏍️' }
    if (availableOrders > 0 && idleRiders > 0) return { text: `${availableOrders} orders waiting, ${idleRiders} riders idle — assign them!`, action: '/dashboard/orders', label: 'Assign orders', icon: '📦' }
    if (idleRiders === 0 && deliveringRiders > 0) return { text: 'All riders out delivering. Hire more to scale up!', action: '/dashboard/riders', label: 'Hire more', icon: '⏳' }
    if (availableOrders === 0) return { text: 'No orders right now. They arrive over time — check back soon!', action: '/dashboard/orders', label: 'Check orders', icon: '😴' }
    return null
  })

  function formatRemaining(etaMs: number): string {
    const diff = Math.max(0, etaMs - clock.now)
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    if (diff <= 0) return 'Done!'
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  function deliveryProgress(assignedAt: string, minutes: number): number {
    const start = new Date(assignedAt).getTime()
    const end = start + minutes * 60 * 1000
    const elapsed = clock.now - start
    const total = end - start
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }
</script>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <p class="text-muted-foreground">Loading dashboard...</p>
  </div>
{:else}
<div class="space-y-5">
  <!-- Progression -->
  {#if progression}
    <Card class="border-primary/20 bg-primary/5">
      <CardContent class="py-4">
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-lg">📈 Level {progression.level}</span>
          {#if nextMilestone}
            <span class="text-xs text-muted-foreground">
              Next: Lv.{nextMilestone.level} — {nextMilestone.description}
            </span>
          {/if}
        </div>
        <div class="flex items-center gap-3">
          <Progress value={Number(progression.progressPercent)} class="h-2.5 flex-1" />
          <span class="text-xs text-muted-foreground w-20 text-right">
            {progression.totalDeliveries}/{progression.deliveriesForNextLevel}
          </span>
        </div>
        {#if unlockedMilestones.length > 1}
          <div class="flex flex-wrap gap-1.5 mt-2">
            {#each unlockedMilestones as m}
              <Badge variant="outline" class="text-xs">Lv.{m.level} {m.name}</Badge>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}

  <!-- Next step -->
  {#if nextStep}
    <div class="flex items-center justify-between bg-muted rounded-lg p-3 border">
      <p class="text-sm"><span class="mr-1">{nextStep.icon}</span> {nextStep.text}</p>
      <Button size="sm" href={nextStep.action}>{nextStep.label}</Button>
    </div>
  {/if}

  <!-- Stats -->
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <Card>
      <CardContent class="pt-5 pb-4">
        <p class="text-xs text-muted-foreground mb-1">💰 Money</p>
        <p class="text-2xl font-bold tracking-tight">€{Number(getProfile()?.money).toFixed(0)}</p>
        {#if lastTick && (Number(lastTick.revenue) > 0 || Number(lastTick.costs) > 0)}
          <p class="text-xs mt-1">
            {#if Number(lastTick.revenue) > 0}<span class="text-green-600">+€{Number(lastTick.revenue).toFixed(0)}</span>{/if}
            {#if Number(lastTick.costs) > 0}<span class="text-red-500 ml-1">-€{Number(lastTick.costs).toFixed(0)}</span>{/if}
          </p>
        {/if}
      </CardContent>
    </Card>
    <Card>
      <CardContent class="pt-5 pb-4">
        <p class="text-xs text-muted-foreground mb-1">⭐ Reputation</p>
        <p class="text-2xl font-bold tracking-tight">{Number(getProfile()?.reputation).toFixed(0)}</p>
        {#if lastTick && Number(lastTick.failedDeliveries) > 0}
          <p class="text-xs mt-1 text-orange-500">❌ {lastTick.failedDeliveries} failed</p>
        {/if}
      </CardContent>
    </Card>
    <Card>
      <CardContent class="pt-5 pb-4">
        <p class="text-xs text-muted-foreground mb-1">📦 Deliveries</p>
        <p class="text-2xl font-bold tracking-tight">{getProfile()?.totalDeliveries}</p>
        <p class="text-xs mt-1 text-muted-foreground">{availableOrders} pending</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="pt-5 pb-4">
        <p class="text-xs text-muted-foreground mb-1">🏍️ Fleet</p>
        <p class="text-2xl font-bold tracking-tight">{riders.length}</p>
        <p class="text-xs mt-1 text-muted-foreground">{idleRiders} idle · {deliveringRiders} out</p>
      </CardContent>
    </Card>
  </div>

  <!-- Active events -->
  {#if activeEvents.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each activeEvents as event}
        <div class="flex items-center gap-2 border rounded-full px-3 py-1.5 text-sm bg-yellow-500/5 border-yellow-500/20">
          <span>{event.emoji} {event.name}</span>
          <span class="text-xs font-mono text-muted-foreground">
            {formatRemaining(new Date(event.expiresAt as string).getTime())}
          </span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Active deliveries -->
  {#if activeDeliveries.length > 0}
    <Card>
      <CardHeader class="pb-2">
        <div class="flex items-center justify-between">
          <CardTitle class="text-base">🚴 Active Deliveries</CardTitle>
          <Button size="sm" variant="outline" href="/dashboard/orders">View all</Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        {#each activeDeliveries as order}
          {@const rider = riders.find(r => r.id === order.riderId)}
          {@const minutes = rider ? calculateDeliveryMinutes({ speed: Number(rider.speed), cityKnowledge: Number(rider.cityKnowledge) }, { distance: Number(order.distance) }) : 0}
          {@const etaMs = new Date(order.assignedAt as string).getTime() + minutes * 60 * 1000}
          {@const pct = deliveryProgress(order.assignedAt as string, minutes)}
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-sm">
              <span>🏍️ {rider?.name ?? '?'} → <span class="font-medium">€{Number(order.reward).toFixed(2)}</span></span>
              <span class="text-xs font-mono text-muted-foreground">{formatRemaining(etaMs)}</span>
            </div>
            <Progress value={pct} class="h-1.5" />
          </div>
        {/each}
      </CardContent>
    </Card>
  {/if}

  <!-- Fleet -->
  {#if riders.length > 0}
    <Card>
      <CardHeader class="pb-2">
        <div class="flex items-center justify-between">
          <CardTitle class="text-base">🏍️ Fleet</CardTitle>
          <Button size="sm" variant="outline" href="/dashboard/riders">Manage</Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-2">
        {#each riders as rider}
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm">{rider.name}</span>
                <Badge variant={rider.status === 'idle' ? 'default' : rider.status === 'delivering' ? 'secondary' : 'outline'} class="text-xs">
                  {rider.status === 'idle' ? 'idle' : rider.status === 'delivering' ? 'delivering' : 'resting'}
                </Badge>
              </div>
            </div>
            <div class="flex items-center gap-2 w-28">
              <Progress value={Number(rider.energy)} class="h-1.5" />
              <span class="text-xs text-muted-foreground w-8">{Number(rider.energy).toFixed(0)}%</span>
            </div>
          </div>
        {/each}
      </CardContent>
    </Card>
  {/if}
</div>
{/if}
