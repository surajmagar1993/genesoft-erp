import { defineConfig } from "vitest/config"
import path from "node:path"

const alias = { "@": path.resolve(__dirname, "src") }

export default defineConfig({
    test: {
        // Integration files share one test database
        fileParallelism: false,
        projects: [
            {
                resolve: { alias },
                test: {
                    name: "unit",
                    environment: "node",
                    include: ["src/**/*.test.ts"],
                    exclude: ["src/**/*.int.test.ts", "**/node_modules/**"],
                },
            },
            {
                // Whole flows against a throwaway in-memory Postgres (see src/test/integration)
                resolve: { alias },
                test: {
                    name: "integration",
                    environment: "node",
                    include: ["src/**/*.int.test.ts"],
                    globalSetup: ["src/test/integration/global-setup.ts"],
                    setupFiles: ["src/test/integration/setup.ts"],
                    testTimeout: 30000,
                    hookTimeout: 120000,
                },
            },
        ],
    },
})
