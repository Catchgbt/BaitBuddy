import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('./src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Integration-Tests benötigen ein authentifiziertes Live-Backend und laufen
    // nicht im CI-Default. Mit `vitest run src/tests/integration` gezielt ausführen.
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/tests/integration/**',
      // Manuelles Test-Harness (exportiert ein Objekt, keine vitest-Suite)
      'src/components/ai/BiteDetectorWorkerFallback.test.jsx',
    ],
  },
});
