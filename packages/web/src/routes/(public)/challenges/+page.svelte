<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent } from '$lib/components/ui/card'

  const stages = [
    { id: 1, name: 'Plain Sight', icon: '👀', skills: 'HTTP basics, DevTools, curl, JWT refresh', desc: 'Discover the API hiding in plain sight. Handle JWT token refresh.' },
    { id: 2, name: 'Signed & Sealed', icon: '🔐', skills: 'HMAC signing, JS code reading, bulk operations', desc: 'Find the HMAC key hidden in the frontend. Unlock bulk endpoints.' },
    { id: 3, name: 'Data Edge', icon: '📊', skills: 'Data-driven optimization, forecasting', desc: 'Use analytics endpoints to make smarter decisions than any human could.' },
    { id: 4, name: 'Minified Madness', icon: '🔀', skills: 'JS deobfuscation, AST analysis', desc: 'The frontend is obfuscated. Reconstruct the API map from hashed paths.' },
    { id: 5, name: 'Rate & Wait', icon: '⏱️', skills: 'Rate limit evasion, timing, batching', desc: 'Strict rate limits. Find the hidden pipeline endpoint. Add jitter.' },
  ]
</script>

<h1>🎯 Hacking Challenges</h1>

<p class="text-muted-foreground">
  Five progressive stages, each adding a new security layer. Discovery is easy — optimization is the real challenge.
</p>

<div class="not-prose grid gap-4 mt-6">
  {#each stages as stage}
    <a href="/challenges/stage{stage.id}" class="block no-underline">
      <Card class="hover:border-primary/40 transition-colors">
        <CardContent class="flex items-start gap-4 p-5">
          <span class="text-3xl">{stage.icon}</span>
          <div class="flex-1">
            <p class="font-bold text-lg">Stage {stage.id}: {stage.name}</p>
            <p class="text-sm text-muted-foreground mt-1">{stage.desc}</p>
            <p class="text-xs text-muted-foreground mt-2">Skills: {stage.skills}</p>
          </div>
        </CardContent>
      </Card>
    </a>
  {/each}
</div>
