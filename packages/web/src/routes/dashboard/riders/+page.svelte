<script lang="ts">
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Progress } from '$lib/components/ui/progress'
  import { onMount } from 'svelte'

  let riders: Record<string, unknown>[] = $state([])
  let pool: Record<string, unknown>[] = $state([])
  let showPool = $state(false)
  let message = $state('')
  let loading = $state(true)
  let hiring = $state(false)

  onMount(async () => {
    riders = await api.riders.list()
    loading = false
  })

  async function openPool() {
    pool = await api.riders.pool()
    showPool = true
  }

  async function hire(candidate: Record<string, unknown>) {
    if (hiring) return
    hiring = true
    try {
      await api.riders.hire(candidate)
      message = `✅ Hired ${candidate.name}!`
      riders = await api.riders.list()
      showPool = false
      pool = []
    } catch (e) {
      message = `❌ ${e instanceof Error ? e.message : 'Hire failed'}`
    } finally {
      hiring = false
    }
  }
</script>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <p class="text-muted-foreground">Loading riders...</p>
  </div>
{:else}
<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold">🏍️ Riders</h2>
      <p class="text-sm text-muted-foreground">Manage your delivery fleet. Hire riders, track their energy and status.</p>
    </div>
    <Button onclick={openPool}>
      {showPool ? 'Refresh pool' : 'Browse hiring pool'}
    </Button>
  </div>

  {#if message}
    <p class="text-sm p-3 rounded bg-muted">{message}</p>
  {/if}

  <!-- Hiring pool -->
  {#if showPool && pool.length > 0}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle class="text-base">📋 Hiring Pool</CardTitle>
        <CardDescription>Pick a rider to join your co-op. Better stats = higher cost.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        {#each pool as candidate}
          <div class="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors">
            <div class="space-y-1">
              <p class="font-medium">{candidate.name}</p>
              <div class="flex gap-3 text-xs text-muted-foreground">
                <span title="Speed — faster deliveries">⚡ Speed {candidate.speed}</span>
                <span title="Reliability — fewer failed deliveries">🎯 Reliability {candidate.reliability}</span>
                <span title="City Knowledge — shorter routes">🗺️ Knowledge {candidate.cityKnowledge}</span>
                <span title="Stamina — less energy drain">💪 Stamina {candidate.stamina}</span>
              </div>
              <p class="text-xs text-muted-foreground">Salary: €{candidate.salary}/hr</p>
            </div>
            <Button onclick={() => hire(candidate)} disabled={hiring}>
              {hiring ? '...' : `Hire for €${candidate.hireCost}`}
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
        <p class="text-sm text-muted-foreground mt-1">Hire your first rider from the pool above to start delivering orders.</p>
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
              <div>
                <p class="text-xs text-muted-foreground">Speed</p>
                <p class="font-bold">⚡ {rider.speed}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Reliability</p>
                <p class="font-bold">🎯 {rider.reliability}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Knowledge</p>
                <p class="font-bold">🗺️ {rider.cityKnowledge}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Stamina</p>
                <p class="font-bold">💪 {rider.stamina}</p>
              </div>
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
