import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Only pure-function tests for now. Anything that would require
// Supabase / Next runtime lives in manual smoke tests until we
// decide a testing strategy for integration.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(new URL('.', import.meta.url))),
    },
  },
})
