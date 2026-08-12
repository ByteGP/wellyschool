/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
  },
});
