<script lang="ts">
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent } from '$lib/components/ui/card'
  import { Progress } from '$lib/components/ui/progress'
  import { getProfile } from '$lib/stores/profile.svelte'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  let zones: Record<string, unknown>[] = $state([])
  let loading = $state(true)
  let busy = $state(false)

  async function refresh() {
    zones = await api.zones.list()
  }

  onMount(async () => {
    await refresh()
    loading = false
  })

  async function unlock(zoneId: string, name: string) {
    if (busy) return
    busy = true
    try {
      const result = await api.zones.unlock(zoneId)
      toast.success(`${name} unlocked!`, { description: `-€${result.cost}` })
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unlock failed')
    } finally {
      busy = false
    }
  }

  let playerLevel = $derived(Number(getProfile()?.level ?? 1))
  let playerMoney = $derived(Number(getProfile()?.money ?? 0))
</script>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <p class="text-muted-foreground">Loading zones...</p>
  </div>
{:else}
<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold">🗺️ Zones</h2>
    <p class="text-sm text-muted-foreground">Unlock new zones to get more orders and expand your co-op.</p>
  </div>

  <div class="grid gap-4 sm:grid-cols-2">
    {#each zones as zone}
      {@const unlocked = zone.unlocked as boolean}
      {@const canUnlock = !unlocked && playerLevel >= Number(zone.requiredLevel) && playerMoney >= Number(zone.unlockCost)}
      {@const levelLocked = !unlocked && playerLevel < Number(zone.requiredLevel)}
      <Card class={unlocked ? 'border-primary/20' : levelLocked ? 'border-dashed' : ''}>
        <CardContent class="pt-6 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-lg">{zone.name}</span>
            {#if unlocked}
              <Badge variant="default">✅ Active</Badge>
            {:else if levelLocked}
              <Badge variant="outline">🔒 Lv.{zone.requiredLevel}</Badge>
            {:else}
              <Badge variant="secondary">Available</Badge>
            {/if}
          </div>

          <div class="grid grid-cols-2 gap-y-2 text-sm">
            <div>
              <p class="text-xs text-muted-foreground">Demand</p>
              <div class="flex items-center gap-2">
                <Progress value={Number(zone.demandLevel) * 10} class="h-1.5 w-16" aria-label="Zone demand level" />
                <span class="text-xs">{zone.demandLevel}/10</span>
              </div>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Traffic</p>
              <div class="flex items-center gap-2">
                <Progress value={Number(zone.trafficDensity) * 10} class="h-1.5 w-16" aria-label="Zone traffic density" />
                <span class="text-xs">{zone.trafficDensity}/10</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-muted-foreground">
            {#if unlocked}
              <span>Fee: €{zone.hourlyFee}/hr</span>
            {:else}
              <span>Cost: €{zone.unlockCost}</span>
            {/if}
            <span>Req: Lv.{zone.requiredLevel}</span>
          </div>

          {#if !unlocked}
            <Button
              class="w-full"
              size="sm"
              disabled={!canUnlock || busy}
              onclick={() => unlock(zone.id as string, zone.name as string)}
            >
              {#if levelLocked}
                Reach Lv.{zone.requiredLevel} to unlock
              {:else if playerMoney < Number(zone.unlockCost)}
                Need €{zone.unlockCost}
              {:else}
                Unlock for €{zone.unlockCost}
              {/if}
            </Button>
          {/if}
        </CardContent>
      </Card>
    {/each}
  </div>
</div>
{/if}
