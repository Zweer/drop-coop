import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/api/src/**/*.ts', 'packages/game/src/**/*.ts'],
      exclude: [
        '**/src/index.ts',
        '**/src/types.ts',
        '**/src/db/index.ts',
        '**/src/routes/oauth.ts',
        '**/src/models/**',
      ],
    },
  },
});
