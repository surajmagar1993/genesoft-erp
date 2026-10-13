"use server"

import { prisma } from "../../../lib/prisma"
import { clearPlatformGateCache } from "@/lib/platform-security"
import { stripe } from "@/lib/stripe"
import { ensureStripePrice, type PaidPlan } from "@/lib/stripe-plans"
import { annualFromMonthly } from "@/lib/plan-pricing"
import { calculatePlatformMrr } from "@/lib/platform-mrr"
import { sendSystemEmail } from "@/lib/system-email"
import { toActionResult } from "@/lib/action-result"
// import { type Role } from "@prisma/client"
import { createClient } from "../../../lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Ensures the current user is a SUPER_ADMIN.
 * Throws an error if not authorized.
 */
async function ensureSuperAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // Use Supabase client for simple role check (works over HTTPS, more resilient than TCP).
    // "*" so a database without the is_active column still works.
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || (profile as any).role !== "SUPER_ADMIN" || (profile as any).is_active === false) {
        throw new Error("Forbidden: Super Admin access required")
    }

    return user
}

const PLANS = ["FREE", "BASIC", "PRO", "ENTERPRISE"] as const
const ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER", "VIEWER"] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function assertPlan(plan: unknown): asserts plan is (typeof PLANS)[number] {
    if (!PLANS.includes(plan as (typeof PLANS)[number])) throw new Error("Invalid plan")
}

function assertEmail(email: string | null | undefined) {
    if (email && !EMAIL_RE.test(email.trim())) throw new Error("Invalid email address")
}

/** Throws if the domain is already used by another tenant. */
async function assertDomainFree(domain: string, exceptTenantId?: string) {
    const existing = await prisma.tenant.findUnique({ where: { domain }, select: { id: true } })
    if (existing && existing.id !== exceptTenantId) {
        throw new Error(`Domain '${domain}' is already assigned to another business.`)
    }
}

/**
 * Internal helper to log high-impact admin actions.
 */
async function logAdminAction(action: string, targetId?: string, targetType?: string, metadata: any = {}) {
    try {
        const user = await ensureSuperAdmin()
        await prisma.adminAuditLog.create({
            data: {
                adminId: user.id,
                adminEmail: user.email || "unknown",
                action,
                targetId,
                targetType,
                metadata: metadata || {}
            }
        })
    } catch (error) {
        console.error("Failed to log admin action:", error)
    }
}

export async function getPlatformStats() {
    await ensureSuperAdmin()

    // Resilient data fetching via Prisma client
    const [
        totalTenants,
        totalUsers,
        activeTrials,
        openTickets,
        recentTenants,
        tenantPlans
    ] = await Promise.all([
        prisma.tenant.count(),
        prisma.user.count(),
        prisma.tenant.count({
            where: {
                isTrial: true,
                isActive: true
            }
        }),
        prisma.supportTicket.count({
            where: {
                status: "OPEN"
            }
        }),
        prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                plan: true,
                createdAt: true,
                isTrial: true
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 5
        }),
        prisma.tenant.findMany({
            select: {
                plan: true,
                isActive: true,
                isTrial: true,
                currencyCode: true,
                settings: true
            }
        })
    ])

    // Monthly recurring revenue (INR) from paying, active tenants at live prices
    const { mrr: revenueEst } = await calculatePlatformMrr(tenantPlans || [])

    return {
        totalTenants,
        totalUsers,
        activeTrials,
        openTickets,
        recentTenants: (recentTenants || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            plan: t.plan,
            createdAt: t.createdAt,
            isTrial: t.isTrial
        })),
        revenueEst
    }
}

export async function getTenants(params: {
    page?: number,
    limit?: number,
    search?: string,
    plan?: string,
    status?: string
} = {}) {
    const { page = 1, limit = 25, search, plan, status } = params
    await ensureSuperAdmin()

    const where: any = {}

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
        ]
    }
    if (plan && plan !== "ALL") {
        where.plan = plan as any
    }
    if (status && status !== "ALL") {
        where.isActive = status === "ACTIVE"
    }

    try {
        const [tenants, total] = await Promise.all([
            prisma.tenant.findMany({
                where,
                include: {
                    users: {
                        select: {
                            id: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.tenant.count({ where })
        ])
        return { tenants, total, page, limit }
    } catch (error) {
        console.error("getTenants error:", error)
        return { tenants: [], total: 0, page, limit }
    }
}

export async function getAdminAuditLogs(page: number = 1, limit: number = 50) {
    await ensureSuperAdmin()
    
    return await prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
    })
}

async function _updateTenantPlan(tenantId: string, plan: any) {
    await ensureSuperAdmin()
    assertPlan(plan)

    const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: { plan, isTrial: false }
    })
    
    await logAdminAction("TENANT_PLAN_UPDATE", tenantId, "TENANT", { newPlan: plan })
    
    revalidatePath('/admin/tenants')
    return updated
}

async function _extendTenantTrial(tenantId: string, days: number) {
    await ensureSuperAdmin()

    if (!Number.isInteger(days) || days < 1 || days > 365) {
        throw new Error("Extend the trial by 1 to 365 days")
    }

    const tenant: any = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { trialEndsAt: true }
    })
    if (!tenant) throw new Error("Tenant not found")

    // An already-expired trial is extended from today, not from its old end date
    const now = new Date()
    const currentEnd = tenant.trialEndsAt && tenant.trialEndsAt > now ? tenant.trialEndsAt : now
    const newEnd = new Date(currentEnd)
    newEnd.setDate(newEnd.getDate() + days)

    const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: { 
            trialEndsAt: newEnd,
            isTrial: true 
        }
    })
    
    await logAdminAction("TENANT_TRIAL_EXTEND", tenantId, "TENANT", { extendedByDays: days, newEndDate: newEnd })
    
    revalidatePath('/admin/tenants')
    return updated
}

async function _toggleTenantStatus(tenantId: string, isActive: boolean) {
    await ensureSuperAdmin()

    const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive }
    })
    
    await logAdminAction(isActive ? "TENANT_ACTIVATE" : "TENANT_SUSPEND", tenantId, "TENANT")

    revalidatePath('/admin/tenants')
    revalidatePath(`/admin/tenants/${tenantId}`)
    return updated
}

/**
 * Fetch full 360° tenant profile including user list, aggregate usage, and audit history.
 */
export async function getTenantById(tenantId: string) {
    await ensureSuperAdmin()

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                users: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                        phone: true,
                        isActive: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: "desc" }
                },
                _count: {
                    select: {
                        invoices: true,
                        quotes: true,
                        salesOrders: true,
                        contacts: true,
                        products: true,
                        bills: true,
                        supportTickets: true,
                        users: true
                    }
                }
            }
        })

        if (!tenant) return null

        // Calculate revenue estimate from invoices
        const revenueAgg = await prisma.invoice.aggregate({
            where: { tenantId },
            _sum: { total: true }
        })

        // Fetch recent audit logs for this tenant
        const auditLogs = await prisma.adminAuditLog.findMany({
            where: { targetId: tenantId },
            orderBy: { createdAt: "desc" },
            take: 10
        })

        return {
            ...tenant,
            totalRevenue: Number(revenueAgg._sum.total || 0),
            auditLogs
        }
    } catch (error) {
        console.error("getTenantById error:", error)
        return null
    }
}

/**
 * Super Admin manual tenant creation and provisioning with automatic Chart of Accounts seeding.
 */
async function _createTenant(data: {
    name: string
    email?: string
    domain?: string
    phone?: string
    countryCode?: string
    currencyCode?: string
    plan?: any
    trialDays?: number
    seedAccounts?: boolean
}) {
    await ensureSuperAdmin()

    const {
        name,
        email,
        domain,
        phone,
        countryCode = "IN",
        currencyCode = "INR",
        plan = "PRO",
        trialDays = 15,
        seedAccounts = true
    } = data

    if (!name || !name.trim()) {
        throw new Error("Business name is required")
    }
    assertPlan(plan)
    assertEmail(email)
    if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365) {
        throw new Error("Trial must be 0 to 365 days")
    }
    if (!/^[A-Z]{2}$/.test(countryCode) || !/^[A-Z]{3}$/.test(currencyCode)) {
        throw new Error("Invalid country or currency code")
    }

    if (domain && domain.trim()) {
        await assertDomainFree(domain.trim().toLowerCase())
    }

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + (trialDays || 15))

    const tenant = await prisma.tenant.create({
        data: {
            name: name.trim(),
            email: email ? email.trim().toLowerCase() : null,
            domain: domain ? domain.trim().toLowerCase() : null,
            phone: phone ? phone.trim() : null,
            countryCode,
            currencyCode,
            plan,
            isTrial: trialDays > 0,
            trialEndsAt: trialDays > 0 ? trialEndsAt : null,
            billingRegion: countryCode,
            settings: {
                fiscalYearStart: countryCode === "IN" ? 4 : 1,
                dateFormat: "DD/MM/YYYY"
            }
        }
    })

    if (seedAccounts) {
        const defaultAccounts = [
            // ASSETS (1xxx)
            { tenantId: tenant.id, code: "1000", name: "Assets", type: "ASSET" as const, isGroup: true, description: "All asset accounts", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "1100", name: "Current Assets", type: "ASSET" as const, isGroup: true, currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "1110", name: "Cash", type: "ASSET" as const, isGroup: false, description: "Cash in hand", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "1120", name: "Bank", type: "ASSET" as const, isGroup: false, description: "Bank accounts", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "1200", name: "Accounts Receivable", type: "ASSET" as const, isGroup: false, description: "Money owed by customers", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "1300", name: "Inventory", type: "ASSET" as const, isGroup: false, description: "Stock on hand", currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "1400", name: "Prepaid Expenses", type: "ASSET" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "1500", name: "Fixed Assets", type: "ASSET" as const, isGroup: true, description: "Property, plant & equipment", currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "1510", name: "Furniture & Fixtures", type: "ASSET" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "1520", name: "Office Equipment", type: "ASSET" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },

            // LIABILITIES (2xxx)
            { tenantId: tenant.id, code: "2000", name: "Liabilities", type: "LIABILITY" as const, isGroup: true, description: "All liability accounts", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "2100", name: "Accounts Payable", type: "LIABILITY" as const, isGroup: false, description: "Money owed to suppliers", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "2200", name: "GST Payable", type: "LIABILITY" as const, isGroup: true, currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "2210", name: "CGST Payable", type: "LIABILITY" as const, isGroup: false, currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "2220", name: "SGST Payable", type: "LIABILITY" as const, isGroup: false, currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "2230", name: "IGST Payable", type: "LIABILITY" as const, isGroup: false, currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "2300", name: "TDS Payable", type: "LIABILITY" as const, isGroup: false, description: "Tax Deducted at Source", currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "2400", name: "Salary Payable", type: "LIABILITY" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "2500", name: "Loans & Borrowings", type: "LIABILITY" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },

            // EQUITY (3xxx)
            { tenantId: tenant.id, code: "3000", name: "Equity", type: "EQUITY" as const, isGroup: true, description: "Owner's equity", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "3100", name: "Owner's Capital", type: "EQUITY" as const, isGroup: false, currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "3200", name: "Retained Earnings", type: "EQUITY" as const, isGroup: false, currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "3300", name: "Owner's Drawings", type: "EQUITY" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },

            // REVENUE (4xxx)
            { tenantId: tenant.id, code: "4000", name: "Revenue", type: "REVENUE" as const, isGroup: true, description: "All income accounts", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "4100", name: "Sales Revenue", type: "REVENUE" as const, isGroup: false, description: "Income from sales", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "4200", name: "Service Revenue", type: "REVENUE" as const, isGroup: false, description: "Income from services", currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "4300", name: "Interest Income", type: "REVENUE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "4400", name: "Other Income", type: "REVENUE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },

            // EXPENSES (5xxx)
            { tenantId: tenant.id, code: "5000", name: "Expenses", type: "EXPENSE" as const, isGroup: true, description: "All expense accounts", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "5100", name: "Cost of Goods Sold", type: "EXPENSE" as const, isGroup: false, description: "Direct costs", currencyCode, isActive: true, isSystem: true },
            { tenantId: tenant.id, code: "5200", name: "Salaries & Wages", type: "EXPENSE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "5300", name: "Rent", type: "EXPENSE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "5400", name: "Utilities", type: "EXPENSE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "5500", name: "Office Supplies", type: "EXPENSE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "5600", name: "Marketing & Advertising", type: "EXPENSE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "5700", name: "Insurance", type: "EXPENSE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "5800", name: "Depreciation", type: "EXPENSE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "5900", name: "Bank Charges", type: "EXPENSE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
            { tenantId: tenant.id, code: "5950", name: "Miscellaneous Expenses", type: "EXPENSE" as const, isGroup: false, currencyCode, isActive: true, isSystem: false },
        ]

        try {
            await prisma.account.createMany({
                data: defaultAccounts,
                skipDuplicates: true
            })
        } catch (seedErr) {
            console.error("Failed to seed default accounts for tenant:", tenant.id, seedErr)
        }
    }

    await logAdminAction("TENANT_CREATE", tenant.id, "TENANT", {
        name: tenant.name,
        plan: tenant.plan,
        countryCode: tenant.countryCode,
        currencyCode: tenant.currencyCode
    })

    revalidatePath('/admin/tenants')
    return tenant
}

/**
 * Update comprehensive tenant profile and configuration.
 */
async function _updateTenantDetails(
    tenantId: string, 
    data: {
        name?: string
        domain?: string
        email?: string
        phone?: string
        website?: string
        plan?: any
        currencyCode?: string
        countryCode?: string
        billingRegion?: string
        isActive?: boolean
        isTrial?: boolean
        trialEndsAt?: Date | string | null
    }
) {
    await ensureSuperAdmin()

    if (data.name !== undefined && !data.name.trim()) throw new Error("Business name is required")
    if (data.plan !== undefined) assertPlan(data.plan)
    if (data.email !== undefined) assertEmail(data.email)
    if (data.domain) await assertDomainFree(data.domain.trim().toLowerCase(), tenantId)

    const updatePayload: any = {}
    if (data.name !== undefined) updatePayload.name = data.name.trim()
    if (data.domain !== undefined) updatePayload.domain = data.domain ? data.domain.trim().toLowerCase() : null
    if (data.email !== undefined) updatePayload.email = data.email ? data.email.trim().toLowerCase() : null
    if (data.phone !== undefined) updatePayload.phone = data.phone?.trim() || null
    if (data.website !== undefined) updatePayload.website = data.website?.trim() || null
    if (data.plan !== undefined) updatePayload.plan = data.plan
    if (data.currencyCode !== undefined) updatePayload.currencyCode = data.currencyCode
    if (data.countryCode !== undefined) updatePayload.countryCode = data.countryCode
    if (data.billingRegion !== undefined) updatePayload.billingRegion = data.billingRegion
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive
    if (data.isTrial !== undefined) updatePayload.isTrial = data.isTrial
    if (data.trialEndsAt !== undefined) {
        updatePayload.trialEndsAt = data.trialEndsAt ? new Date(data.trialEndsAt) : null
    }

    const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: updatePayload
    })

    await logAdminAction("TENANT_UPDATE", tenantId, "TENANT", updatePayload)

    revalidatePath('/admin/tenants')
    revalidatePath(`/admin/tenants/${tenantId}`)
    return updated
}

export async function getPricingPlans() {
    await ensureSuperAdmin()

    try {
        const plans = await prisma.pricingPlan.findMany({
            orderBy: [
                { regionCode: 'asc' },
                { amount: 'asc' }
            ]
        })
        return plans.map((plan: any) => ({
            ...plan,
            amount: plan.amount ? Number(plan.amount) : 0
        }))
    } catch (error) {
        console.error("getPricingPlans error:", error)
        return []
    }
}

async function _updatePricingPlan(id: string, data: { amount: number, isActive: boolean }) {
    await ensureSuperAdmin()

    if (!(Number(data.amount) > 0)) throw new Error("Price must be greater than zero")

    const updated = await prisma.pricingPlan.update({
        where: { id },
        data: {
            amount: data.amount,
            isActive: data.isActive
        }
    })

    // Keep Stripe in step: Stripe prices can't be edited, so a changed amount
    // becomes a new monthly + annual price under the plan's lookup keys.
    // Razorpay needs nothing here: its orders are priced from this table.
    let stripeSync: { synced: boolean; error?: string } = { synced: false }
    if (updated.isActive && updated.tier !== "FREE" && stripe) {
        try {
            const monthly = Number(updated.amount)
            for (const [cycle, amount] of [["MONTHLY", monthly], ["ANNUAL", annualFromMonthly(monthly)]] as const) {
                await ensureStripePrice(stripe, {
                    plan: updated.tier as PaidPlan,
                    cycle,
                    currency: updated.currency,
                    amount,
                })
            }
            stripeSync = { synced: true }
        } catch (err) {
            console.error("updatePricingPlan: Stripe price sync failed", err)
            stripeSync = { synced: false, error: err instanceof Error ? err.message : "Stripe sync failed" }
        }
    }

    await logAdminAction("PRICING_PLAN_UPDATE", id, "PRICING_PLAN", {
        regionCode: updated.regionCode,
        tier: updated.tier,
        amount: Number(updated.amount),
        currency: updated.currency,
        isActive: updated.isActive,
        stripeSync,
    })

    revalidatePath('/admin/pricing')
    revalidatePath('/settings')
    revalidatePath('/pricing')
    return { ...updated, amount: Number(updated.amount), stripeSync }
}

export async function getSupportTickets(page: number = 1, limit: number = 15) {
    await ensureSuperAdmin()
    try {
        const tickets = await prisma.supportTicket.findMany({
            include: {
                tenant: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            skip: (page - 1) * limit,
            take: limit
        })
        return tickets
    } catch (error) {
        console.error("getSupportTickets error:", error)
        return []
    }
}

export async function getSupportTicket(ticketId: string) {
    await ensureSuperAdmin()

    return await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
            tenant: {
                select: { name: true }
            }
        }
    })
}

export async function getTicketMessages(ticketId: string) {
    await ensureSuperAdmin()

    return await prisma.supportMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" }
    })
}

async function _replyToTicket(ticketId: string, content: string) {
    const user = await ensureSuperAdmin()

    const text = content?.trim()
    if (!text) throw new Error("Reply can't be empty")
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true } })
    if (!ticket) throw new Error("Ticket not found")

    // Create the message
    const message = await prisma.supportMessage.create({
        data: {
            ticketId,
            content: text,
            senderId: user.id,
            isFromAdmin: true
        }
    })

    // Answered: in progress until the tenant replies or it's closed
    const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" },
        include: { tenant: { select: { name: true, email: true } } }
    })

    // Email whoever opened the ticket (first tenant-side message), else the workspace email
    const opener = await prisma.supportMessage.findFirst({
        where: { ticketId, isFromAdmin: false },
        orderBy: { createdAt: "asc" },
        select: { senderId: true }
    })
    const openerUser = opener?.senderId
        ? await prisma.user.findUnique({ where: { id: opener.senderId }, select: { email: true, fullName: true } })
        : null
    await sendSystemEmail("SUPPORT_TICKET_UPDATE", openerUser?.email || updatedTicket.tenant.email, {
        customer_name: openerUser?.fullName || updatedTicket.tenant.name,
        ticket_id: ticketId.slice(-8).toUpperCase(),
        ticket_title: updatedTicket.subject,
        ticket_status: "IN_PROGRESS",
        latest_message: text,
        agent_name: "Genesoft Support",
        company_name: "Genesoft ERP",
    })

    revalidatePath(`/admin/support/${ticketId}`)
    revalidatePath('/admin/support')
    return message
}

export async function getRecentSystemLogs(page: number = 1, limit: number = 20) {
    await ensureSuperAdmin()
    try {
        const logs = await prisma.systemLog.findMany({
            include: {
                tenant: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                timestamp: "desc"
            },
            skip: (page - 1) * limit,
            take: limit
        })
        return logs
    } catch (error) {
        console.error("getRecentSystemLogs error:", error)
        return []
    }
}

/**
 * Fetch database health stats and system metrics.
 */
export async function getDatabaseHealth() {
    await ensureSuperAdmin()

    const start = Date.now()
    try {
        // 1. Check Connectivity
        await prisma.$queryRaw`SELECT 1`
        const latency = Date.now() - start

        // 2. Metrics via counts
        const [tenantCount, userCount, logCount] = await Promise.all([
            prisma.tenant.count(),
            prisma.user.count(),
            prisma.systemLog.count()
        ])

        let databaseSize = "Unknown"
        try {
            const sizeRows = await prisma.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`
            databaseSize = sizeRows[0]?.size ?? "Unknown"
        } catch {
            // Size needs pg_database_size permission; the health check itself already passed
        }

        return {
            status: "HEALTHY",
            latency: `${latency}ms`,
            databaseSize,
            metrics: {
                tenants: tenantCount,
                users: userCount,
                logs: logCount
            },
            timestamp: new Date().toISOString()
        }
    } catch (err) {
        return {
            status: "UNHEALTHY",
            error: err instanceof Error ? err.message : "Database connection failed",
            timestamp: new Date().toISOString()
        }
    }
}

export interface ServiceHealth {
    name: string
    status: "Operational" | "Down" | "Not configured"
    latencyMs: number | null
    detail: string
}

async function timedCheck(name: string, configured: boolean, check: () => Promise<string>): Promise<ServiceHealth> {
    if (!configured) return { name, status: "Not configured", latencyMs: null, detail: "Credentials not set" }
    const started = Date.now()
    try {
        const detail = await check()
        return { name, status: "Operational", latencyMs: Date.now() - started, detail }
    } catch (err) {
        return { name, status: "Down", latencyMs: Date.now() - started, detail: err instanceof Error ? err.message : "Check failed" }
    }
}

/**
 * Live checks of the external services the app depends on, each with its
 * measured response time. Nothing here is cached or estimated.
 */
export async function getServiceHealth(): Promise<ServiceHealth[]> {
    await ensureSuperAdmin()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const timeout = () => AbortSignal.timeout(8000)

    return Promise.all([
        timedCheck("Auth (Supabase)", !!(supabaseUrl && anonKey), async () => {
            const res = await fetch(`${supabaseUrl}/auth/v1/health`, { headers: { apikey: anonKey! }, signal: timeout(), cache: "no-store" })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return "Sign-in service reachable"
        }),
        timedCheck("Email (Resend)", !!process.env.RESEND_API_KEY, async () => {
            const res = await fetch("https://api.resend.com/domains", {
                headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
                signal: timeout(),
                cache: "no-store",
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const body = await res.json() as { data?: { name: string; status: string }[] }
            const domain = body.data?.find((d) => d.name === process.env.RESEND_DOMAIN)
            if (process.env.RESEND_DOMAIN && !domain) throw new Error(`${process.env.RESEND_DOMAIN} is not added in Resend`)
            if (domain && domain.status !== "verified") throw new Error(`${domain.name} is ${domain.status}`)
            return domain ? `${domain.name} verified` : "API reachable"
        }),
        timedCheck("Payments (Razorpay)", !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET), async () => {
            const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")
            const res = await fetch("https://api.razorpay.com/v1/orders?count=1", { headers: { Authorization: `Basic ${auth}` }, signal: timeout(), cache: "no-store" })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return process.env.RAZORPAY_KEY_ID!.startsWith("rzp_test_") ? "Test mode" : "Live mode"
        }),
        timedCheck("Payments (Stripe)", !!stripe, async () => {
            await stripe!.balance.retrieve()
            return process.env.STRIPE_SECRET_KEY!.startsWith("sk_test_") ? "Test mode" : "Live mode"
        }),
        timedCheck("Webhooks & Cron secrets", true, async () => {
            const missing = ["RAZORPAY_WEBHOOK_SECRET", "CRON_SECRET", "ENCRYPTION_KEY"].filter((k) => !process.env[k])
            if (missing.length) throw new Error(`Missing: ${missing.join(", ")}`)
            return "Webhook, cron and encryption secrets set"
        }),
    ])
}

/**
 * Fetch time-series data and distribution for dashboard charts.
 */
export async function getDashboardCharts() {
    await ensureSuperAdmin()

    // 1. Fetch last 6 months signups
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const signups = await prisma.tenant.findMany({
        select: {
            createdAt: true
        },
        where: {
            createdAt: {
                gte: sixMonthsAgo
            }
        },
        orderBy: {
            createdAt: "asc"
        }
    })

    // Grouping by month
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const chartDataMap: Record<string, number> = {}
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const label = `${months[d.getMonth()]}`
        chartDataMap[label] = 0
    }

    signups.forEach((t: any) => {
        const d = new Date(t.createdAt)
        const label = `${months[d.getMonth()]}`
        if (chartDataMap[label] !== undefined) {
            chartDataMap[label] += 1
        }
    })

    const growthData = Object.entries(chartDataMap).map(([name, total]) => ({ name, total }))

    // 2. Fetch regional distribution
    const regions = await prisma.tenant.findMany({
        select: {
            countryCode: true
        }
    })

    const regionMap: Record<string, number> = {}
    regions.forEach((t: any) => {
        const code = t.countryCode || "Unknown"
        regionMap[code] = (regionMap[code] || 0) + 1
    })

    const distributionData = Object.entries(regionMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

    return {
        growthData,
        distributionData
    }
}

/**
 * Truncate all system logs (Maintenance).
 */
async function _clearSystemLogs() {
    await ensureSuperAdmin()
    const result = await prisma.systemLog.deleteMany({})
    await logAdminAction("SYSTEM_LOGS_CLEARED", "system_logs", "SYSTEM", { deleted: result.count })
    revalidatePath('/admin/logs')
    return result
}

export interface SecuritySettings {
    enforce2FA: boolean
    rateLimitPerMin: number
    authLockoutAttempts: number
    sessionTimeoutMinutes: number
    allowSignups: boolean
    maintenanceMode: boolean
    blockedIps: Array<{ ip: string; reason: string; blockedAt: string }>
}

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
    enforce2FA: false,
    rateLimitPerMin: 120,
    authLockoutAttempts: 5,
    sessionTimeoutMinutes: 30,
    allowSignups: true,
    maintenanceMode: false,
    blockedIps: []
}

/**
 * Fetch platform security overview, firewall rules, and security incident logs.
 */
export async function getSecurityOverview() {
    await ensureSuperAdmin()

    try {
        const latestPolicyLog = await prisma.adminAuditLog.findFirst({
            where: { action: "SECURITY_POLICY_UPDATE" },
            orderBy: { createdAt: "desc" }
        })

        const ipBlockLogs = await prisma.adminAuditLog.findMany({
            where: {
                action: { in: ["SECURITY_IP_BLOCK", "SECURITY_IP_UNBLOCK"] }
            },
            orderBy: { createdAt: "asc" }
        })

        const blockedIpMap = new Map<string, { ip: string; reason: string; blockedAt: string }>()
        DEFAULT_SECURITY_SETTINGS.blockedIps.forEach(item => {
            blockedIpMap.set(item.ip, item)
        })

        ipBlockLogs.forEach((log: any) => {
            const ip = log.targetId
            if (!ip) return
            if (log.action === "SECURITY_IP_BLOCK") {
                const meta = (log.metadata as any) || {}
                blockedIpMap.set(ip, {
                    ip,
                    reason: meta.reason || "Suspicious traffic pattern",
                    blockedAt: log.createdAt.toISOString()
                })
            } else if (log.action === "SECURITY_IP_UNBLOCK") {
                blockedIpMap.delete(ip)
            }
        })

        const savedPolicy = (latestPolicyLog?.metadata as any) || {}
        // Maintenance mode and signups live in global_settings, which is what the proxy enforces
        const globalSettings = await prisma.globalSettings.findUnique({ where: { id: "system_config" } })

        const settings: SecuritySettings = {
            enforce2FA: savedPolicy.enforce2FA ?? DEFAULT_SECURITY_SETTINGS.enforce2FA,
            rateLimitPerMin: savedPolicy.rateLimitPerMin ?? DEFAULT_SECURITY_SETTINGS.rateLimitPerMin,
            authLockoutAttempts: savedPolicy.authLockoutAttempts ?? DEFAULT_SECURITY_SETTINGS.authLockoutAttempts,
            sessionTimeoutMinutes: savedPolicy.sessionTimeoutMinutes ?? DEFAULT_SECURITY_SETTINGS.sessionTimeoutMinutes,
            allowSignups: globalSettings?.allowSignups ?? DEFAULT_SECURITY_SETTINGS.allowSignups,
            maintenanceMode: globalSettings?.maintenanceMode ?? DEFAULT_SECURITY_SETTINGS.maintenanceMode,
            blockedIps: Array.from(blockedIpMap.values())
        }

        const securityEvents = await prisma.adminAuditLog.findMany({
            where: {
                OR: [
                    { action: { startsWith: "SECURITY_" } },
                    { action: { in: ["TENANT_SUSPEND", "TENANT_ACTIVATE", "TENANT_PLAN_UPDATE"] } }
                ]
            },
            orderBy: { createdAt: "desc" },
            take: 20
        })

        const [suspendedTenantsCount, totalTenantsCount, totalUsersCount] = await Promise.all([
            prisma.tenant.count({ where: { isActive: false } }),
            prisma.tenant.count(),
            prisma.user.count()
        ])

        return {
            settings,
            securityEvents,
            metrics: {
                blockedIpsCount: settings.blockedIps.length,
                suspendedTenantsCount,
                totalTenantsCount,
                totalUsersCount,
                enforce2FA: settings.enforce2FA,
                rateLimitPerMin: settings.rateLimitPerMin,
                sessionTimeoutMinutes: settings.sessionTimeoutMinutes
            }
        }
    } catch (error) {
        console.error("getSecurityOverview error:", error)
        return {
            settings: DEFAULT_SECURITY_SETTINGS,
            securityEvents: [],
            metrics: {
                blockedIpsCount: DEFAULT_SECURITY_SETTINGS.blockedIps.length,
                suspendedTenantsCount: 0,
                totalTenantsCount: 0,
                totalUsersCount: 0,
                enforce2FA: false,
                rateLimitPerMin: 120,
                sessionTimeoutMinutes: 30
            }
        }
    }
}

/**
 * Update global security posture (2FA, rate limits, session policies).
 */
async function _updateSecurityPolicy(policy: Partial<SecuritySettings>) {
    await ensureSuperAdmin()

    await logAdminAction("SECURITY_POLICY_UPDATE", "system_security", "SECURITY", policy)

    if (policy.maintenanceMode !== undefined || policy.allowSignups !== undefined) {
        await prisma.globalSettings.upsert({
            where: { id: "system_config" },
            update: {
                ...(policy.maintenanceMode !== undefined && { maintenanceMode: policy.maintenanceMode }),
                ...(policy.allowSignups !== undefined && { allowSignups: policy.allowSignups }),
            },
            create: {
                id: "system_config",
                maintenanceMode: policy.maintenanceMode ?? false,
                allowSignups: policy.allowSignups ?? true,
            },
        })
    }
    clearPlatformGateCache()

    revalidatePath("/admin/security")
    revalidatePath("/admin/dashboard")
    return { success: true }
}

/**
 * Add an IP to the platform blocklist.
 */
async function _addBlockedIp(ip: string, reason: string) {
    await ensureSuperAdmin()

    const cleanIp = ip.trim()
    if (!cleanIp) throw new Error("IP address is required")

    await logAdminAction("SECURITY_IP_BLOCK", cleanIp, "IP_RULE", {
        reason: reason?.trim() || "Manual Super Admin block"
    })

    clearPlatformGateCache()
    revalidatePath("/admin/security")
    return { success: true }
}

/**
 * Remove an IP from the platform blocklist.
 */
async function _removeBlockedIp(ip: string) {
    await ensureSuperAdmin()

    const cleanIp = ip.trim()
    if (!cleanIp) throw new Error("IP address is required")

    await logAdminAction("SECURITY_IP_UNBLOCK", cleanIp, "IP_RULE", {
        unblockedAt: new Date().toISOString()
    })

    clearPlatformGateCache()
    revalidatePath("/admin/security")
    return { success: true }
}

/**
 * Global Platform Settings & Announcement Engine
 */
export async function getGlobalSettings() {
    try {
        let settings = await prisma.globalSettings.findUnique({
            where: { id: "system_config" }
        })

        if (!settings) {
            settings = await prisma.globalSettings.create({
                data: {
                    id: "system_config",
                    maintenanceMode: false,
                    allowSignups: true,
                    bannerMessage: null
                }
            })
        }

        return settings
    } catch (error) {
        console.error("getGlobalSettings error:", error)
        return {
            id: "system_config",
            maintenanceMode: false,
            allowSignups: true,
            bannerMessage: null,
            updatedAt: new Date()
        }
    }
}

async function _updateGlobalSettings(data: {
    maintenanceMode?: boolean
    allowSignups?: boolean
    bannerMessage?: string | null
}) {
    await ensureSuperAdmin()

    const updated = await prisma.globalSettings.upsert({
        where: { id: "system_config" },
        update: {
            ...(data.maintenanceMode !== undefined && { maintenanceMode: data.maintenanceMode }),
            ...(data.allowSignups !== undefined && { allowSignups: data.allowSignups }),
            ...(data.bannerMessage !== undefined && { bannerMessage: data.bannerMessage?.trim() || null })
        },
        create: {
            id: "system_config",
            maintenanceMode: data.maintenanceMode ?? false,
            allowSignups: data.allowSignups ?? true,
            bannerMessage: data.bannerMessage?.trim() || null
        }
    })

    clearPlatformGateCache()

    await logAdminAction("GLOBAL_SETTINGS_UPDATE", "system_config", "SYSTEM", data)

    revalidatePath("/admin/settings")
    revalidatePath("/admin/dashboard")
    revalidatePath("/(dashboard)", "layout")
    return updated
}

/**
 * Global User Directory (Cross-Tenant User Management)
 */
export async function getGlobalUsers(params: {
    search?: string
    role?: string
    status?: string
    page?: number
    limit?: number
} = {}) {
    await ensureSuperAdmin()
    const { search, role, status, page = 1, limit = 20 } = params

    const where: any = {}

    if (search && search.trim()) {
        const query = search.trim()
        where.OR = [
            { fullName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } }
        ]
    }

    if (role && role !== "ALL") {
        where.role = role as any
    }

    if (status && status !== "ALL") {
        where.isActive = status === "ACTIVE"
    }

    try {
        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            plan: true,
                            countryCode: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.user.count({ where })
        ])

        return { users, totalCount, page, limit }
    } catch (error) {
        console.error("getGlobalUsers error:", error)
        return { users: [], totalCount: 0, page, limit }
    }
}

/**
 * Stops changes that would lock the platform out of /admin: changing your own
 * account, or removing the last active SUPER_ADMIN.
 */
async function assertSafeUserChange(callerId: string, userId: string, removesSuperAdmin: boolean) {
    if (userId === callerId) throw new Error("You can't change your own role or status here.")
    if (!removesSuperAdmin) return
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } })
    if (!target) throw new Error("User not found")
    if (target.role !== "SUPER_ADMIN" || !target.isActive) return
    const others = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true, id: { not: userId } } })
    if (others === 0) throw new Error("The platform needs at least one active Super Admin.")
}

async function _toggleUserStatus(userId: string, isActive: boolean) {
    const caller = await ensureSuperAdmin()
    await assertSafeUserChange(caller.id, userId, !isActive)

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { isActive }
    })

    await logAdminAction(isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE", userId, "USER", {
        userEmail: updated.email,
        tenantId: updated.tenantId
    })

    revalidatePath("/admin/users")
    return updated
}

async function _updateUserRole(userId: string, role: any) {
    const caller = await ensureSuperAdmin()
    if (!ROLES.includes(role)) throw new Error("Invalid role")
    await assertSafeUserChange(caller.id, userId, role !== "SUPER_ADMIN")

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { role }
    })

    // prisma.user is the profiles table, so the middleware sees the new role immediately

    await logAdminAction("USER_ROLE_UPDATE", userId, "USER", {
        newRole: role,
        userEmail: updated.email
    })

    revalidatePath("/admin/users")
    return updated
}

/**
 * Platform Subscriptions & MRR Ledger
 */
export async function getPlatformSubscriptions() {
    await ensureSuperAdmin()

    try {
        const tenants = await prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                domain: true,
                email: true,
                plan: true,
                isActive: true,
                isTrial: true,
                trialEndsAt: true,
                countryCode: true,
                currencyCode: true,
                createdAt: true,
                settings: true
            },
            orderBy: { createdAt: "desc" }
        })

        // MRR (INR) from paying, active tenants at live prices; trials and suspended tenants don't count
        const { mrr: totalMrr, payingTenants, byCurrency: mrrByCurrency } = await calculatePlatformMrr(tenants)
        const planCounts: Record<string, number> = { FREE: 0, BASIC: 0, PRO: 0, ENTERPRISE: 0 }
        const allInvoices: any[] = []

        tenants.forEach((t: any) => {
            const planKey = (t.plan || "FREE") as string
            planCounts[planKey] = (planCounts[planKey] || 0) + 1

            const subMeta = (t.settings as any)?.subscription || {}
            if (Array.isArray(subMeta.invoices)) {
                subMeta.invoices.forEach((inv: any) => {
                    allInvoices.push({
                        ...inv,
                        tenantId: t.id,
                        tenantName: t.name
                    })
                })
            }
        })

        allInvoices.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())

        return {
            totalTenants: tenants.length,
            totalMrr,
            mrrCurrency: "INR",
            payingTenants,
            mrrByCurrency,
            planCounts,
            tenants,
            invoices: allInvoices.slice(0, 30)
        }
    } catch (error) {
        console.error("getPlatformSubscriptions error:", error)
        return {
            totalTenants: 0,
            totalMrr: 0,
            mrrCurrency: "INR",
            payingTenants: 0,
            mrrByCurrency: {},
            planCounts: { FREE: 0, BASIC: 0, PRO: 0, ENTERPRISE: 0 },
            tenants: [],
            invoices: []
        }
    }
}

/**
 * Live platform regional distribution & cluster telemetry
 */
export async function getPlatformRegions() {
    await ensureSuperAdmin()

    try {
        const tenants = await prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                countryCode: true,
                plan: true,
                isActive: true,
                users: {
                    select: { id: true }
                }
            }
        })

        const definedRegions = [
            {
                id: "reg_in",
                code: "IN",
                name: "India",
                flag: "🇮🇳",
                currency: "INR",
                taxScheme: "GST & TDS 26Q",
                status: "ACTIVE",
            },
            {
                id: "reg_ae",
                code: "AE",
                name: "United Arab Emirates",
                flag: "🇦🇪",
                currency: "AED",
                taxScheme: "UAE VAT 201",
                status: "ACTIVE",
            },
            {
                id: "reg_sa",
                code: "SA",
                name: "Saudi Arabia",
                flag: "🇸🇦",
                currency: "SAR",
                taxScheme: "ZATCA E-Invoicing / KSA VAT",
                status: "ACTIVE",
            },
            {
                id: "reg_us",
                code: "US",
                name: "United States",
                flag: "🇺🇸",
                currency: "USD",
                taxScheme: "US State Sales Tax",
                status: "ACTIVE",
            },
            {
                id: "reg_gb",
                code: "GB",
                name: "United Kingdom",
                flag: "🇬🇧",
                currency: "GBP",
                taxScheme: "UK VAT (MTD)",
                status: "ACTIVE",
            },
            {
                id: "reg_au",
                code: "AU",
                name: "Australia",
                flag: "🇦🇺",
                currency: "AUD",
                taxScheme: "ATO BAS & GST",
                status: "ACTIVE",
            },
        ]

        const regions = definedRegions.map(reg => {
            const codes = reg.code === "GB" ? ["GB", "UK"] : [reg.code]
            const matchingTenants = tenants.filter((t: any) => codes.includes((t.countryCode || "IN").toUpperCase()))
            const userCount = matchingTenants.reduce((sum: number, t: any) => sum + (t.users?.length || 0), 0)
            return {
                ...reg,
                tenantCount: matchingTenants.length,
                userCount,
                activeTenants: matchingTenants.filter((t: any) => t.isActive).length,
                isOperational: true
            }
        })

        const totalActiveClusters = regions.filter(r => r.tenantCount > 0).length

        return {
            totalTenants: tenants.length,
            totalRegions: regions.length,
            activeClusters: totalActiveClusters || 1,
            regions
        }
    } catch (error) {
        console.error("getPlatformRegions error:", error)
        return {
            totalTenants: 0,
            totalRegions: 0,
            activeClusters: 0,
            regions: []
        }
    }
}

// ---------------------------------------------------------------------------
// Mutations are exported through toActionResult so their error messages reach
// the admin UI in production (see src/lib/action-result.ts).
// ---------------------------------------------------------------------------

export async function updateTenantPlan(...args: Parameters<typeof _updateTenantPlan>) {
    return toActionResult(() => _updateTenantPlan(...args))
}

export async function extendTenantTrial(...args: Parameters<typeof _extendTenantTrial>) {
    return toActionResult(() => _extendTenantTrial(...args))
}

export async function toggleTenantStatus(...args: Parameters<typeof _toggleTenantStatus>) {
    return toActionResult(() => _toggleTenantStatus(...args))
}

export async function createTenant(...args: Parameters<typeof _createTenant>) {
    return toActionResult(() => _createTenant(...args))
}

export async function updateTenantDetails(...args: Parameters<typeof _updateTenantDetails>) {
    return toActionResult(() => _updateTenantDetails(...args))
}

export async function updatePricingPlan(...args: Parameters<typeof _updatePricingPlan>) {
    return toActionResult(() => _updatePricingPlan(...args))
}

export async function replyToTicket(...args: Parameters<typeof _replyToTicket>) {
    return toActionResult(() => _replyToTicket(...args))
}

export async function clearSystemLogs(...args: Parameters<typeof _clearSystemLogs>) {
    return toActionResult(() => _clearSystemLogs(...args))
}

export async function updateSecurityPolicy(...args: Parameters<typeof _updateSecurityPolicy>) {
    return toActionResult(() => _updateSecurityPolicy(...args))
}

export async function addBlockedIp(...args: Parameters<typeof _addBlockedIp>) {
    return toActionResult(() => _addBlockedIp(...args))
}

export async function removeBlockedIp(...args: Parameters<typeof _removeBlockedIp>) {
    return toActionResult(() => _removeBlockedIp(...args))
}

export async function updateGlobalSettings(...args: Parameters<typeof _updateGlobalSettings>) {
    return toActionResult(() => _updateGlobalSettings(...args))
}

export async function toggleUserStatus(...args: Parameters<typeof _toggleUserStatus>) {
    return toActionResult(() => _toggleUserStatus(...args))
}

export async function updateUserRole(...args: Parameters<typeof _updateUserRole>) {
    return toActionResult(() => _updateUserRole(...args))
}
