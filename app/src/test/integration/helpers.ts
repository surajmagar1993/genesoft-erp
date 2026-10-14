import { prisma } from "@/lib/prisma"
import { signInAs } from "./fake-supabase"

type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "USER" | "VIEWER"

/** A fresh business with one signed-in user of the given role. */
export async function createTestTenant(opts: { country?: string; currency?: string; role?: Role; name?: string } = {}) {
    const tenant = await prisma.tenant.create({
        data: {
            name: opts.name ?? `Test Co ${Math.random().toString(36).slice(2, 8)}`,
            countryCode: opts.country ?? "IN",
            currencyCode: opts.currency ?? "INR",
            billingRegion: opts.country ?? "IN",
            settings: opts.country === "IN" || !opts.country ? { gstin: "27AAAAA0000A1Z5" } : {},
        },
    })
    const user = await addUser(tenant.id, opts.role ?? "ADMIN")
    return { tenant, user }
}

export async function addUser(tenantId: string, role: Role) {
    const id = crypto.randomUUID()
    const email = `${role.toLowerCase()}-${id.slice(0, 8)}@example.test`
    await prisma.$executeRaw`insert into auth.users (id, email, email_confirmed_at) values (${id}::uuid, ${email}, now())`
    await prisma.user.create({ data: { id, tenantId, email, role, fullName: `${role} User` } })
    return { id, email }
}

export function actAs(user: { id: string; email: string }) {
    signInAs({ id: user.id, email: user.email, user_metadata: {} })
}

export async function createCustomer(tenantId: string, name = "Acme Buyer") {
    return prisma.contact.create({ data: { tenantId, displayName: name } })
}
