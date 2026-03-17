<script lang="ts">
  import { Card, CardContent } from '$lib/components/ui/card'

  const sections = [
    { href: '/process/specs', icon: '📋', title: 'Requirements & Specs', desc: 'How we defined what to build — requirements, game design, business plan.' },
    { href: '/process/architecture', icon: '🏗️', title: 'Architecture & Steering', desc: 'Tech stack decisions, code style, project structure, and steering docs.' },
    { href: '/process/testing', icon: '🧪', title: 'Testing Strategy', desc: 'Unit tests, E2E tests, smoke tests, coverage targets, and the testing philosophy.' },
    { href: '/process/workflow', icon: '🤖', title: 'AI-Assisted Workflow', desc: 'How a human + AI pair built this project — the iterative process, decisions, and results.' },
  ]
</script>

<h1>⚙️ How We Built This</h1>

<p class="text-muted-foreground">
  drop-coop was built as a proof of concept for AI-assisted development. A human provides direction, makes decisions, and reviews — an AI agent does the heavy lifting: writing code, running tests, fixing issues, iterating.
</p>

<p class="text-muted-foreground">
  This section documents the entire process — from requirements to deployment.
</p>

<div class="not-prose grid gap-4 mt-6">
  {#each sections as s}
    <a href={s.href} class="block no-underline">
      <Card class="hover:border-primary/40 transition-colors">
        <CardContent class="flex items-start gap-4 p-5">
          <span class="text-3xl">{s.icon}</span>
          <div>
            <p class="font-bold text-lg">{s.title}</p>
            <p class="text-sm text-muted-foreground mt-1">{s.desc}</p>
          </div>
        </CardContent>
      </Card>
    </a>
  {/each}
</div>
