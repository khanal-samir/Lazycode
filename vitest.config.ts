import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["**/*.unit.test.ts"],
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: "integration",
          include: ["**/*.integration.test.ts"],
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: "db",
          include: ["**/*.db.test.ts"],
          fileParallelism: false,
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: "sandbox",
          include: ["**/*.sandbox.test.ts"],
          fileParallelism: false,
          passWithNoTests: true,
        },
      },
    ],
  },
});
