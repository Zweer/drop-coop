<script lang="ts">
  import { api } from '$lib/api'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent } from '$lib/components/ui/card'
  import { getProfile } from '$lib/stores/profile.svelte'
  import { onMount } from 'svelte'

  type Board = 'tycoon' | 'hackers' | 'explorers'

  let board: Board = $state('tycoon')
  let entries: Record<string, unknown>[] = $state([])
  let loading = $state(true)

  const boards: { key: Board; icon: string; label: string; description: string }[] = [
    { key: 'tycoon', icon: '🏆', label: 'Tycoon', description: 'Top co-ops by total profit' },
    { key: 'hackers', icon: '🤖', label: 'Hacker', description: 'API users ranked by profit' },
    { key: 'explorers', icon: '🔍', label: 'Explorer', description: 'Most API endpoints discovered' },
  ]

  async function loadBoard(b: Board) {
    board = b
    loading = true
    if (b === 'tycoon') entries = await api.leaderboard.top()
    else if (b === 'hackers') entries = await api.leaderboard.hackers()
    else entries = await api.leaderboard.explorers()
    loading = false
  }

  onMount(() => loadBoard('tycoon'))

  const username = $derived(getProfile()?.username)
  const currentBoard = $derived(boards.find((b) => b.key === board)!)
  const isExplorer = $derived(board === 'explorers')
</script>

<div class="space-y-4">
  <div class="flex gap-2">
    {#each boards as b}
      <Button variant={board === b.key ? 'default' : 'outline'} size="sm" onclick={() => loadBoard(b.key)}>
        {b.icon} {b.label}
      </Button>
    {/each}
  </div>

  <p class="text-sm text-muted-foreground">{currentBoard.description}</p>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <p class="text-muted-foreground">Loading...</p>
    </div>
  {:else if entries.length === 0}
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
              {#if isExplorer}
                <th class="p-3 text-right">Endpoints</th>
              {:else}
                <th class="p-3 text-right hidden sm:table-cell">Level</th>
                <th class="p-3 text-right hidden sm:table-cell">Deliveries</th>
                <th class="p-3 text-right">Profit</th>
              {/if}
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
                {#if isExplorer}
                  <td class="p-3 text-right font-mono">{entry.endpointsDiscovered}</td>
                {:else}
                  <td class="p-3 text-right text-muted-foreground hidden sm:table-cell">Lv.{entry.level}</td>
                  <td class="p-3 text-right text-muted-foreground hidden sm:table-cell">{entry.totalDeliveries}</td>
                  <td class="p-3 text-right font-mono">€{Number(entry.totalProfit).toFixed(0)}</td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </CardContent>
    </Card>
  {/if}
</div>
