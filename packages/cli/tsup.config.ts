import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    '@store-release-kit/core',
    '@store-release-kit/translators',
    '@store-release-kit/adapters',
  ],
});
