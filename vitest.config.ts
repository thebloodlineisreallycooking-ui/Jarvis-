import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'web',
  test: { include: ['../tests/**/*.test.ts'] },
});
