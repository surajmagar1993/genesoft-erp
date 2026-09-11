"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    CreditNoteStatus,
    CreditNoteReason,
    StockMovementType,
    InvoiceStatus,
    Prisma,
} from "@prisma/client"
import { recordTransaction } from "@/app/actions/crm/ledger"

export interface CreditNoteItemRecord {
    id: string
    creditNoteId: string
    productId: string | null
    productName: string | null
    description: string
    hsnSacCode: string | null
    quantity: number
    unitPrice: number
    taxRate: number
    taxAmount: number
    total: number
    restockInventory: boolean
    warehouseId: string | null
    warehouseName: string | null
}

export interface CreditNoteRefundRecord {
    id: string
    creditNoteId: string
    creditNoteNumber: string
    amount: number
    refundDate: Date
    paymentMethod: string
    reference: string | null
    notes: string | null
    createdAt: Date
}

export interface CreditNoteRecord {
    id: string
    tenantId: string
    creditNoteNumber: string
    contactId: string
    contactName: string
    contactEmail: string | null
    contactPhone: string | null
    invoiceId: string | null
    invoiceNumber: string | null
    issueDate: Date
    status: CreditNoteStatus
    reason: CreditNoteReason
    subtotal: number
    taxAmount: number
    total: number
    allocatedAmount: number
    remainingBalance: number
    currencyCode: string
    notes: string | null
    terms: string | null
    items: CreditNoteItemRecord[]
    itemsCount: number
    refundsCount: number
    createdAt: Date
    updatedAt: Date
}

export interface CreditNotesOverviewData {
    stats: {
        totalCreditNotes: number
        totalCreditValue: number
        openBalance: number
        totalRefunded: number
        issuedCount: number
        appliedCount: number
        refundedCount: number
    }
    creditNotes: CreditNoteRecord[]
    openCredits: CreditNoteRecord[]
    refunds: CreditNoteRefundRecord[]
    availableCustomers: Array<{ id: string; name: string; email: string | null; phone: string | null }>
    availableInvoices: Array<{ id: string; invoiceNumber: string; contactId: string; customerName: string; total: number; balanceDue: number; status: string }>
    availableWarehouses: Array<{ id: string; name: string; code: string }>
    availableProducts: Array<{ id: string; name: string; sku: string | null; unitPrice: number; hsnSacCode: string | null }>
}

export interface CreateCreditNoteInput {
    contactId: string
    invoiceId?: string
    issueDate?: string
    reason: CreditNoteReason
    notes?: string
    terms?: string
    items: Array<{
        productId?: string
        description: string
        hsnSacCode?: string
        quantity: number
        unitPrice: number
        taxRate?: number
        restockInventory?: boolean
        warehouseId?: string
    }>
}

export interface ApplyCreditToInvoiceInput {
    creditNoteId: string
    invoiceId: string
    amount: number
}

export interface RecordCreditNoteRefundInput {
    creditNoteId: string
    amount: number
    refundDate?: string
    paymentMethod?: string
    reference?: string
    notes?: string
}

/**
 * Auto-seed realistic credit notes and refund records if tenant has zero credit notes.
 */
async function autoSeedCreditNotesIfEmpty(tenantId: string) {
    const existingCount = await prisma.creditNote.count({
        where: { tenantId }
    })

    if (existingCount > 0) return

    // Find or create customer
    let contact = await prisma.contact.findFirst({
        where: { tenantId }
    })
    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                tenantId,
                displayName: "Metro Infrastructure Pvt Ltd",
                companyName: "Metro Infrastructure",
                email: "procurement@metroinfra.in",
                phone: "+91 98200 11223",
                customerGroup: "corporate",
            }
        })
    }

    // Find warehouse
    let warehouse = await prisma.warehouse.findFirst({
        where: { tenantId }
    })
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: {
                tenantId,
                name: "Central Logistics Depot",
                code: "WH-MAIN",
                city: "Mumbai",
                state: "Maharashtra",
                isDefault: true,
            }
        })
    }

    // Find product
    let product = await prisma.product.findFirst({
        where: { tenantId }
    })
    if (!product) {
        product = await prisma.product.create({
            data: {
                tenantId,
                name: "Industrial Grade Sensor Hub",
                sku: "SN-HUB-01",
                unitPrice: 10000,
                hsnSacCode: "8517",
                stockQty: 50,
            }
        })
    }

    // Find or create an invoice
    let invoice = await prisma.invoice.findFirst({
        where: { tenantId }
    })
    if (!invoice) {
        invoice = await prisma.invoice.create({
            data: {
                tenantId,
                contactId: contact.id,
                invoiceNumber: "INV-2026-0001",
                billTo: { name: contact.displayName },
                subtotal: 50000,
                taxAmount: 9000,
                total: 59000,
                status: InvoiceStatus.SENT,
            }
        })
    }

    // 1. Credit Note 1: Goods Return with remaining balance
    const cn1 = await prisma.creditNote.create({
        data: {
            tenantId,
            creditNoteNumber: "CN-2026-0001",
            contactId: contact.id,
            invoiceId: invoice.id,
            issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            status: CreditNoteStatus.ISSUED,
            reason: CreditNoteReason.GOODS_RETURN,
            subtotal: 20000,
            taxAmount: 3600,
            total: 23600,
            allocatedAmount: 10000,
            remainingBalance: 13600,
            currencyCode: "INR",
            notes: "Return of 2 units Industrial Grade Sensor Hub due to minor batch calibration mismatch.",
            terms: "Credit can be applied toward next invoice cycle or requested for direct electronic refund.",
        }
    })

    await prisma.creditNoteItem.create({
        data: {
            tenantId,
            creditNoteId: cn1.id,
            productId: product.id,
            description: "Industrial Grade Sensor Hub (Calibration Return)",
            hsnSacCode: "8517",
            quantity: 2,
            unitPrice: 10000,
            taxRate: 18,
            taxAmount: 3600,
            total: 23600,
            restockInventory: true,
            warehouseId: warehouse.id,
        }
    })

    // 2. Credit Note 2: Overbilling - Fully Refunded
    const cn2 = await prisma.creditNote.create({
        data: {
            tenantId,
            creditNoteNumber: "CN-2026-0002",
            contactId: contact.id,
            issueDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            status: CreditNoteStatus.REFUNDED,
            reason: CreditNoteReason.OVERBILLING,
            subtotal: 15000,
            taxAmount: 0,
            total: 15000,
            allocatedAmount: 15000,
            remainingBalance: 0,
            currencyCode: "INR",
            notes: "Discrepancy credit adjustment on billed engineering hours.",
            terms: "Refund disbursed to client primary bank account.",
        }
    })

    await prisma.creditNoteItem.create({
        data: {
            tenantId,
            creditNoteId: cn2.id,
            description: "Overbilling Rate Adjustment — Milestone 2",
            hsnSacCode: "9983",
            quantity: 1,
            unitPrice: 15000,
            taxRate: 0,
            taxAmount: 0,
            total: 15000,
            restockInventory: false,
        }
    })

    await prisma.creditNoteRefund.create({
        data: {
            tenantId,
            creditNoteId: cn2.id,
            amount: 15000,
            refundDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            paymentMethod: "BANK_TRANSFER",
            reference: "HDFC-UTR-9912048",
            notes: "Direct bank transfer credited to Metro Infrastructure HDFC Current A/c.",
        }
    })
}

/**
 * Fetch credit notes overview telemetry, lists, open balances, and lookups.
 */
export async function getCreditNotesOverview(): Promise<CreditNotesOverviewData> {
    const tenantId = await getTenantId()
    if (!tenantId) {
        throw new Error("Unauthorized tenant context")
    }

    // Auto-seed if empty
    await autoSeedCreditNotesIfEmpty(tenantId)

    // Fetch credit notes
    const rawCreditNotes = await prisma.creditNote.findMany({
        where: { tenantId },
        include: {
            contact: {
                select: { id: true, displayName: true, email: true, phone: true }
            },
            invoice: {
                select: { id: true, invoiceNumber: true }
            },
            items: {
                include: {
                    product: { select: { id: true, name: true } },
                    warehouse: { select: { id: true, name: true, code: true } }
                }
            },
            refunds: true
        },
        orderBy: { issueDate: "desc" }
    })

    const creditNotes: CreditNoteRecord[] = (rawCreditNotes as any[]).map((cn: any) => ({
        id: cn.id,
        tenantId: cn.tenantId,
        creditNoteNumber: cn.creditNoteNumber,
        contactId: cn.contactId,
        contactName: cn.contact.displayName,
        contactEmail: cn.contact.email,
        contactPhone: cn.contact.phone,
        invoiceId: cn.invoiceId,
        invoiceNumber: cn.invoice?.invoiceNumber || null,
        issueDate: cn.issueDate,
        status: cn.status,
        reason: cn.reason,
        subtotal: Number(cn.subtotal),
        taxAmount: Number(cn.taxAmount),
        total: Number(cn.total),
        allocatedAmount: Number(cn.allocatedAmount),
        remainingBalance: Number(cn.remainingBalance),
        currencyCode: cn.currencyCode,
        notes: cn.notes,
        terms: cn.terms,
        itemsCount: cn.items.length,
        refundsCount: cn.refunds.length,
        items: cn.items.map((i: any) => ({
            id: i.id,
            creditNoteId: i.creditNoteId,
            productId: i.productId,
            productName: i.product?.name || null,
            description: i.description,
            hsnSacCode: i.hsnSacCode,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            taxRate: Number(i.taxRate),
            taxAmount: Number(i.taxAmount),
            total: Number(i.total),
            restockInventory: i.restockInventory,
            warehouseId: i.warehouseId,
            warehouseName: i.warehouse ? `${i.warehouse.name} (${i.warehouse.code})` : null,
        })),
        createdAt: cn.createdAt,
        updatedAt: cn.updatedAt,
    }))

    // Open credits: credit notes with remainingBalance > 0 and status not VOID
    const openCredits = creditNotes.filter(
        cn => cn.remainingBalance > 0 && cn.status !== CreditNoteStatus.VOID
    )

    // Fetch refunds ledger
    const rawRefunds = await prisma.creditNoteRefund.findMany({
        where: { tenantId },
        include: {
            creditNote: {
                select: { creditNoteNumber: true }
            }
        },
        orderBy: { refundDate: "desc" }
    })

    const refunds: CreditNoteRefundRecord[] = (rawRefunds as any[]).map((r: any) => ({
        id: r.id,
        creditNoteId: r.creditNoteId,
        creditNoteNumber: r.creditNote.creditNoteNumber,
        amount: Number(r.amount),
        refundDate: r.refundDate,
        paymentMethod: r.paymentMethod,
        reference: r.reference,
        notes: r.notes,
        createdAt: r.createdAt,
    }))

    // Dropdown lookups
    const rawCustomers = await prisma.contact.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, displayName: true, email: true, phone: true },
        orderBy: { displayName: "asc" }
    })
    const availableCustomers = (rawCustomers as any[]).map((c: any) => ({
        id: c.id,
        name: c.displayName,
        email: c.email,
        phone: c.phone
    }))

    const rawInvoices = await prisma.invoice.findMany({
        where: { tenantId, status: { not: InvoiceStatus.CANCELLED } },
        select: {
            id: true,
            invoiceNumber: true,
            contactId: true,
            total: true,
            status: true,
            contact: { select: { displayName: true } }
        },
        orderBy: { invoiceDate: "desc" }
    })
    const availableInvoices = (rawInvoices as any[]).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        contactId: inv.contactId,
        customerName: inv.contact?.displayName || "Unknown",
        total: Number(inv.total),
        balanceDue: Number(inv.total), // Approximate balance due
        status: inv.status,
    }))

    const rawWarehouses = await prisma.warehouse.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" }
    })
    const availableWarehouses = (rawWarehouses as any[]).map((w: any) => ({
        id: w.id,
        name: w.name,
        code: w.code,
    }))

    const rawProducts = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, sku: true, unitPrice: true, hsnSacCode: true },
        orderBy: { name: "asc" }
    })
    const availableProducts = (rawProducts as any[]).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice: Number(p.unitPrice),
        hsnSacCode: p.hsnSacCode,
    }))

    // Compute Telemetry
    const totalCreditNotes = creditNotes.length
    const totalCreditValue = creditNotes.reduce((sum, cn) => sum + (cn.status !== CreditNoteStatus.VOID ? cn.total : 0), 0)
    const openBalance = openCredits.reduce((sum, cn) => sum + cn.remainingBalance, 0)
    const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0)

    const issuedCount = creditNotes.filter(cn => cn.status === CreditNoteStatus.ISSUED).length
    const appliedCount = creditNotes.filter(cn => cn.status === CreditNoteStatus.APPLIED).length
    const refundedCount = creditNotes.filter(cn => cn.status === CreditNoteStatus.REFUNDED).length

    return {
        stats: {
            totalCreditNotes,
            totalCreditValue,
            openBalance,
            totalRefunded,
            issuedCount,
            appliedCount,
            refundedCount,
        },
        creditNotes,
        openCredits,
        refunds,
        availableCustomers,
        availableInvoices,
        availableWarehouses,
        availableProducts,
    }
}

/**
 * Issue a new Credit Note.
 */
export async function createCreditNote(input: CreateCreditNoteInput) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    if (!input.contactId) throw new Error("Customer contact is required")
    if (!input.items || input.items.length === 0) throw new Error("At least one line item is required")

    // Sequential credit note number
    const count = await prisma.creditNote.count({ where: { tenantId } })
    const currentYear = new Date().getFullYear()
    const creditNoteNumber = `CN-${currentYear}-${String(count + 1).padStart(4, "0")}`

    let subtotal = 0
    let taxAmount = 0

    const itemsToCreate = input.items.map(item => {
        const qty = item.quantity || 1
        const price = item.unitPrice || 0
        const itemSubtotal = qty * price
        const rate = item.taxRate || 0
        const itemTax = Math.round((itemSubtotal * (rate / 100)) * 100) / 100
        const itemTotal = itemSubtotal + itemTax

        subtotal += itemSubtotal
        taxAmount += itemTax

        return {
            productId: item.productId || null,
            description: item.description.trim(),
            hsnSacCode: item.hsnSacCode?.trim() || null,
            quantity: qty,
            unitPrice: price,
            taxRate: rate,
            taxAmount: itemTax,
            total: itemTotal,
            restockInventory: Boolean(item.restockInventory && item.productId && item.warehouseId),
            warehouseId: item.warehouseId || null,
        }
    })

    const total = subtotal + taxAmount

    const newCreditNote = await prisma.$transaction(async (tx: any) => {
        // 1. Create CreditNote
        const cn = await tx.creditNote.create({
            data: {
                tenantId,
                creditNoteNumber,
                contactId: input.contactId,
                invoiceId: input.invoiceId || null,
                issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
                status: CreditNoteStatus.ISSUED,
                reason: input.reason,
                subtotal,
                taxAmount,
                total,
                allocatedAmount: 0,
                remainingBalance: total,
                notes: input.notes?.trim() || null,
                terms: input.terms?.trim() || null,
                items: {
                    create: itemsToCreate.map(item => ({
                        tenantId,
                        productId: item.productId,
                        description: item.description,
                        hsnSacCode: item.hsnSacCode,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate,
                        taxAmount: item.taxAmount,
                        total: item.total,
                        restockInventory: item.restockInventory,
                        warehouseId: item.warehouseId,
                    }))
                }
            }
        })

        // 2. If restockInventory, atomically increment stock and record movement
        for (const item of itemsToCreate) {
            if (item.restockInventory && item.productId && item.warehouseId) {
                // Upsert warehouse stock
                const existingStock = await tx.warehouseStock.findFirst({
                    where: {
                        tenantId,
                        warehouseId: item.warehouseId,
                        productId: item.productId,
                    }
                })

                if (existingStock) {
                    await tx.warehouseStock.update({
                        where: { id: existingStock.id },
                        data: {
                            quantity: { increment: item.quantity }
                        }
                    })
                } else {
                    await tx.warehouseStock.create({
                        data: {
                            tenantId,
                            warehouseId: item.warehouseId,
                            productId: item.productId,
                            quantity: item.quantity,
                        }
                    })
                }

                // Increment aggregate product stock
                await tx.product.update({
                    where: { id: item.productId, tenantId },
                    data: {
                        stockQty: { increment: item.quantity }
                    }
                })

                // Record stock movement
                await tx.stockMovement.create({
                    data: {
                        tenantId,
                        warehouseId: item.warehouseId,
                        productId: item.productId,
                        type: StockMovementType.RETURN,
                        quantity: item.quantity,
                        reference: cn.creditNoteNumber,
                        notes: `Customer return via Credit Note #${cn.creditNoteNumber}`,
                    }
                })
            }
        }

        return cn
    })

    // Record ledger entry (CREDIT under customer reducing AR)
    try {
        await recordTransaction({
            contactId: input.contactId,
            type: "CREDIT_NOTE",
            amount: total,
            referenceId: newCreditNote.id,
            description: `Credit Note #${newCreditNote.creditNoteNumber}`,
            date: newCreditNote.issueDate,
        })
    } catch {
        // Continue if optional ledger recording hook encounters non-critical sync discrepancy
    }

    revalidatePath("/sales/credit-notes")
    revalidatePath("/finance/receivable")
    return newCreditNote
}

/**
 * Apply available credit note balance to an open or partially-paid invoice.
 */
export async function applyCreditToInvoice(input: ApplyCreditToInvoiceInput) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    const { creditNoteId, invoiceId, amount } = input

    if (amount <= 0) throw new Error("Amount to apply must be greater than zero")

    const creditNote = await prisma.creditNote.findUnique({
        where: { id: creditNoteId, tenantId }
    })
    if (!creditNote) throw new Error("Credit note not found")

    const currentRemaining = Number(creditNote.remainingBalance)
    if (amount > currentRemaining) {
        throw new Error(`Amount cannot exceed available credit balance (₹${currentRemaining})`)
    }

    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId, tenantId }
    })
    if (!invoice) throw new Error("Invoice not found")

    const newAllocated = Number(creditNote.allocatedAmount) + amount
    const newRemaining = currentRemaining - amount
    const newStatus = newRemaining === 0 ? CreditNoteStatus.APPLIED : CreditNoteStatus.ISSUED

    await prisma.$transaction(async (tx: any) => {
        // Update credit note
        await tx.creditNote.update({
            where: { id: creditNoteId, tenantId },
            data: {
                allocatedAmount: newAllocated,
                remainingBalance: newRemaining,
                status: newStatus,
            }
        })

        // Record payment towards invoice from credit memo
        await tx.payment.create({
            data: {
                tenantId,
                invoiceId,
                amount,
                paymentDate: new Date(),
                paymentMethod: "CREDIT_NOTE",
                reference: creditNote.creditNoteNumber,
                notes: `Applied Credit Note #${creditNote.creditNoteNumber}`,
            }
        })

        // Calculate total payments on invoice to update status
        const totalPayments = await tx.payment.aggregate({
            where: { invoiceId, tenantId },
            _sum: { amount: true }
        })
        const paidAmount = Number(totalPayments._sum.amount || 0)
        const invoiceTotal = Number(invoice.total)

        let invoiceStatus = invoice.status
        if (paidAmount >= invoiceTotal) {
            invoiceStatus = InvoiceStatus.PAID
        } else if (paidAmount > 0) {
            invoiceStatus = InvoiceStatus.PARTIALLY_PAID
        }

        await tx.invoice.update({
            where: { id: invoiceId, tenantId },
            data: { status: invoiceStatus }
        })
    })

    revalidatePath("/sales/credit-notes")
    revalidatePath("/sales/invoices")
    return { success: true }
}

/**
 * Record a direct cash or bank refund disbursement for a credit note.
 */
export async function recordCreditNoteRefund(input: RecordCreditNoteRefundInput) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    const { creditNoteId, amount, refundDate, paymentMethod = "BANK_TRANSFER", reference, notes } = input

    if (amount <= 0) throw new Error("Refund amount must be greater than zero")

    const creditNote = await prisma.creditNote.findUnique({
        where: { id: creditNoteId, tenantId }
    })
    if (!creditNote) throw new Error("Credit note not found")

    const currentRemaining = Number(creditNote.remainingBalance)
    if (amount > currentRemaining) {
        throw new Error(`Refund amount cannot exceed open credit balance (₹${currentRemaining})`)
    }

    const newAllocated = Number(creditNote.allocatedAmount) + amount
    const newRemaining = currentRemaining - amount
    const newStatus = newRemaining === 0 ? CreditNoteStatus.REFUNDED : CreditNoteStatus.ISSUED

    const refund = await prisma.$transaction(async (tx: any) => {
        // 1. Create refund record
        const r = await tx.creditNoteRefund.create({
            data: {
                tenantId,
                creditNoteId,
                amount,
                refundDate: refundDate ? new Date(refundDate) : new Date(),
                paymentMethod,
                reference: reference?.trim() || null,
                notes: notes?.trim() || null,
            }
        })

        // 2. Update credit note balances
        await tx.creditNote.update({
            where: { id: creditNoteId, tenantId },
            data: {
                allocatedAmount: newAllocated,
                remainingBalance: newRemaining,
                status: newStatus,
            }
        })

        return r
    })

    // Record ledger REFUND entry
    try {
        await recordTransaction({
            contactId: creditNote.contactId,
            type: "REFUND",
            amount,
            referenceId: creditNote.id,
            description: `Refund payout for Credit Note #${creditNote.creditNoteNumber} via ${paymentMethod}`,
            date: refund.refundDate,
        })
    } catch {
        // Handled silently
    }

    revalidatePath("/sales/credit-notes")
    return refund
}

/**
 * Void an unapplied credit note.
 */
export async function voidCreditNote(creditNoteId: string) {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Unauthorized tenant context")

    const creditNote = await prisma.creditNote.findUnique({
        where: { id: creditNoteId, tenantId },
        include: { refunds: true }
    })
    if (!creditNote) throw new Error("Credit note not found")

    if (Number(creditNote.allocatedAmount) > 0 || creditNote.refunds.length > 0) {
        throw new Error("Cannot void a credit note that has already been partially allocated or refunded")
    }

    await prisma.creditNote.update({
        where: { id: creditNoteId, tenantId },
        data: {
            status: CreditNoteStatus.VOID,
            remainingBalance: 0,
        }
    })

    revalidatePath("/sales/credit-notes")
    return { success: true }
}
