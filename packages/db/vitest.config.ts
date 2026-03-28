import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    dir: 'src/schema/__tests__',
    include: ['**/*.test.ts'],
  },
});
