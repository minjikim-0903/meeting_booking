import { config as loadEnv } from "dotenv"
import { defineConfig, env } from "prisma/config"

// The Prisma CLI doesn't follow Next.js's convention of auto-loading
// .env.local, so load it explicitly before defineConfig resolves env().
loadEnv({ path: ".env.local", quiet: true })

// Prisma 7's CLI (migrate/studio/introspect) reads its DB connection from
// here instead of the schema file. Use the unpooled DIRECT_URL for
// migrations — the pooled DATABASE_URL is what the app's runtime client
// (src/lib/prisma.ts, via @prisma/adapter-pg) connects with instead.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
})
