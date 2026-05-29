import { defineConfig } from "prisma/config";

export default defineConfig({
  migrations: {
    seed: "ts-node --project tsconfig.json prisma/seed.ts",
  },

  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
