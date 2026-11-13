import { describe, expect, it } from "vitest"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"

const appRoot = path.resolve(__dirname, "../../..")
const freePort = () =>
    new Promise<number>((resolve, reject) => {
        const srv = net.createServer()
        srv.on("error", reject)
        srv.listen(0, "127.0.0.1", () => {
            const { port } = srv.address() as net.AddressInfo
            srv.close(() => resolve(port))
        })
    })

/**
 * prisma/migrations must build exactly the database prisma/schema.prisma
 * describes: a schema change without a migration (or the other way round)
 * fails here. One known exception: the partial unique index on site_items
 * (slug where not null), which Prisma can't describe without a preview flag.
 */
describe("database migrations", () => {
    it("applied in order to an empty database, they match schema.prisma", async () => {
        const db = await PGlite.create()
        await db.exec("create schema if not exists auth; create table auth.users (id uuid primary key, email text);")
        const dir = path.join(appRoot, "prisma/migrations")
        const names = fs.readdirSync(dir).filter((d) => /^\d+_/.test(d)).sort((a, b) => parseInt(a) - parseInt(b))
        expect(names[0]).toBe("0_baseline")
        for (const name of names) await db.exec(fs.readFileSync(path.join(dir, name, "migration.sql"), "utf8"))

        const port = await freePort()
        const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" })
        await server.start()
        try {
            const { stdout } = await promisify(execFile)(
                process.execPath,
                [path.join(appRoot, "node_modules/prisma/build/index.js"), "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script"],
                { cwd: appRoot, env: { ...process.env, DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable` }, maxBuffer: 64 << 20 },
            )
            const differences = stdout.split("\n").filter((l) => l.trim() && !l.startsWith("--") && !l.includes('"uq_site_items_kind_slug"'))
            expect(differences).toEqual([])
        } finally {
            await server.stop()
            await db.close()
        }
    }, 120_000)
})
