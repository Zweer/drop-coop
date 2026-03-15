<script lang="ts">
  import { goto } from '$app/navigation'
  import { getToken } from '$lib/api'
  import { Button } from '$lib/components/ui/button'
  import { onMount } from 'svelte'

  onMount(() => {
    if (getToken()) goto('/dashboard')
  })

  const features = [
    { icon: '🏍️', title: 'Build your fleet', desc: 'Hire riders, upgrade their stats, and manage energy.' },
    { icon: '📦', title: 'Deliver & earn', desc: 'Accept orders, assign riders, and watch the money roll in.' },
    { icon: '🗺️', title: 'Expand your territory', desc: 'Unlock new zones across Milan as you level up.' },
    { icon: '🌧️', title: 'Survive events', desc: 'Storms, festivals, and sales shake up your strategy.' },
    { icon: '🤖', title: 'Automate everything', desc: 'Discover the API. Write bots. Your co-op runs while you sleep.' },
    { icon: '🏆', title: 'Compete', desc: 'Climb the leaderboard. Prove your co-op is the best in Milan.' },
  ]
</script>

<div class="flex min-h-screen flex-col items-center justify-center px-4">
  <div class="text-center space-y-6 max-w-lg">
    <h1 class="text-5xl font-bold">🚲 drop-coop</h1>
    <p class="text-xl text-muted-foreground">Your delivery co-op, your rules.</p>
    <p class="text-sm text-muted-foreground">
      A delivery tycoon game with a hidden hacking layer.
      Play by clicking — or reverse-engineer the API and let your bot do the work.
    </p>
    <div class="flex gap-4 justify-center">
      <Button href="/login">Play now</Button>
      <Button variant="outline" href="https://github.com/Zweer/drop-coop">GitHub</Button>
    </div>
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-12 max-w-xl w-full">
    {#each features as f}
      <div class="text-center space-y-1 p-3">
        <p class="text-2xl">{f.icon}</p>
        <p class="font-medium text-sm">{f.title}</p>
        <p class="text-xs text-muted-foreground">{f.desc}</p>
      </div>
    {/each}
  </div>
</div>
