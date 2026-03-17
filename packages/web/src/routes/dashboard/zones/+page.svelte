<script lang="ts">
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent } from '$lib/components/ui/card'
  import { Progress } from '$lib/components/ui/progress'
  import { getProfile } from '$lib/stores/profile.svelte'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  interface ZoneData {
    id: string
    slug: string
    name: string
    city: string
    demandLevel: number
    trafficDensity: number
    unlockCost: number
    requiredLevel: number
    hourlyFee: number
    unlocked: boolean
  }

  interface CityData {
    slug: string
    name: string
    archetype: string
    requiredLevel: number
    unlocked: boolean
    zones: ZoneData[]
  }

  const ARCHETYPE_EMOJI: Record<string, string> = {
    'dense-metro': '🏙️',
    'university-town': '🎓',
    'tourist-city': '🏛️',
    'industrial': '🏭',
  }

  let cities: CityData[] = $state([])
  let loading = $state(true)
  let busy = $state(false)

  async function refresh() {
    cities = await api.zones.list() as unknown as CityData[]
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
<div class="space-y-8">
  <div>
    <h2 class="text-2xl font-bold">🗺️ Cities & Zones</h2>
    <p class="text-sm text-muted-foreground">Expand to new cities and unlock zones to grow your co-op.</p>
  </div>

  {#each cities as city}
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <span class="text-xl">{ARCHETYPE_EMOJI[city.archetype] ?? '🏙️'}</span>
        <h3 class="text-lg font-bold">{city.name}</h3>
        {#if city.unlocked}
          <Badge variant="default">Active</Badge>
        {:else}
          <Badge variant="outline">🔒 Lv.{city.requiredLevel}</Badge>
        {/if}
      </div>

      {#if !city.unlocked}
        <p class="text-sm text-muted-foreground">Reach level {city.requiredLevel} to unlock {city.name}.</p>
      {/if}

      <div class="grid gap-4 sm:grid-cols-2">
        {#each city.zones as zone}
          {@const canUnlock = !zone.unlocked && city.unlocked && playerLevel >= zone.requiredLevel && playerMoney >= zone.unlockCost}
          {@const levelLocked = !zone.unlocked && (!city.unlocked || playerLevel < zone.requiredLevel)}
          <Card class={zone.unlocked ? 'border-primary/20' : levelLocked ? 'border-dashed' : ''}>
            <CardContent class="pt-6 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-lg">{zone.name}</span>
                {#if zone.unlocked}
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
                    <Progress value={zone.demandLevel * 10} class="h-1.5 w-16" aria-label="Zone demand level" />
                    <span class="text-xs">{zone.demandLevel}/10</span>
                  </div>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">Traffic</p>
                  <div class="flex items-center gap-2">
                    <Progress value={zone.trafficDensity * 10} class="h-1.5 w-16" aria-label="Zone traffic density" />
                    <span class="text-xs">{zone.trafficDensity}/10</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between text-xs text-muted-foreground">
                {#if zone.unlocked}
                  <span>Fee: €{zone.hourlyFee}/hr</span>
                {:else}
                  <span>Cost: €{zone.unlockCost}</span>
                {/if}
                <span>Req: Lv.{zone.requiredLevel}</span>
              </div>

              {#if !zone.unlocked}
                <Button
                  class="w-full"
                  size="sm"
                  disabled={!canUnlock || busy}
                  onclick={() => unlock(zone.id, zone.name)}
                >
                  {#if !city.unlocked}
                    Unlock {city.name} first (Lv.{city.requiredLevel})
                  {:else if playerLevel < zone.requiredLevel}
                    Reach Lv.{zone.requiredLevel} to unlock
                  {:else if playerMoney < zone.unlockCost}
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
  {/each}
</div>
{/if}
