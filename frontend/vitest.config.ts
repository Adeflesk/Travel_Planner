import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: 'node',
        globals: true,
        // Co-located test files alongside lib sources
        include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['lib/**/*.ts'],
            exclude: ['lib/**/*.test.ts', 'lib/types.ts', 'lib/help-content.ts'],
        },
    },
});
