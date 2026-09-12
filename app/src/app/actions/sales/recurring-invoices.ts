"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    RecurringFrequency,
    RecurringStatus,
    RecurringExecutionStatus,
    InvoiceStatus,
    InvoiceType,
} from "@prisma/client"

// ============================================
// TYPES & INTERFACES
// ============================================

export interface RecurringProfileItemRecord {
    id: string
    recurringProfileId: string
    productId?: string | null
    description: string
    hsnSacCode?: string | null
    quantity: number
    unitPrice: number
    cgstRate: number
    cgstAmount: number
    sgstRate: number
    sgstAmount: number
    igstRate: number
    igstAmount: number
    discount: number
    lineTotal: number
    product?: {
        id: string
        name: string
        sku: string
    } | null
}

export interface RecurringExecutionRecord {
    id: string
    recurringProfileId: string
    invoiceId?: string | null
    invoice?: {
        id: string
        invoiceNumber: string
        total: number
        status: string
    } | null
    executionDate: string
    status: RecurringExecutionStatus
    amount: number
    errorMessage?: string | null
}

export interface RecurringProfileRecord {
    id: string
    tenantId: string
    profileNumber: string
    title: string
    description?: string | null
    contactId: string
    contact: {
        id: string
        displayName: string
        companyName?: string | null
        email?: string | null
        phone?: string | null
        gstin?: string | null
        billingAddress?: any
    }
    frequency: RecurringFrequency
    startDate: string
    endDate?: string | null
    nextRunDate: string
    lastRunDate?: string | null
    maxCycles?: number | null
    cyclesCompleted: number
    status: RecurringStatus
    autoSendEmail: boolean
    autoApprove: boolean
    paymentTerms?: string | null
    subtotal: number
    taxAmount: number
    totalAmount: number
    currencyCode: string
    notes?: string | null
    terms?: string | null
    createdAt: string
    updatedAt: string
    items: RecurringProfileItemRecord[]
    executions: RecurringExecutionRecord[]
    invoicesCount: number
}

export interface RecurringInvoicesKPIs {
    activeProfiles: number
    totalProfiles: number
    mrr: number // Monthly Recurring Revenue
    arr: number // Annualized Recurring Revenue
    totalRecurringValue: number
    lifetimeInvoicesGenerated: number
    soonestNextRun: string | null
}

export interface RecurringInvoicesOverview {
    profiles: RecurringProfileRecord[]
    customers: Array<{
        id: string
        displayName: string
        companyName?: string | null
        email?: string | null
        billingAddress?: any
    }>
    products: Array<{
        id: string
        name: string
        sku: string
        unitPrice: number
        hsnSacCode?: string | null
    }>
    executions: RecurringExecutionRecord[]
    kpis: RecurringInvoicesKPIs
}

export interface CreateRecurringProfileInput {
    title: string
    description?: string
    contactId: string
    frequency: RecurringFrequency
    startDate: string
    endDate?: string
    maxCycles?: number
    autoSendEmail?: boolean
    autoApprove?: boolean
    paymentTerms?: string
    currencyCode?: string
    notes?: string
    terms?: string
    items: Array<{
        productId?: string
        description: string
        hsnSacCode?: string
        quantity: number
        unitPrice: number
        taxRate?: number // e.g. 18 for 9% CGST + 9% SGST
        discount?: number
    }>
}

// ============================================
// HELPER: CALCULATE NEXT RUN DATE
// ============================================

function computeNextRunDate(currentDate: Date, frequency: RecurringFrequency): Date {
    const next = new Date(currentDate)
    switch (frequency) {
        case RecurringFrequency.WEEKLY:
            next.setDate(next.getDate() + 7)
            break
        case RecurringFrequency.BIWEEKLY:
            next.setDate(next.getDate() + 14)
            break
        case RecurringFrequency.MONTHLY:
            next.setMonth(next.getMonth() + 1)
            break
        case RecurringFrequency.QUARTERLY:
            next.setMonth(next.getMonth() + 3)
            break
        case RecurringFrequency.BIANNUALLY:
            next.setMonth(next.getMonth() + 6)
            break
        case RecurringFrequency.ANNUALLY:
            next.setFullYear(next.getFullYear() + 1)
            break
    }
    return next
}

// Normalized Monthly Factor
function getMonthlyMultiplier(freq: RecurringFrequency): number {
    switch (freq) {
        case RecurringFrequency.WEEKLY:
            return 4.333
        case RecurringFrequency.BIWEEKLY:
            return 2.166
        case RecurringFrequency.MONTHLY:
            return 1.0
        case RecurringFrequency.QUARTERLY:
            return 1.0 / 3.0
        case RecurringFrequency.BIANNUALLY:
            return 1.0 / 6.0
        case RecurringFrequency.ANNUALLY:
            return 1.0 / 12.0
        default:
            return 1.0
    }
}

// ============================================
// READ OVERVIEW & AUTO SEEDER
// ============================================

export async function getRecurringInvoicesOverview(
    filterStatus?: string
): Promise<RecurringInvoicesOverview> {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Authentication required")

    // Auto-seed realistic subscriptions if empty
    await autoSeedRecurringProfilesIfEmpty(tenantId)

    // 1. Fetch profiles
    const rawProfiles = await prisma.recurringProfile.findMany({
        where: {
            tenantId,
            ...(filterStatus && filterStatus !== "ALL"
                ? { status: filterStatus as RecurringStatus }
                : {}),
        },
        include: {
            contact: {
                select: {
                    id: true,
                    displayName: true,
                    companyName: true,
                    email: true,
                    phone: true,
                    gstin: true,
                    billingAddress: true,
                },
            },
            items: {
                include: {
                    product: { select: { id: true, name: true, sku: true } },
                },
            },
            executions: {
                include: {
                    invoice: { select: { id: true, invoiceNumber: true, total: true, status: true } },
                },
                orderBy: { executionDate: "desc" },
                take: 10,
            },
            _count: {
                select: { invoices: true },
            },
        },
        orderBy: [{ status: "asc" }, { nextRunDate: "asc" }],
    })

    const profiles: RecurringProfileRecord[] = rawProfiles.map((p: any) => ({
        id: p.id,
        tenantId: p.tenantId,
        profileNumber: p.profileNumber,
        title: p.title,
        description: p.description,
        contactId: p.contactId,
        contact: p.contact,
        frequency: p.frequency,
        startDate: p.startDate.toISOString().split("T")[0],
        endDate: p.endDate ? p.endDate.toISOString().split("T")[0] : null,
        nextRunDate: p.nextRunDate.toISOString().split("T")[0],
        lastRunDate: p.lastRunDate ? p.lastRunDate.toISOString().split("T")[0] : null,
        maxCycles: p.maxCycles,
        cyclesCompleted: p.cyclesCompleted,
        status: p.status,
        autoSendEmail: p.autoSendEmail,
        autoApprove: p.autoApprove,
        paymentTerms: p.paymentTerms,
        subtotal: Number(p.subtotal),
        taxAmount: Number(p.taxAmount),
        totalAmount: Number(p.totalAmount),
        currencyCode: p.currencyCode,
        notes: p.notes,
        terms: p.terms,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        items: p.items.map((i: any) => ({
            id: i.id,
            recurringProfileId: i.recurringProfileId,
            productId: i.productId,
            description: i.description,
            hsnSacCode: i.hsnSacCode,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            cgstRate: Number(i.cgstRate || 0),
            cgstAmount: Number(i.cgstAmount || 0),
            sgstRate: Number(i.sgstRate || 0),
            sgstAmount: Number(i.sgstAmount || 0),
            igstRate: Number(i.igstRate || 0),
            igstAmount: Number(i.igstAmount || 0),
            discount: Number(i.discount || 0),
            lineTotal: Number(i.lineTotal),
            product: i.product,
        })),
        executions: p.executions.map((e: any) => ({
            id: e.id,
            recurringProfileId: e.recurringProfileId,
            invoiceId: e.invoiceId,
            invoice: e.invoice
                ? {
                      id: e.invoice.id,
                      invoiceNumber: e.invoice.invoiceNumber,
                      total: Number(e.invoice.total),
                      status: e.invoice.status,
                  }
                : null,
            executionDate: e.executionDate.toISOString().split("T")[0],
            status: e.status,
            amount: Number(e.amount),
            errorMessage: e.errorMessage,
        })),
        invoicesCount: p._count.invoices,
    }))

    // 2. Fetch customers
    const rawCustomers = await prisma.contact.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, displayName: true, companyName: true, email: true, billingAddress: true },
        orderBy: { displayName: "asc" },
    })

    // 3. Fetch products
    const rawProducts = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, sku: true, unitPrice: true },
        orderBy: { name: "asc" },
    })

    const products = rawProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice: Number(p.unitPrice),
        hsnSacCode: "998313",
    }))

    // 4. Fetch recent executions across all profiles
    const rawExecutions = await prisma.recurringExecution.findMany({
        where: { tenantId },
        include: {
            invoice: { select: { id: true, invoiceNumber: true, total: true, status: true } },
        },
        orderBy: { executionDate: "desc" },
        take: 25,
    })

    const executions: RecurringExecutionRecord[] = rawExecutions.map((e: any) => ({
        id: e.id,
        recurringProfileId: e.recurringProfileId,
        invoiceId: e.invoiceId,
        invoice: e.invoice
            ? {
                  id: e.invoice.id,
                  invoiceNumber: e.invoice.invoiceNumber,
                  total: Number(e.invoice.total),
                  status: e.invoice.status,
              }
            : null,
        executionDate: e.executionDate.toISOString().split("T")[0],
        status: e.status,
        amount: Number(e.amount),
        errorMessage: e.errorMessage,
    }))

    // 5. Compute KPIs
    const activeProfilesList = profiles.filter((p) => p.status === RecurringStatus.ACTIVE)
    const activeCount = activeProfilesList.length
    const totalCount = profiles.length

    let calculatedMrr = 0
    let totalRecurringValue = 0

    activeProfilesList.forEach((p) => {
        totalRecurringValue += p.totalAmount
        calculatedMrr += p.totalAmount * getMonthlyMultiplier(p.frequency)
    })

    const totalLifetimeInvoices = profiles.reduce((sum, p) => sum + p.invoicesCount, 0)

    const upcomingActiveRuns = activeProfilesList
        .map((p) => p.nextRunDate)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    const soonestNextRun = upcomingActiveRuns[0] || null

    return {
        profiles,
        customers: rawCustomers,
        products,
        executions,
        kpis: {
            activeProfiles: activeCount,
            totalProfiles: totalCount,
            mrr: Math.round(calculatedMrr),
            arr: Math.round(calculatedMrr * 12),
            totalRecurringValue,
            lifetimeInvoicesGenerated: totalLifetimeInvoices,
            soonestNextRun,
        },
    }
}

// ============================================
// CREATE RECURRING PROFILE
// ============================================

export async function createRecurringProfile(data: CreateRecurringProfileInput): Promise<{
    success?: boolean
    profileId?: string
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.title?.trim()) return { error: "Profile title is required" }
        if (!data.contactId) return { error: "Customer contact must be selected" }
        if (!data.startDate) return { error: "Start date is required" }
        if (!data.items || data.items.length === 0) return { error: "At least one line item is required" }

        // Generate profile code: REC-YYYY-XXXX
        const year = new Date().getFullYear()
        const count = await prisma.recurringProfile.count({ where: { tenantId } })
        const profileNumber = `REC-${year}-${String(count + 1).padStart(4, "0")}`

        // Calculate item totals & taxes
        let subtotal = 0
        let taxAmount = 0

        const computedItems = data.items.map((item) => {
            const qty = Number(item.quantity || 1)
            const unitPrice = Number(item.unitPrice || 0)
            const discount = Number(item.discount || 0)
            const baseAmount = Math.max(0, qty * unitPrice - discount)
            const taxRate = Number(item.taxRate || 0)

            // Split into CGST (half) and SGST (half) or IGST
            const cgstRate = taxRate / 2
            const sgstRate = taxRate / 2
            const cgstAmount = Math.round(baseAmount * (cgstRate / 100) * 100) / 100
            const sgstAmount = Math.round(baseAmount * (sgstRate / 100) * 100) / 100
            const itemTax = cgstAmount + sgstAmount
            const lineTotal = baseAmount + itemTax

            subtotal += baseAmount
            taxAmount += itemTax

            return {
                tenantId,
                productId: item.productId || null,
                description: item.description.trim(),
                hsnSacCode: item.hsnSacCode?.trim() || "998313",
                quantity: qty,
                unitPrice,
                cgstRate,
                cgstAmount,
                sgstRate,
                sgstAmount,
                igstRate: 0,
                igstAmount: 0,
                discount,
                lineTotal,
            }
        })

        const totalAmount = subtotal + taxAmount
        const startDate = new Date(data.startDate)
        const nextRunDate = startDate // first run starts on start date

        const result = await prisma.recurringProfile.create({
            data: {
                tenantId,
                profileNumber,
                title: data.title.trim(),
                description: data.description?.trim() || null,
                contactId: data.contactId,
                frequency: data.frequency || RecurringFrequency.MONTHLY,
                startDate,
                endDate: data.endDate ? new Date(data.endDate) : null,
                nextRunDate,
                maxCycles: data.maxCycles ? Number(data.maxCycles) : null,
                cyclesCompleted: 0,
                status: RecurringStatus.ACTIVE,
                autoSendEmail: !!data.autoSendEmail,
                autoApprove: data.autoApprove !== false,
                paymentTerms: data.paymentTerms || "NET_30",
                subtotal,
                taxAmount,
                totalAmount,
                currencyCode: data.currencyCode || "INR",
                notes: data.notes?.trim() || null,
                terms: data.terms?.trim() || null,
                items: {
                    create: computedItems,
                },
            },
        })

        revalidatePath("/sales/invoices/recurring")
        return { success: true, profileId: result.id }
    } catch (err: any) {
        console.error("createRecurringProfile error:", err)
        return { error: err.message || "Failed to create recurring profile" }
    }
}

// ============================================
// UPDATE RECURRING PROFILE
// ============================================

export async function updateRecurringProfile(
    id: string,
    data: Partial<CreateRecurringProfileInput>
): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const updateData: any = {}
        if (data.title !== undefined) updateData.title = data.title.trim()
        if (data.description !== undefined) updateData.description = data.description?.trim() || null
        if (data.contactId !== undefined) updateData.contactId = data.contactId
        if (data.frequency !== undefined) updateData.frequency = data.frequency
        if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null
        if (data.maxCycles !== undefined) updateData.maxCycles = data.maxCycles ? Number(data.maxCycles) : null
        if (data.autoSendEmail !== undefined) updateData.autoSendEmail = !!data.autoSendEmail
        if (data.autoApprove !== undefined) updateData.autoApprove = !!data.autoApprove
        if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms
        if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
        if (data.terms !== undefined) updateData.terms = data.terms?.trim() || null

        await prisma.recurringProfile.update({
            where: { id },
            data: updateData,
        })

        revalidatePath("/sales/invoices/recurring")
        return { success: true }
    } catch (err: any) {
        console.error("updateRecurringProfile error:", err)
        return { error: err.message || "Failed to update recurring profile" }
    }
}

// ============================================
// TOGGLE STATUS
// ============================================

export async function toggleRecurringProfileStatus(
    id: string,
    newStatus: RecurringStatus
): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        await prisma.recurringProfile.update({
            where: { id },
            data: { status: newStatus },
        })

        revalidatePath("/sales/invoices/recurring")
        return { success: true }
    } catch (err: any) {
        console.error("toggleRecurringProfileStatus error:", err)
        return { error: err.message || "Failed to change profile status" }
    }
}

// ============================================
// DELETE RECURRING PROFILE
// ============================================

export async function deleteRecurringProfile(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        await prisma.$transaction(async (tx: any) => {
            // Unlink created invoices
            await tx.invoice.updateMany({
                where: { recurringProfileId: id },
                data: { recurringProfileId: null },
            })

            // Delete profile (cascade deletes items and executions)
            await tx.recurringProfile.delete({
                where: { id },
            })
        })

        revalidatePath("/sales/invoices/recurring")
        return { success: true }
    } catch (err: any) {
        console.error("deleteRecurringProfile error:", err)
        return { error: err.message || "Failed to delete recurring profile" }
    }
}

// ============================================
// INSTANT INVOICE GENERATION (RUN NOW)
// ============================================

export async function triggerGenerateInvoice(profileId: string): Promise<{
    success?: boolean
    invoiceId?: string
    invoiceNumber?: string
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const profile = await prisma.recurringProfile.findUnique({
            where: { id: profileId },
            include: {
                contact: true,
                items: true,
            },
        })

        if (!profile) return { error: "Recurring profile not found" }
        if (profile.status === RecurringStatus.CANCELLED || profile.status === RecurringStatus.COMPLETED) {
            return { error: `Profile is currently ${profile.status}. Reactivate it before running.` }
        }

        const now = new Date()
        const year = now.getFullYear()

        // Generate sequential invoice number: INV-YYYY-XXXX
        const count = await prisma.invoice.count({ where: { tenantId } })
        const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`

        // Calculate due date based on payment terms
        const dueDate = new Date(now)
        let termsDays = 30
        if (profile.paymentTerms === "NET_15") termsDays = 15
        if (profile.paymentTerms === "NET_60") termsDays = 60
        if (profile.paymentTerms === "DUE_ON_RECEIPT") termsDays = 0
        dueDate.setDate(dueDate.getDate() + termsDays)

        // Contact bill to
        const billTo = {
            name: profile.contact.displayName,
            company: profile.contact.companyName || "",
            email: profile.contact.email || "",
            phone: profile.contact.phone || "",
            address: profile.contact.billingAddress || {},
        }

        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create Invoice
            const invoice = await tx.invoice.create({
                data: {
                    tenantId,
                    contactId: profile.contactId,
                    invoiceNumber,
                    type: InvoiceType.TAX_INVOICE,
                    status: profile.autoApprove ? InvoiceStatus.SENT : InvoiceStatus.DRAFT,
                    invoiceDate: now,
                    dueDate,
                    billTo,
                    subtotal: profile.subtotal,
                    taxAmount: profile.taxAmount,
                    total: profile.totalAmount,
                    currencyCode: profile.currencyCode,
                    paymentTerms: profile.paymentTerms || "NET_30",
                    notes: profile.notes || `Generated from recurring subscription schedule: ${profile.title}`,
                    terms: profile.terms,
                    recurringProfileId: profile.id,
                    items: {
                        create: profile.items.map((item: any) => ({
                            productId: item.productId,
                            description: item.description,
                            hsnSacCode: item.hsnSacCode,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            cgstRate: item.cgstRate,
                            cgstAmount: item.cgstAmount,
                            sgstRate: item.sgstRate,
                            sgstAmount: item.sgstAmount,
                            igstRate: item.igstRate,
                            igstAmount: item.igstAmount,
                            discount: item.discount,
                            lineTotal: item.lineTotal,
                        })),
                    },
                },
            })

            // 2. Advance cycles and compute nextRunDate
            const newCycles = profile.cyclesCompleted + 1
            const nextRun = computeNextRunDate(profile.nextRunDate, profile.frequency)
            let updatedStatus: RecurringStatus = profile.status

            if (profile.maxCycles && newCycles >= profile.maxCycles) {
                updatedStatus = RecurringStatus.COMPLETED
            }
            if (profile.endDate && nextRun > profile.endDate) {
                updatedStatus = RecurringStatus.COMPLETED
            }

            await tx.recurringProfile.update({
                where: { id: profile.id },
                data: {
                    cyclesCompleted: newCycles,
                    lastRunDate: now,
                    nextRunDate: nextRun,
                    status: updatedStatus,
                },
            })

            // 3. Log execution
            await tx.recurringExecution.create({
                data: {
                    tenantId,
                    recurringProfileId: profile.id,
                    invoiceId: invoice.id,
                    executionDate: now,
                    status: RecurringExecutionStatus.SUCCESS,
                    amount: profile.totalAmount,
                },
            })

            return invoice
        })

        revalidatePath("/sales/invoices")
        revalidatePath("/sales/invoices/recurring")

        return {
            success: true,
            invoiceId: result.id,
            invoiceNumber: result.invoiceNumber,
        }
    } catch (err: any) {
        console.error("triggerGenerateInvoice error:", err)
        return { error: err.message || "Failed to trigger recurring invoice generation" }
    }
}

// ============================================
// BATCH RUN DUE PROFILES
// ============================================

export async function batchRunDueRecurringProfiles(): Promise<{
    success?: boolean
    executedCount?: number
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const now = new Date()
        const dueProfiles = await prisma.recurringProfile.findMany({
            where: {
                tenantId,
                status: RecurringStatus.ACTIVE,
                nextRunDate: { lte: now },
            },
        })

        let executedCount = 0

        for (const p of dueProfiles) {
            const res = await triggerGenerateInvoice(p.id)
            if (res.success) {
                executedCount++
            }
        }

        revalidatePath("/sales/invoices/recurring")
        return { success: true, executedCount }
    } catch (err: any) {
        console.error("batchRunDueRecurringProfiles error:", err)
        return { error: err.message || "Failed to execute due profiles" }
    }
}

// ============================================
// AUTO SEEDER (IF EMPTY)
// ============================================

export async function autoSeedRecurringProfilesIfEmpty(tenantId: string): Promise<void> {
    const count = await prisma.recurringProfile.count({ where: { tenantId } })
    if (count > 0) return

    // Find contacts
    const contacts = await prisma.contact.findMany({
        where: { tenantId, isActive: true },
        take: 3,
    })
    if (contacts.length === 0) return

    // Find products
    const products = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        take: 3,
    })

    const year = new Date().getFullYear()
    const now = new Date()

    // 1. Monthly Retainer
    const p1Date = new Date(now.getFullYear(), now.getMonth(), 1)
    const p1Next = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    await prisma.recurringProfile.create({
        data: {
            tenantId,
            profileNumber: `REC-${year}-0001`,
            title: "Enterprise Cloud Managed DevOps & SRE Retainer",
            description: "24/7 Production Kubernetes cluster monitoring, security hardening, CI/CD pipeline maintenance, and disaster recovery SLA.",
            contactId: contacts[0].id,
            frequency: RecurringFrequency.MONTHLY,
            startDate: p1Date,
            nextRunDate: p1Next,
            lastRunDate: p1Date,
            cyclesCompleted: 3,
            status: RecurringStatus.ACTIVE,
            autoSendEmail: true,
            autoApprove: true,
            paymentTerms: "NET_30",
            subtotal: 85000,
            taxAmount: 15300,
            totalAmount: 100300,
            currencyCode: "INR",
            notes: "Monthly retainer payable by 1st of every month via NEFT/RTGS.",
            terms: "Includes 40 hours of dedicated senior cloud architect consultation per calendar month.",
            items: {
                create: [
                    {
                        tenantId,
                        productId: products[0]?.id || null,
                        description: "Cloud Managed SRE & DevOps Infrastructure Retainer",
                        hsnSacCode: "998313",
                        quantity: 1,
                        unitPrice: 65000,
                        cgstRate: 9,
                        cgstAmount: 5850,
                        sgstRate: 9,
                        sgstAmount: 5850,
                        igstRate: 0,
                        igstAmount: 0,
                        discount: 0,
                        lineTotal: 76700,
                    },
                    {
                        tenantId,
                        productId: products[1]?.id || null,
                        description: "24/7 Critical Incident Response SLA & Health Audits",
                        hsnSacCode: "998314",
                        quantity: 1,
                        unitPrice: 20000,
                        cgstRate: 9,
                        cgstAmount: 1800,
                        sgstRate: 9,
                        sgstAmount: 1800,
                        igstRate: 0,
                        igstAmount: 0,
                        discount: 0,
                        lineTotal: 23600,
                    },
                ],
            },
        },
    })

    // 2. Annual SaaS License
    if (contacts.length > 1) {
        const p2Date = new Date(now.getFullYear(), 0, 15)
        const p2Next = new Date(now.getFullYear() + 1, 0, 15)

        await prisma.recurringProfile.create({
            data: {
                tenantId,
                profileNumber: `REC-${year}-0002`,
                title: "Annual Enterprise ERP Core Platform License & AMC",
                description: "Corporate multi-subsidiary cloud ERP hosting, database clustering, and platinum priority vendor support.",
                contactId: contacts[1].id,
                frequency: RecurringFrequency.ANNUALLY,
                startDate: p2Date,
                nextRunDate: p2Next,
                lastRunDate: p2Date,
                cyclesCompleted: 1,
                status: RecurringStatus.ACTIVE,
                autoSendEmail: true,
                autoApprove: true,
                paymentTerms: "NET_30",
                subtotal: 240000,
                taxAmount: 43200,
                totalAmount: 283200,
                currencyCode: "INR",
                notes: "Annual software subscription renewal.",
                terms: "Includes regular version updates, compliance patches, and priority telephone support.",
                items: {
                    create: [
                        {
                            tenantId,
                            productId: products[0]?.id || null,
                            description: "Enterprise ERP Cloud Platform Annual Subscription (Up to 100 Users)",
                            hsnSacCode: "997331",
                            quantity: 1,
                            unitPrice: 200000,
                            cgstRate: 9,
                            cgstAmount: 18000,
                            sgstRate: 9,
                            sgstAmount: 18000,
                            igstRate: 0,
                            igstAmount: 0,
                            discount: 0,
                            lineTotal: 236000,
                        },
                        {
                            tenantId,
                            productId: products[1]?.id || null,
                            description: "Annual Maintenance Contract (AMC) & Dedicated SLA",
                            hsnSacCode: "998717",
                            quantity: 1,
                            unitPrice: 40000,
                            cgstRate: 9,
                            cgstAmount: 3600,
                            sgstRate: 9,
                            sgstAmount: 3600,
                            igstRate: 0,
                            igstAmount: 0,
                            discount: 0,
                            lineTotal: 47200,
                        },
                    ],
                },
            },
        })
    }

    // 3. Quarterly SLA
    if (contacts.length > 2) {
        const p3Date = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        const p3Next = new Date(p3Date)
        p3Next.setMonth(p3Next.getMonth() + 3)

        await prisma.recurringProfile.create({
            data: {
                tenantId,
                profileNumber: `REC-${year}-0003`,
                title: "Quarterly Database Cluster Replication & High-Availability SLA",
                description: "Continuous write-ahead logging synchronization, disaster recovery failover drill, and query latency optimization.",
                contactId: contacts[2].id,
                frequency: RecurringFrequency.QUARTERLY,
                startDate: p3Date,
                nextRunDate: p3Next,
                lastRunDate: p3Date,
                cyclesCompleted: 2,
                status: RecurringStatus.ACTIVE,
                autoSendEmail: false,
                autoApprove: true,
                paymentTerms: "NET_15",
                subtotal: 45000,
                taxAmount: 8100,
                totalAmount: 53100,
                currencyCode: "INR",
                notes: "Quarterly preventative maintenance and security patching.",
                items: {
                    create: [
                        {
                            tenantId,
                            productId: products[0]?.id || null,
                            description: "Quarterly Multi-AZ Database Replication & Automated Backup SLA",
                            hsnSacCode: "998315",
                            quantity: 1,
                            unitPrice: 45000,
                            cgstRate: 9,
                            cgstAmount: 4050,
                            sgstRate: 9,
                            sgstAmount: 4050,
                            igstRate: 0,
                            igstAmount: 0,
                            discount: 0,
                            lineTotal: 53100,
                        },
                    ],
                },
            },
        })
    }
}
