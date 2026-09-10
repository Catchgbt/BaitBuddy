import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Separate von vite.config.js: Terser/Chunk-Konfiguration wird von Vitest nicht
// benötigt und würde den Testlauf nur verlangsamen.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve('./src'),
      '@shared': resolve('./shared'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Nur eigener Quellcode; Tests, Setup, Vendor-UI und generierte Artefakte
      // verwässern die Aussage sonst.
      include: ['src/**/*.{js,jsx}', 'backend/src/**/*.js', 'shared/**/*.js'],
      exclude: [
        '**/*.test.{js,jsx}',
        'src/test/**',
        'backend/test/**',
        'src/components/ui/**',
        'src/**/*.d.ts',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: ['src/**/*.test.{js,jsx,ts,tsx}'],
          setupFiles: ['src/test/setup.js'],
        },
      },
      {
        extends: true,
        test: {
          // Geteilte, umgebungsfreie Logik (shared/) — läuft in Node, weil sie
          // weder DOM noch Node-APIs braucht.
          name: 'shared',
          environment: 'node',
          include: ['shared/**/*.test.js'],
        },
      },
      {
        extends: true,
        test: {
          name: 'backend',
          environment: 'node',
          include: ['backend/**/*.test.js'],
          setupFiles: ['backend/test/setup.js'],
        },
      },
    ],
  },
});
