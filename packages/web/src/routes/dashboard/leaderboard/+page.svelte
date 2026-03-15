<script lang="ts">
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { getProfile } from '$lib/stores/profile.svelte'
  import { onMount } from 'svelte'

  let entries: Record<string, unknown>[] = $state([])
  let loading = $state(true)

  onMount(async () => {
    entries = await api.leaderboard.top()
    loading = false
  })

  const username = $derived(getProfile()?.username)
</script>

{#if loading}
  <div class="flex items-center justify-center py-12">
    <p class="text-muted-foreground">Loading leaderboard...</p>
  </div>
{:else}
<div class="space-y-4">
  <h2 class="text-xl font-bold">🏆 Tycoon Leaderboard</h2>
  <p class="text-sm text-muted-foreground">Top co-ops ranked by total profit.</p>

  {#if entries.length === 0}
    <Card>
      <CardContent class="pt-6">
        <p class="text-muted-foreground text-sm">No players yet. Be the first!</p>
      </CardContent>
    </Card>
  {:else}
    <Card>
      <CardContent class="p-0 overflow-x-auto">
        <table class="w-full text-sm min-w-[400px]">
          <thead>
            <tr class="border-b text-left text-muted-foreground">
              <th class="p-3 w-12">#</th>
              <th class="p-3">Player</th>
              <th class="p-3 text-right hidden sm:table-cell">Level</th>
              <th class="p-3 text-right hidden sm:table-cell">Deliveries</th>
              <th class="p-3 text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {#each entries as entry}
              {@const isMe = entry.username === username}
              <tr class="border-b last:border-0 {isMe ? 'bg-primary/5 font-medium' : ''}">
                <td class="p-3">
                  {#if entry.rank === 1}🥇
                  {:else if entry.rank === 2}🥈
                  {:else if entry.rank === 3}🥉
                  {:else}{entry.rank}
                  {/if}
                </td>
                <td class="p-3">
                  {entry.username}
                  {#if isMe}<Badge variant="outline" class="ml-2 text-xs">You</Badge>{/if}
                </td>
                <td class="p-3 text-right text-muted-foreground hidden sm:table-cell">Lv.{entry.level}</td>
                <td class="p-3 text-right text-muted-foreground hidden sm:table-cell">{entry.totalDeliveries}</td>
                <td class="p-3 text-right font-mono">€{Number(entry.totalProfit).toFixed(0)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </CardContent>
    </Card>
  {/if}
</div>
{/if}
