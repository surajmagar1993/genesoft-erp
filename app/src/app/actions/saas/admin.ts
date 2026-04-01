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

export async function getTenants() {
    await ensureSuperAdmin()

    return await prisma.tenant.findMany({
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

export async function getSupportTickets() {
    await ensureSuperAdmin()

    return await prisma.supportTicket.findMany({
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
        data: { status: "PENDING" }
    })

    return message
}

export async function getRecentSystemLogs() {
    await ensureSuperAdmin()

    return await prisma.systemLog.findMany({
        take: 10,
        orderBy: { timestamp: "desc" },
        include: {
            tenant: {
                select: { name: true }
            }
        }
    })
}
