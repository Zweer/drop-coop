<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { api, setToken, setRefreshToken } from '$lib/api'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { onMount } from 'svelte'

  let isLogin = $state(true)
  let username = $state('')
  let password = $state('')
  let error = $state('')
  let loading = $state(false)

  onMount(() => {
    // Handle OAuth callback — token passed via URL
    const params = new URLSearchParams($page.url.search)
    const token = params.get('token')
    const rt = params.get('refreshToken')
    const oauthError = params.get('error')

    if (token) {
      setToken(token)
      if (rt) setRefreshToken(rt)
      goto('/dashboard')
      return
    }
    if (oauthError) {
      error = oauthError === 'invalid_state' ? 'OAuth session expired, try again' : 'OAuth login failed'
    }
  })

  async function handleSubmit() {
    error = ''
    loading = true
    try {
      const fn = isLogin ? api.auth.login : api.auth.register
      const { token, refreshToken } = await fn(username, password)
      setToken(token)
      setRefreshToken(refreshToken)
      goto('/dashboard')
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong'
    } finally {
      loading = false
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center">
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-2xl">🚲 {isLogin ? 'Login' : 'Register'}</CardTitle>
      <CardDescription>
        {isLogin ? 'Sign in to your co-op' : 'Start your delivery co-op'}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- OAuth buttons -->
      <div class="space-y-2">
        <Button variant="outline" class="w-full" href="/api/auth/github">
          🐙 Continue with GitHub
        </Button>
        <Button variant="outline" class="w-full" href="/api/auth/google">
          🔍 Continue with Google
        </Button>
      </div>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t"></span>
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <!-- Username/password form -->
      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="space-y-2">
          <Label for="username">Username</Label>
          <Input id="username" bind:value={username} required minlength={3} maxlength={20} />
        </div>
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input id="password" type="password" bind:value={password} required minlength={6} />
        </div>
        {#if error}
          <p class="text-sm text-destructive">{error}</p>
        {/if}
        <Button type="submit" class="w-full" disabled={loading}>
          {loading ? '...' : isLogin ? 'Login' : 'Register'}
        </Button>
        <button
          type="button"
          class="w-full text-sm text-muted-foreground hover:underline"
          onclick={() => { isLogin = !isLogin; error = '' }}
        >
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </button>
      </form>
    </CardContent>
  </Card>
</div>
