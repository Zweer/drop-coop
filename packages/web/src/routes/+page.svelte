<script lang="ts">
  import { goto } from '$app/navigation'
  import { getToken } from '$lib/api'
  import { Button } from '$lib/components/ui/button'
  import { onMount } from 'svelte'

  onMount(() => {
    if (getToken()) goto('/dashboard')
  })
</script>

<div class="flex min-h-screen items-center justify-center">
  <div class="text-center space-y-6 max-w-md px-4">
    <h1 class="text-5xl font-bold">🚲 drop-coop</h1>
    <p class="text-xl text-muted-foreground">Your delivery co-op, your rules.</p>
    <p class="text-sm text-muted-foreground">
      Manage a delivery rider cooperative. Hire riders, accept orders, grow your business.
      As your co-op scales, you might want to automate...
    </p>
    <div class="flex gap-4 justify-center">
      <Button href="/login">Play now</Button>
      <Button variant="outline" href="https://github.com/Zweer/drop-coop">GitHub</Button>
    </div>
  </div>
</div>
