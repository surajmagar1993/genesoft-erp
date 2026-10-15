import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { getTenantAdminId } from "@/lib/get-tenant-id"
import { streamTenantExport } from "@/lib/tenant-data"
import { logTenantAudit } from "@/lib/tenant-audit"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** Settings → Data & Account → Export: a ZIP of all the workspace's data (admins only). */
export async function GET() {
    let tenantId: string
    try {
        tenantId = await getTenantAdminId()
    } catch {
        return NextResponse.json({ error: "Only workspace admins can export data" }, { status: 403 })
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, domain: true } })
    if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    try {
        await prisma.systemLog.create({
            data: { tenantId, level: "INFO", message: `Workspace data exported by ${user?.email || "an admin"}`, path: "/api/settings/export" },
        })
    } catch (err) {
        console.error("export: log failed", err)
    }

    const slug = (tenant.domain || tenant.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace"
    const filename = `genesoft-export-${slug}-${new Date().toISOString().slice(0, 10)}.zip`
    await logTenantAudit(tenantId, "DATA_EXPORT", { target: { type: "TENANT", id: tenantId } })
    return new Response(streamTenantExport(tenantId, tenant.name), {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    })
}
