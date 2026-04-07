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

export async function getPlatformStats() {
    await ensureSuperAdmin()
    const supabase = await createClient()

    // Resilient data fetching via Supabase HTTP client
    const [
        { count: totalTenants },
        { count: totalUsers },
        { count: activeTrials },
        { count: openTickets },
        { data: recentTenants }
    ] = await Promise.all([
        supabase.from("tenants").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tenants").select("*", { count: "exact", head: true })
            .eq("is_trial", true)
            .eq("is_active", true),
        supabase.from("support_tickets").select("*", { count: "exact", head: true })
            .eq("status", "OPEN"),
        supabase.from("tenants")
            .select("id, name, plan, created_at, is_trial")
            .order("created_at", { ascending: false })
            .limit(5)
    ])

    const revenueEst = (totalTenants || 0) * 999 

    return {
        totalTenants: totalTenants || 0,
        totalUsers: totalUsers || 0,
        activeTrials: activeTrials || 0,
        openTickets: openTickets || 0,
        recentTenants: (recentTenants || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            plan: t.plan,
            createdAt: t.created_at,
            isTrial: t.is_trial
        })),
        revenueEst
    }
}

export async function getTenants(page: number = 1, limit: number = 10) {
    await ensureSuperAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("tenants")
        .select("*, users:profiles(id)")
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

    if (error) {
        console.error("getTenants error:", error)
        return []
    }
    return data
}

export async function updateTenantPlan(tenantId: string, plan: any) {
    await ensureSuperAdmin()

    const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: { plan, isTrial: false }
    })
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
    revalidatePath('/admin/tenants')
    return updated
}

export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
    await ensureSuperAdmin()

    const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive }
    })
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
        return plans.map(plan => ({
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
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("support_tickets")
        .select("*, tenant:tenants(name)")
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

    if (error) {
        console.error("getSupportTickets error:", error)
        return []
    }
    return data
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
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("system_logs")
        .select("*, tenant:tenants(name)")
        .order("timestamp", { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

    if (error) {
        console.error("getRecentSystemLogs error:", error)
        return []
    }
    return data
}

/**
 * Fetch database health stats and system metrics.
 */
export async function getDatabaseHealth() {
    await ensureSuperAdmin()
    const supabase = await createClient()

    const start = Date.now()
    try {
        // 1. Check Connectivity
        const { error: pingError } = await supabase.from("tenants").select("id").limit(1)
        if (pingError) throw pingError
        const latency = Date.now() - start

        // 2. Metrics via resilient counts
        const [
            { count: tenantCount },
            { count: userCount },
            { count: logCount }
        ] = await Promise.all([
            supabase.from("tenants").select("*", { count: "exact", head: true }),
            supabase.from("profiles").select("*", { count: "exact", head: true }),
            supabase.from("system_logs").select("*", { count: "exact", head: true })
        ])

        return {
            status: "HEALTHY",
            latency: `${latency}ms`,
            databaseSize: "Optimized",
            metrics: {
                tenants: tenantCount || 0,
                users: userCount || 0,
                logs: logCount || 0
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
 * Truncate all system logs (Maintenance).
 */
export async function clearSystemLogs() {
    await ensureSuperAdmin()
    return await prisma.systemLog.deleteMany({})
}
