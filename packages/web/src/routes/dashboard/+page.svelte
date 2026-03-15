<script lang="ts">
  import { calculateDeliveryMinutes } from '@drop-coop/game'
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Progress } from '$lib/components/ui/progress'
  import { getProfile, setProfile } from '$lib/stores/profile.svelte'
  import { usePoll, useTick } from '$lib/stores/tick.svelte'
  import { toast } from 'svelte-sonner'
  import { onMount } from 'svelte'

  let riders: Record<string, unknown>[] = $state([])
  let orders: Record<string, unknown>[] = $state([])
  let allOrders: Record<string, unknown>[] = $state([])
  let activeEvents: Record<string, unknown>[] = $state([])
  let loading = $state(true)

  // Track previous state for micro-feedback
  let prevAssigned = new Map<string, { riderId: string; reward: number }>()
  let prevEventIds = new Set<string>()
  let prevTotalDeliveries = -1

  const clock = useTick()

  async function refresh() {
    try {
      const [p, r, o, all] = await Promise.all([
        api.player.profile(),
        api.riders.list(),
        api.orders.available(),
        api.orders.list(),
      ])

      // Micro-feedback: diff state before updating
      if (!loading) {
        const newEvents = (p.events ?? []) as Record<string, unknown>[]
        for (const e of newEvents) {
          if (!prevEventIds.has(e.id as string)) {
            toast.info(`${e.emoji} ${e.name} started!`, { description: e.description as string })
          }
        }

        // First delivery celebration
        const newTotal = Number(p.totalDeliveries)
        if (prevTotalDeliveries === 0 && newTotal > 0) {
          toast.success('🎉 First delivery completed!', { description: 'Your co-op is up and running. Keep going!' })
        }

        for (const order of all) {
          const prev = prevAssigned.get(order.id as string)
          if (!prev) continue
          const rider = r.find((rd: Record<string, unknown>) => rd.id === prev.riderId)
          const name = (rider?.name ?? 'Rider') as string
          if (order.status === 'delivered') {
            toast.success(`${name} delivered! +€${prev.reward.toFixed(2)}`)
          } else if (order.status === 'failed') {
            toast.error(`${name} failed a delivery`)
          }
        }
      }

      setProfile(p)
      riders = r
      orders = o
      allOrders = all
      activeEvents = (p.events ?? []) as Record<string, unknown>[]

      // Snapshot for next diff
      prevAssigned = new Map(
        all.filter((o: Record<string, unknown>) => o.status === 'assigned')
          .map((o: Record<string, unknown>) => [o.id as string, { riderId: o.riderId as string, reward: Number(o.reward) }])
      )
      prevEventIds = new Set(activeEvents.map(e => e.id as string))
      prevTotalDeliveries = Number(getProfile()?.totalDeliveries)
    } catch {
      // Silently ignore refresh errors — stale data is fine
    }
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

  let isNewPlayer = $derived(Number(getProfile()?.totalDeliveries) === 0)

  let nextStep = $derived.by(() => {
    if (riders.length === 0) return { text: 'Hire your first rider to start delivering!', action: '/dashboard/riders', label: 'Hire a rider', icon: '🏍️', step: isNewPlayer ? '1/3' : null }
    if (availableOrders > 0 && idleRiders > 0) return { text: `${availableOrders} orders waiting, ${idleRiders} riders idle — assign them!`, action: '/dashboard/orders', label: 'Assign orders', icon: '📦', step: isNewPlayer ? '2/3' : null }
    if (idleRiders === 0 && deliveringRiders > 0) return { text: isNewPlayer ? 'Your rider is out! Wait for the delivery to complete.' : 'All riders out delivering. Hire more to scale up!', action: isNewPlayer ? '/dashboard' : '/dashboard/riders', label: isNewPlayer ? 'Wait here' : 'Hire more', icon: '⏳', step: isNewPlayer ? '3/3' : null }
    if (availableOrders === 0) return { text: 'No orders right now. They arrive over time — check back soon!', action: '/dashboard/orders', label: 'Check orders', icon: '😴', step: null }
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
  <!-- Welcome / Progression -->
  {#if isNewPlayer && riders.length === 0}
    <Card class="border-primary/20 bg-primary/5">
      <CardContent class="py-5">
        <p class="text-lg font-bold mb-1">🚲 Welcome to your co-op!</p>
        <p class="text-sm text-muted-foreground">
          You're the new manager of a delivery cooperative in Milan.
          Hire riders, assign orders, and grow your business. Let's get started!
        </p>
      </CardContent>
    </Card>
  {:else if progression}
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
      <p class="text-sm">
        {#if nextStep.step}<Badge variant="outline" class="mr-2 text-xs">Step {nextStep.step}</Badge>{/if}
        <span class="mr-1">{nextStep.icon}</span> {nextStep.text}
      </p>
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
        {:else}
          <p class="text-xs mt-1 text-muted-foreground">Total: €{Number(getProfile()?.totalProfit).toFixed(0)}</p>
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
