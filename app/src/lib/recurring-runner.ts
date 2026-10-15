import type { Prisma } from "@prisma/client"
import { planLimitError } from "@/lib/plan-limits"
import { prisma } from "@/lib/prisma"
import { postToLedger } from "@/lib/ledger"
import { postInvoiceStock } from "@/lib/stock"
import { recordContactTransaction } from "@/lib/contact-ledger"
import { nextInvoiceNumber } from "@/lib/invoice-number"
import { fireWorkflowEvent } from "@/lib/workflow-engine"
import { getTenantTaxContext, invoiceItemTaxColumns } from "@/lib/tenant-tax"
import {
    RecurringFrequency,
    RecurringStatus,
    RecurringExecutionStatus,
    InvoiceStatus,
    InvoiceType,
} from "@prisma/client"

export function computeNextRunDate(currentDate: Date, frequency: RecurringFrequency): Date {
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

/**
 * Creates the next invoice for a recurring profile, advances its schedule and
 * logs the run. Callers check auth (the "Run now" action) or run it for every
 * tenant (the daily cron).
 */
export async function generateInvoiceFromProfile(
    tenantId: string,
    profileId: string
): Promise<{ invoice: { id: string; invoiceNumber: string } } | { error: string }> {
    const profile = await prisma.recurringProfile.findFirst({
        where: { id: profileId, tenantId },
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

    // Same single numbering series as invoices created by hand
    const invoiceNumber = await nextInvoiceNumber(tenantId, "TAX_INVOICE", now)

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

    const limit = await planLimitError(tenantId, "invoicesPerMonth")
    if (limit) return { error: limit }

    const taxCtx = await getTenantTaxContext(tenantId)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
                    create: profile.items.map((item: any) => {
                        // Keep the profile's total rate; split it for the business's country now
                        const rate = Number(item.cgstRate || 0) + Number(item.sgstRate || 0) + Number(item.igstRate || 0)
                        const supplyType = taxCtx.regime.mode === "SINGLE" ? "single" : Number(item.igstRate || 0) > 0 ? "inter" : "intra"
                        return {
                            productId: item.productId,
                            description: item.description,
                            hsnSacCode: item.hsnSacCode,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            ...invoiceItemTaxColumns(Number(item.quantity), Number(item.unitPrice), rate, supplyType),
                            discount: item.discount,
                        }
                    }),
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

    fireWorkflowEvent(tenantId, "INVOICE_CREATED", {
        total: Number(result.total),
        customerName: profile.contact.displayName,
        status: result.status,
        invoiceNumber: result.invoiceNumber,
    }, result.id)

    await postToLedger(tenantId, { kind: "invoice", id: result.id })
    await postInvoiceStock(tenantId, { invoiceId: result.id })
    // Customer statement (drafts aren't owed yet)
    if (result.status !== "DRAFT") {
        try {
            await recordContactTransaction(tenantId, { contactId: result.contactId, type: "INVOICE", amount: Number(result.total), currencyCode: result.currencyCode, referenceId: result.id, description: `Invoice ${result.invoiceNumber} (recurring)`, date: result.invoiceDate })
        } catch (err) {
            console.error("Customer ledger entry failed for recurring invoice:", err)
        }
    }
    return { invoice: { id: result.id, invoiceNumber: result.invoiceNumber } }
}
