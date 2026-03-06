import "dotenv/config";
import { defineConfig } from "prisma/config";
import { join } from "path";

export default defineConfig({
  schema: join(process.cwd(), "prisma/schema.prisma"),

  migrations: {
    seed: "ts-node prisma/seed.ts",
  },

  datasource: {
    url: process.env.DATABASE_URL!,
  },
});