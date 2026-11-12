"use server"

import { prisma } from "@/lib/prisma"
import { nextSequence } from "@/lib/sequence"
import { isDemoSeedEnabled } from "@/lib/demo-seed"
import { getTenantId, getTenantManagerId } from "@/lib/get-tenant-id"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { revalidatePath } from "next/cache"
import { CREDIT_APPLICATION_PREFIX, postToLedger } from "@/lib/ledger"
import {
    CreditNoteStatus,
    CreditNoteReason,
    StockMovementType,
    InvoiceStatus,
    Prisma,
} from "@prisma/client"
import { recordContactTransaction } from "@/lib/contact-ledger"
import { logTenantAudit } from "@/lib/tenant-audit"
import { safeAction } from "@/lib/safe-action"
import { reportCaught } from "@/lib/error-reporting"
import { getTenantTaxContext } from "@/lib/tenant-tax"
import { postInvoiceStock } from "@/lib/stock"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "sales" as const

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
    const tenantId = await getTenantId(MODULE)
    if (!tenantId) {
        throw new Error("Unauthorized tenant context")
    }

    // Auto-seed if empty
    if (isDemoSeedEnabled()) await autoSeedCreditNotesIfEmpty(tenantId)

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

    const creditNotes: CreditNoteRecord[] = rawCreditNotes.map((cn) => ({
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
        items: cn.items.map((i) => ({
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

    const refunds: CreditNoteRefundRecord[] = (rawRefunds).map((r) => ({
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
    const availableCustomers = (rawCustomers).map((c) => ({
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
    const availableInvoices = (rawInvoices).map((inv) => ({
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
    const availableWarehouses = (rawWarehouses).map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
    }))

    const rawProducts = await prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, sku: true, unitPrice: true, hsnSacCode: true },
        orderBy: { name: "asc" }
    })
    const availableProducts = (rawProducts).map((p) => ({
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
async function _createCreditNote(input: CreateCreditNoteInput) {
    const tenantId = await getTenantManagerId(MODULE)
    if (!input.contactId) throw new Error("Customer contact is required")
    if (!Array.isArray(input.items) || input.items.length === 0) throw new Error("At least one line item is required")
    await assertTenantRefs(tenantId, { contact: input.contactId, invoice: input.invoiceId, product: input.items.map((i) => i.productId), warehouse: input.items.map((i) => i.warehouseId) })
    for (const [i, item] of input.items.entries()) {
        if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error(`Line ${i + 1}: enter a quantity above zero`)
        if (typeof item.unitPrice !== "number" || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) throw new Error(`Line ${i + 1}: enter a price of zero or more`)
        const rate = item.taxRate ?? 0
        if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error(`Line ${i + 1}: tax must be between 0 and 100%`)
        if (!String(item.description || "").trim()) throw new Error(`Line ${i + 1}: enter a description`)
    }

    // The note is in the invoice's currency, or the business's own when it isn't tied to an invoice
    const sourceInvoice = input.invoiceId
        ? await prisma.invoice.findFirst({
              where: { id: input.invoiceId, tenantId },
              select: { contactId: true, total: true, currencyCode: true, type: true, invoiceNumber: true, creditNotes: { where: { status: { not: CreditNoteStatus.VOID } }, select: { total: true } } },
          })
        : null
    if (sourceInvoice && sourceInvoice.contactId !== input.contactId) throw new Error("This invoice belongs to a different customer")
    if (sourceInvoice?.type === "PROFORMA") throw new Error("A credit note can't be issued against a proforma invoice")
    const currencyCode = sourceInvoice?.currencyCode || (await getTenantTaxContext(tenantId)).currency

    // Sequential credit note number
    const currentYear = new Date().getFullYear()
    const creditNoteNumber = await nextSequence(prisma, "creditNote", tenantId, `CN-${currentYear}-`, 4)

    let subtotal = 0
    let taxAmount = 0

    const itemsToCreate = input.items.map(item => {
        const qty = item.quantity
        const price = item.unitPrice
        const itemSubtotal = Math.round(qty * price * 100) / 100
        const rate = item.taxRate ?? 0
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

    subtotal = Math.round(subtotal * 100) / 100
    taxAmount = Math.round(taxAmount * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100
    if (!(total > 0)) throw new Error("The credit note total must be more than zero")
    if (sourceInvoice) {
        // All credit against one invoice can't come to more than the invoice itself
        const alreadyCredited = sourceInvoice.creditNotes.reduce((sum: number, cn: { total: unknown }) => sum + Number(cn.total), 0)
        const room = Math.round((Number(sourceInvoice.total) - alreadyCredited) * 100) / 100
        if (total > room + 0.005) {
            throw new Error(`Invoice ${sourceInvoice.invoiceNumber} has ${currencyCode} ${Math.max(0, room).toFixed(2)} left that can be credited; this note is ${currencyCode} ${total.toFixed(2)}.`)
        }
    }

    const newCreditNote = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
                currencyCode,
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
                        previousQty: existingStock ? Number(existingStock.quantity) : 0,
                        newQty: (existingStock ? Number(existingStock.quantity) : 0) + Number(item.quantity),
                        referenceNo: cn.creditNoteNumber,
                        reason: `Customer return via Credit Note #${cn.creditNoteNumber}`,
                    }
                })
            }
        }

        return cn
    })

    // Record ledger entry (CREDIT under customer reducing AR)
    try {
        await recordContactTransaction(tenantId, {
            contactId: input.contactId,
            type: "CREDIT_NOTE",
            amount: -Math.abs(total), // the customer owes less
            currencyCode,
            referenceId: newCreditNote.id,
            description: `Credit Note #${newCreditNote.creditNoteNumber}`,
            date: newCreditNote.issueDate,
        })
    } catch (err) {
        await reportCaught(err, "createCreditNote: customer balance entry", { tenantId, creditNoteId: newCreditNote.id })
    }

    await postToLedger(tenantId, { kind: "creditNote", id: newCreditNote.id })

    revalidatePath("/sales/credit-notes")
    revalidatePath("/finance/receivable")
    return { id: newCreditNote.id, creditNoteNumber: newCreditNote.creditNoteNumber }
}

/**
 * Apply available credit note balance to an open or partially-paid invoice.
 */
async function _applyCreditToInvoice(input: ApplyCreditToInvoiceInput) {
    const tenantId = await getTenantManagerId(MODULE)
    if (!tenantId) throw new Error("Unauthorized tenant context")

    const { creditNoteId, invoiceId } = input
    const amount = Math.round(Number(input.amount) * 100) / 100
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount to apply must be greater than zero")

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Lock both documents, so two saves at the same moment can't use the same credit twice
        const noteRows: { id: string }[] = await tx.$queryRaw`select id from credit_notes where id = ${creditNoteId}::uuid and tenant_id = ${tenantId}::uuid for update`
        if (noteRows.length === 0) throw new Error("Credit note not found")
        const creditNote = await tx.creditNote.findFirstOrThrow({ where: { id: creditNoteId, tenantId } })
        if (creditNote.status === CreditNoteStatus.VOID) throw new Error("This credit note has been voided")

        const invoiceRows: { id: string }[] = await tx.$queryRaw`select id from invoices where id = ${invoiceId} and tenant_id = ${tenantId}::uuid for update`
        if (invoiceRows.length === 0) throw new Error("Invoice not found")
        const invoice = await tx.invoice.findFirstOrThrow({ where: { id: invoiceId, tenantId } })
        if (invoice.contactId !== creditNote.contactId) throw new Error("This credit note belongs to a different customer")
        if (invoice.type === "PROFORMA") throw new Error("Credit can't be applied to a proforma invoice")
        if (invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.CANCELLED) throw new Error(`Credit can't be applied to a ${invoice.status.toLowerCase()} invoice`)
        if (invoice.currencyCode !== creditNote.currencyCode) throw new Error(`This credit note is in ${creditNote.currencyCode} and the invoice is in ${invoice.currencyCode}`)

        const remaining = Math.round(Number(creditNote.remainingBalance) * 100)
        const cents = Math.round(amount * 100)
        if (cents > remaining) throw new Error(`Amount cannot exceed the available credit balance (${creditNote.currencyCode} ${(remaining / 100).toFixed(2)})`)

        const paidBefore = await tx.payment.aggregate({ where: { invoiceId, tenantId }, _sum: { amount: true } })
        const dueCents = Math.round(Number(invoice.total) * 100) - Math.round(Number(paidBefore._sum.amount || 0) * 100)
        if (cents > dueCents) throw new Error(`Invoice ${invoice.invoiceNumber} has ${invoice.currencyCode} ${(Math.max(0, dueCents) / 100).toFixed(2)} left to pay; you can't apply more than that`)

        await tx.creditNote.update({
            where: { id: creditNoteId, tenantId },
            data: {
                allocatedAmount: { increment: amount },
                remainingBalance: { decrement: amount },
                status: cents === remaining ? CreditNoteStatus.APPLIED : CreditNoteStatus.ISSUED,
            }
        })

        // Settles the invoice from the customer's credit: no money moves, so no ledger journal (see CREDIT_APPLICATION_PREFIX)
        await tx.payment.create({
            data: {
                tenantId,
                invoiceId,
                contactId: invoice.contactId,
                amount,
                type: "INBOUND",
                paymentDate: new Date(),
                paymentMethod: "OTHER",
                currencyCode: invoice.currencyCode,
                reference: `${CREDIT_APPLICATION_PREFIX}${creditNote.creditNoteNumber}`,
                notes: `Applied Credit Note #${creditNote.creditNoteNumber}`,
            }
        })

        await tx.invoice.update({
            where: { id: invoiceId, tenantId },
            data: { status: cents === dueCents ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID }
        })
    })

    // A status change can mean goods now leave stock (an invoice paid in full), same as a payment
    await postInvoiceStock(tenantId, { invoiceId })
    await logTenantAudit(tenantId, "CREDIT_NOTE_APPLIED", { target: { type: "CREDIT_NOTE", id: creditNoteId }, metadata: { invoiceId, amount } })

    revalidatePath("/sales/credit-notes")
    revalidatePath("/sales/invoices")
    return { success: true }
}

/**
 * Record a direct cash or bank refund disbursement for a credit note.
 */
async function _recordCreditNoteRefund(input: RecordCreditNoteRefundInput) {
    const tenantId = await getTenantManagerId(MODULE)

    const { creditNoteId, refundDate, paymentMethod = "BANK_TRANSFER", reference, notes } = input
    const amount = Math.round(Number(input.amount) * 100) / 100
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Refund amount must be greater than zero")
    if (refundDate && Number.isNaN(new Date(refundDate).getTime())) throw new Error("The refund date isn't a valid date")

    const { refund, creditNote } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Lock the note, so two saves at the same moment can't refund the same credit twice
        const rows: { id: string }[] = await tx.$queryRaw`select id from credit_notes where id = ${creditNoteId}::uuid and tenant_id = ${tenantId}::uuid for update`
        if (rows.length === 0) throw new Error("Credit note not found")
        const creditNote = await tx.creditNote.findFirstOrThrow({ where: { id: creditNoteId, tenantId } })
        if (creditNote.status === CreditNoteStatus.VOID) throw new Error("This credit note has been voided")
        const remaining = Math.round(Number(creditNote.remainingBalance) * 100)
        const cents = Math.round(amount * 100)
        if (cents > remaining) throw new Error(`Refund amount cannot exceed the open credit balance (${creditNote.currencyCode} ${(remaining / 100).toFixed(2)})`)
        const newStatus = cents === remaining ? CreditNoteStatus.REFUNDED : CreditNoteStatus.ISSUED

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
                allocatedAmount: { increment: amount },
                remainingBalance: { decrement: amount },
                status: newStatus,
            }
        })

        return { refund: r, creditNote }
    })

    // Record ledger REFUND entry
    try {
        await recordContactTransaction(tenantId, {
            contactId: creditNote.contactId,
            type: "REFUND",
            amount,
            currencyCode: creditNote.currencyCode,
            referenceId: creditNote.id,
            description: `Refund payout for Credit Note #${creditNote.creditNoteNumber} via ${paymentMethod}`,
            date: refund.refundDate,
        })
    } catch (err) {
        await reportCaught(err, "recordCreditNoteRefund: customer balance entry", { tenantId, creditNoteId })
    }

    await postToLedger(tenantId, { kind: "creditNoteRefund", id: refund.id })
    await logTenantAudit(tenantId, "CREDIT_NOTE_REFUNDED", { target: { type: "CREDIT_NOTE", id: creditNoteId }, metadata: { creditNoteNumber: creditNote.creditNoteNumber, amount, paymentMethod } })

    revalidatePath("/sales/credit-notes")
    return { id: refund.id }
}

/**
 * Void an unapplied credit note.
 */
async function _voidCreditNote(creditNoteId: string) {
    const tenantId = await getTenantManagerId(MODULE)

    const creditNote = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const rows: { id: string }[] = await tx.$queryRaw`select id from credit_notes where id = ${creditNoteId}::uuid and tenant_id = ${tenantId}::uuid for update`
        if (rows.length === 0) throw new Error("Credit note not found")
        const note = await tx.creditNote.findFirstOrThrow({ where: { id: creditNoteId, tenantId }, include: { refunds: true, items: true } })
        if (note.status === CreditNoteStatus.VOID) throw new Error("This credit note is already voided")
        if (Number(note.allocatedAmount) > 0 || note.refunds.length > 0) {
            throw new Error("Cannot void a credit note that has already been partially allocated or refunded")
        }

        await tx.creditNote.update({
            where: { id: creditNoteId, tenantId },
            data: { status: CreditNoteStatus.VOID, remainingBalance: 0 },
        })

        // Goods the note put back into stock leave it again
        for (const item of note.items) {
            if (!item.restockInventory || !item.productId || !item.warehouseId) continue
            const qty = Number(item.quantity)
            const stock = await tx.warehouseStock.findFirst({ where: { tenantId, warehouseId: item.warehouseId, productId: item.productId } })
            const before = Number(stock?.quantity ?? 0)
            if (stock) await tx.warehouseStock.update({ where: { id: stock.id }, data: { quantity: { decrement: qty } } })
            await tx.product.update({ where: { id: item.productId, tenantId }, data: { stockQty: { decrement: qty } } })
            await tx.stockMovement.create({
                data: {
                    tenantId,
                    warehouseId: item.warehouseId,
                    productId: item.productId,
                    type: StockMovementType.ADJUSTMENT,
                    quantity: -qty,
                    previousQty: before,
                    newQty: before - qty,
                    referenceNo: note.creditNoteNumber,
                    reason: `Credit Note #${note.creditNoteNumber} voided: return reversed`,
                },
            })
        }
        return note
    })

    await postToLedger(tenantId, { kind: "creditNote", id: creditNoteId })
    // Undo the credit on the customer's statement
    try {
        await recordContactTransaction(tenantId, {
            contactId: creditNote.contactId,
            type: "CREDIT_NOTE",
            amount: Math.abs(Number(creditNote.total)),
            currencyCode: creditNote.currencyCode,
            referenceId: creditNote.id,
            description: `Credit Note #${creditNote.creditNoteNumber} voided`,
            date: new Date(),
        })
    } catch (err) {
        await reportCaught(err, "voidCreditNote: customer balance entry", { tenantId, creditNoteId })
    }

    revalidatePath("/sales/credit-notes")
    await logTenantAudit(tenantId, "CREDIT_NOTE_VOIDED", { target: { type: "CREDIT_NOTE", id: creditNoteId }, metadata: { creditNoteNumber: creditNote.creditNoteNumber } })
    return { success: true }
}

/* Exported as ActionResult (safeAction): the screen shows the real message; the client calls unwrap() */
export async function applyCreditToInvoice(...args: Parameters<typeof _applyCreditToInvoice>) {
    return safeAction(() => _applyCreditToInvoice(...args))
}
export async function createCreditNote(...args: Parameters<typeof _createCreditNote>) {
    return safeAction(() => _createCreditNote(...args))
}
export async function recordCreditNoteRefund(...args: Parameters<typeof _recordCreditNoteRefund>) {
    return safeAction(() => _recordCreditNoteRefund(...args))
}
export async function voidCreditNote(...args: Parameters<typeof _voidCreditNote>) {
    return safeAction(() => _voidCreditNote(...args))
}
