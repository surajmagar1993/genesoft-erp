// A throwaway in-memory Postgres (PGlite) with the app's schema, for running the
// built app in CI without the shared database. Usage: node e2e/ci-db.mjs [port]
// (keeps running; CI starts it in the background before `next build`).
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const port = Number(process.argv[2] || 55432)
const db = await PGlite.create()
await db.exec("create schema if not exists auth; create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, email_confirmed_at timestamptz, deleted_at timestamptz, banned_until timestamptz, created_at timestamptz default now());")
const { stdout } = await promisify(execFile)(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema", "prisma/schema.prisma", "--script"], { maxBuffer: 64 << 20 })
await db.exec(stdout)
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", connectionQueueTimeout: 120_000 })
await server.start()
console.log(`ci-db ready on ${port}`)
