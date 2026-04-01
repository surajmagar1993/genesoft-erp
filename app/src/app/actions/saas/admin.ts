"use server"

import { prisma } from "../../../lib/prisma"
import { Role } from "@prisma/client"
import { createClient } from "../../../lib/supabase/server"

/**
 * Ensures the current user is a SUPER_ADMIN.
 * Throws an error if not authorized.
 */
async function ensureSuperAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    const dbUser = await prisma.user.findUnique({
        where: { authId: user.id },
        select: { role: true }
    })

    if (!dbUser || dbUser.role !== Role.SUPER_ADMIN) {
        throw new Error("Forbidden: Super Admin access required")
    }

    return user
}

export async function getPlatformStats() {
    await ensureSuperAdmin()

    const [
        totalTenants,
        totalUsers,
        activeTrials,
        openTickets,
        recentTenants
    ] = await Promise.all([
        prisma.tenant.count(),
        prisma.user.count(),
        prisma.tenant.count({ where: { isTrial: true, isActive: true } }),
        prisma.supportTicket.count({ where: { status: "OPEN" } }),
        prisma.tenant.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                plan: true,
                createdAt: true,
                isTrial: true
            }
        })
    ])

    // Mock revenue calculation (sum of pricing plans for non-trial tenants)
    // In a real app, this would query a 'Subscriptions' or 'Payments' table
    const revenueEst = totalTenants * 999 // Placeholder avg revenue

    return {
        totalTenants,
        totalUsers,
        activeTrials,
        openTickets,
        revenueEst,
        recentTenants
    }
}

export async function getTenants(page: number = 1, limit: number = 10) {
    await ensureSuperAdmin()

    return await prisma.tenant.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
            users: {
                select: { id: true }
            }
        }
    })
}

export async function updateTenantPlan(tenantId: string, plan: any) {
    await ensureSuperAdmin()

    return await prisma.tenant.update({
        where: { id: tenantId },
        data: { plan, isTrial: false }
    })
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

    return await prisma.tenant.update({
        where: { id: tenantId },
        data: { 
            trialEndsAt: newEnd,
            isTrial: true 
        }
    })
}

export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
    await ensureSuperAdmin()

    return await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive }
    })
}

export async function getPricingPlans() {
    await ensureSuperAdmin()

    return await prisma.pricingPlan.findMany({
        orderBy: [
            { regionCode: "asc" },
            { amount: "asc" }
        ]
    })
}

export async function updatePricingPlan(id: string, data: { amount: number, isActive: boolean }) {
    await ensureSuperAdmin()

    return await prisma.pricingPlan.update({
        where: { id },
        data: {
            amount: data.amount,
            isActive: data.isActive
        }
    })
}

export async function getSupportTickets(page: number = 1, limit: number = 15) {
    await ensureSuperAdmin()

    return await prisma.supportTicket.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
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

    return await prisma.systemLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: "desc" },
        include: {
            tenant: {
                select: { name: true }
            }
        }
    })
}

/**
 * Fetch database health stats and system metrics.
 */
export async function getDatabaseHealth() {
    await ensureSuperAdmin()

    const start = Date.now()
    try {
        // 1. Check Connectivity & Latency
        await prisma.$queryRaw`SELECT 1`
        const latency = Date.now() - start

        // 2. Get Database Size (Postgres specific)
        const dbSizeResult: any[] = await prisma.$queryRaw`SELECT pg_size_pretty(pg_database_size(current_database())) as size`
        const dbSize = dbSizeResult[0]?.size || "Unknown"

        // 3. Row Counts for Growth Metrics
        const [tenantCount, userCount, logCount] = await Promise.all([
            prisma.tenant.count(),
            prisma.user.count(),
            prisma.systemLog.count()
        ])

        return {
            status: "HEALTHY",
            latency: `${latency}ms`,
            databaseSize: dbSize,
            metrics: {
                tenants: tenantCount,
                users: userCount,
                logs: logCount
            },
            timestamp: new Date().toISOString()
        }
    } catch (err) {
        console.error("Health check failed:", err)
        return {
            status: "UNHEALTHY",
            error: err instanceof Error ? err.message : "Database connection failed",
            timestamp: new Date().toISOString()
        }
    }
}

/**
 * Truncate all system logs (Maintenance).
 */
export async function clearSystemLogs() {
    await ensureSuperAdmin()
    return await prisma.systemLog.deleteMany({})
}
