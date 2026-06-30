"use server"

import { prisma } from "../../../lib/prisma"
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

    // Use Supabase client for simple role check (works over HTTPS, more resilient than TCP)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile as any).role !== "SUPER_ADMIN") {
        throw new Error("Forbidden: Super Admin access required")
    }

    return user
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
                plan: true
            }
        })
    ])

    // More accurate revenue estimation based on Plan types
    const planWeights: Record<string, number> = {
        'FREE': 0,
        'BASIC': 499,
        'PRO': 999,
        'ENTERPRISE': 4999
    }
    
    // Summing revenue from tenants based on their current plan (rough estimate)
    const revenueEst = (tenantPlans || []).reduce((sum: number, t: any) => sum + (planWeights[t.plan] || 0), 0)

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
    const { page = 1, limit = 10, search, plan, status } = params
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
        const tenants = await prisma.tenant.findMany({
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
        })
        return tenants
    } catch (error) {
        console.error("getTenants error:", error)
        return []
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

export async function updateTenantPlan(tenantId: string, plan: any) {
    await ensureSuperAdmin()

    const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: { plan, isTrial: false }
    })
    
    await logAdminAction("TENANT_PLAN_UPDATE", tenantId, "TENANT", { newPlan: plan })
    
    revalidatePath('/admin/tenants')
    return updated
}

export async function extendTenantTrial(tenantId: string, days: number) {
    await ensureSuperAdmin()

    const tenant: any = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { trialEndsAt: true }
    })

    const currentEnd = (tenant as any)?.trialEndsAt || new Date()
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

export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
    await ensureSuperAdmin()

    const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive }
    })
    
    await logAdminAction(isActive ? "TENANT_ACTIVATE" : "TENANT_SUSPEND", tenantId, "TENANT")
    
    revalidatePath('/admin/tenants')
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

export async function updatePricingPlan(id: string, data: { amount: number, isActive: boolean }) {
    await ensureSuperAdmin()

    const updated = await prisma.pricingPlan.update({
        where: { id },
        data: {
            amount: data.amount,
            isActive: data.isActive
        }
    })
    revalidatePath('/admin/pricing')
    return updated
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

export async function getTicketMessages(ticketId: string) {
    await ensureSuperAdmin()

    return await prisma.supportMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" }
    })
}

export async function replyToTicket(ticketId: string, content: string) {
    const user = await ensureSuperAdmin()

    // Create the message
    const message = await prisma.supportMessage.create({
        data: {
            ticketId,
            content,
            senderId: user.id,
            isFromAdmin: true
        }
    })

    // Update ticket status to PENDING (waiting for user response)
    await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" }
    })

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

        return {
            status: "HEALTHY",
            latency: `${latency}ms`,
            databaseSize: "Optimized",
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
export async function clearSystemLogs() {
    await ensureSuperAdmin()
    return await prisma.systemLog.deleteMany({})
}
