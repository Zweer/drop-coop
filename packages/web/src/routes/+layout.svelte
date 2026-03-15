<script lang="ts">
  import '../app.css'
  import { initTheme } from '$lib/stores/theme.svelte'
  import { onMount } from 'svelte'

  let { children } = $props()

  onMount(initTheme)
</script>

{@render children?.()}
