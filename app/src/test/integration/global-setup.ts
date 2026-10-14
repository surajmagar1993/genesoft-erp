import { execFile } from "node:child_process"
import { promisify } from "node:util"
import net from "node:net"
import path from "node:path"
import type { TestProject } from "vitest/node"
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"

/**
 * Integration tests run against a throwaway in-memory Postgres (PGlite),
 * never the shared Supabase database. The schema comes from
 * prisma/schema.prisma; auth.users is a small stand-in for Supabase Auth.
 */
async function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const srv = net.createServer()
        srv.unref()
        srv.on("error", reject)
        srv.listen(0, "127.0.0.1", () => {
            const { port } = srv.address() as net.AddressInfo
            srv.close(() => resolve(port))
        })
    })
}

export default async function setup(project: TestProject) {
    const db = await PGlite.create()
    await db.exec(`
        create schema if not exists auth;
        create table auth.users (
            id uuid primary key,
            email text,
            raw_user_meta_data jsonb default '{}'::jsonb,
            email_confirmed_at timestamptz,
            deleted_at timestamptz,
            banned_until timestamptz,
            created_at timestamptz default now()
        );
    `)
    const port = await freePort()
    const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" })
    await server.start()
    const url = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`

    const appRoot = path.resolve(__dirname, "../../..")
    // Async: PGlite answers from this same process, so a sync exec would deadlock
    await promisify(execFile)(process.execPath, [path.join(appRoot, "node_modules/prisma/build/index.js"), "db", "push", "--accept-data-loss"], {
        cwd: appRoot,
        env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    })

    project.provide("databaseUrl", url)

    return async () => {
        await server.stop()
        await db.close()
    }
}

declare module "vitest" {
    export interface ProvidedContext {
        databaseUrl: string
    }
}
