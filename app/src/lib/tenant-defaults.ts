import { prisma } from "@/lib/prisma"

/**
 * The business's own country and currency: what a new record gets when the
 * form or import file leaves them out (never an assumed "IN" / "INR").
 */
export async function getTenantDefaults(tenantId: string): Promise<{ countryCode: string; currencyCode: string }> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { countryCode: true, currencyCode: true } })
    if (!tenant) throw new Error("Workspace not found")
    return tenant
}
