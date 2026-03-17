<script lang="ts">
  import { Card, CardContent } from '$lib/components/ui/card'

  const sections = [
    { href: '/process/specs', icon: '📋', title: 'Requirements & Specs', desc: 'How we defined what to build before writing a single line of code.' },
    { href: '/process/architecture', icon: '🏗️', title: 'Architecture Decisions', desc: 'The key technical choices and why they were made.' },
    { href: '/process/testing', icon: '🧪', title: 'Testing & Quality', desc: 'How the AI writes tests, catches its own bugs, and maintains 98% coverage.' },
    { href: '/process/workflow', icon: '🤖', title: 'Vibe Coding in Practice', desc: 'How a human + AI pair built this entire project through conversation.' },
  ]

  const stats = [
    { value: '3 days', label: 'from idea to v1' },
    { value: '325', label: 'automated tests' },
    { value: '97.95%', label: 'code coverage' },
    { value: '0', label: 'lines written by hand' },
  ]
</script>

<h1>⚙️ How We Built This</h1>

<p class="text-lg text-muted-foreground">
  drop-coop wasn't built the traditional way. No team of developers. No sprints. No Jira tickets.
</p>

<p class="text-muted-foreground">
  One person described what they wanted. An AI agent built it — writing code, running tests, fixing bugs, iterating.
  The entire project was built through <strong>conversation</strong>. This is sometimes called <em>vibe coding</em>:
  you describe the vibe, the AI writes the code.
</p>

<p class="text-muted-foreground">
  This section documents the entire process — what worked, what didn't, and what it means for the future of software development.
</p>

<div class="not-prose grid grid-cols-2 sm:grid-cols-4 gap-4 my-8">
  {#each stats as s}
    <div class="text-center p-4 rounded-lg border bg-card">
      <p class="text-2xl font-bold">{s.value}</p>
      <p class="text-xs text-muted-foreground">{s.label}</p>
    </div>
  {/each}
</div>

<div class="not-prose grid gap-4">
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
