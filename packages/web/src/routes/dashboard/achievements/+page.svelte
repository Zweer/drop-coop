<script lang="ts">
  import { api } from '$lib/api'
  import { Card, CardContent } from '$lib/components/ui/card'
  import { onMount } from 'svelte'

  type Achievement = {
    id: string
    name: string
    description: string
    icon: string
    unlocked: boolean
    unlockedAt: string | null
  }

  let achievements: Achievement[] = $state([])
  let loading = $state(true)

  onMount(async () => {
    achievements = await api.achievements.list()
    loading = false
  })

  let unlocked = $derived(achievements.filter((a) => a.unlocked))
  let locked = $derived(achievements.filter((a) => !a.unlocked))
</script>

<h2 class="text-2xl font-bold mb-4">🏅 Achievements</h2>

{#if loading}
  <p class="text-muted-foreground">Loading achievements...</p>
{:else}
  <p class="text-sm text-muted-foreground mb-6">
    {unlocked.length} / {achievements.length} unlocked
  </p>

  {#if unlocked.length > 0}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
      {#each unlocked as a}
        <Card>
          <CardContent class="flex items-center gap-3 p-4">
            <span class="text-2xl">{a.icon}</span>
            <div>
              <p class="font-medium">{a.name}</p>
              <p class="text-sm text-muted-foreground">{a.description}</p>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}

  {#if locked.length > 0}
    <h3 class="text-lg font-semibold mb-3 text-muted-foreground">Locked</h3>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each locked as a}
        <Card class="opacity-50">
          <CardContent class="flex items-center gap-3 p-4">
            <span class="text-2xl">🔒</span>
            <div>
              <p class="font-medium">{a.name}</p>
              <p class="text-sm text-muted-foreground">{a.description}</p>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}
{/if}
