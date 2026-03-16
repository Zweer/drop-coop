<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Badge } from '$lib/components/ui/badge'
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold">🔌 API</h2>
    <p class="text-sm text-muted-foreground">
      You've unlocked the API tab. Everything the frontend does goes through real endpoints.
    </p>
  </div>

  <Card>
    <CardHeader>
      <CardTitle class="text-base">Getting Started</CardTitle>
    </CardHeader>
    <CardContent class="space-y-3 text-sm">
      <p>Open your browser's DevTools (<kbd class="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">F12</kbd> → Network tab) and watch what happens when you click around.</p>
      <p>Try reproducing a request with <code class="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">curl</code>:</p>
      <pre class="bg-muted rounded p-3 text-xs overflow-x-auto">GET /api/orders/available</pre>
      <p>Your bot plays while you sleep. 🤖</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle class="text-base">Endpoints</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2 text-sm font-mono">
      {#each [
        { method: 'POST', path: '/api/auth/register', stage: 1 },
        { method: 'POST', path: '/api/auth/login', stage: 1 },
        { method: 'POST', path: '/api/auth/refresh', stage: 1 },
        { method: 'GET', path: '/api/player/profile', stage: 1 },
        { method: 'GET', path: '/api/riders', stage: 1 },
        { method: 'GET', path: '/api/riders/pool', stage: 1 },
        { method: 'POST', path: '/api/riders/hire', stage: 1 },
        { method: 'POST', path: '/api/riders/:id/upgrade', stage: 1 },
        { method: 'POST', path: '/api/riders/:id/rest', stage: 1 },
        { method: 'GET', path: '/api/orders', stage: 1 },
        { method: 'GET', path: '/api/orders/available', stage: 1 },
        { method: 'POST', path: '/api/orders/assign', stage: 1 },
        { method: 'GET', path: '/api/zones', stage: 1 },
        { method: 'POST', path: '/api/zones/unlock', stage: 1 },
        { method: 'GET', path: '/api/events', stage: 1 },
        { method: 'GET', path: '/api/leaderboard', stage: 1 },
        { method: 'POST', path: '/api/batch/assign', stage: 2 },
        { method: 'POST', path: '/api/batch/upgrade', stage: 2 },
        { method: 'GET', path: '/api/analytics/???', stage: 3 },
      ] as item}
        <div class="flex items-center gap-2">
          <Badge variant={item.method === 'GET' ? 'outline' : 'secondary'} class="w-14 justify-center text-xs">{item.method}</Badge>
          <span class="text-muted-foreground">{item.path}</span>
          {#if item.stage > 1}
            <Badge variant="default" class="text-[10px]">Stage {item.stage}</Badge>
          {/if}
        </div>
      {/each}
      <p class="text-muted-foreground text-xs pt-2">Some endpoints are missing from this list. Can you find them? 🔍</p>
    </CardContent>
  </Card>
</div>
