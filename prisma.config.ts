import { defineConfig } from "prisma/config";

export default defineConfig({
  migrations: {
    seed: "ts-node --compiler-options '{\"module\":\"commonjs\"}' prisma/seed.ts",
  },

  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
