import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    proxy: process.env.USE_PGLITE
      ? undefined
      : {
          '/api': 'http://localhost:3000',
        },
  },
});
