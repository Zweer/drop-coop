<script lang="ts">
  import '../app.css'
  import { Toaster } from '$lib/components/ui/sonner'
  import { initTheme } from '$lib/stores/theme.svelte'
  import { onMount } from 'svelte'

  let { children } = $props()

  onMount(initTheme)
</script>

{@render children?.()}
<Toaster richColors position="bottom-right" />
