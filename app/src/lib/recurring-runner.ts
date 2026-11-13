import { reportCaught } from "@/lib/error-reporting"
import { contactPlaceOfSupply } from "@/lib/invoice-lines"
import { invoiceDiscountFraction, roundMoney } from "@/lib/gst-engine"
import type { Prisma } from "@prisma/client"
import { planLimitError } from "@/lib/plan-limits"
import { prisma } from "@/lib/prisma"
import { postToLedger } from "@/lib/ledger"
import { postInvoiceStock } from "@/lib/stock"
import { recordContactTransaction } from "@/lib/contact-ledger"
import { nextInvoiceNumber } from "@/lib/invoice-number"
import { fireWorkflowEvent } from "@/lib/workflow-engine"
import { getTenantTaxContext, invoiceItemTaxColumns, supplyTypeFor } from "@/lib/tenant-tax"
import {
    RecurringFrequency,
    RecurringStatus,
    RecurringExecutionStatus,
    InvoiceStatus,
    InvoiceType,
} from "@prisma/client"

/** Adds months and stays on the last day when the target month is shorter (31 Jan + 1 month = 28/29 Feb, not 3 Mar). */
function addMonthsClamped(date: Date, months: number): Date {
    const next = new Date(date)
    const day = next.getDate()
    next.setDate(1)
    next.setMonth(next.getMonth() + months)
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next.setDate(Math.min(day, lastDay))
    return next
}

class AlreadyRunError extends Error {}

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
            return addMonthsClamped(currentDate, 1)
        case RecurringFrequency.QUARTERLY:
            return addMonthsClamped(currentDate, 3)
        case RecurringFrequency.BIANNUALLY:
            return addMonthsClamped(currentDate, 6)
        case RecurringFrequency.ANNUALLY:
            return addMonthsClamped(currentDate, 12)
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
    // Worked out now, the same way as an invoice made by hand: the customer's state decides
    // CGST+SGST or IGST (India), the discount comes off before tax and the header totals are
    // the sum of the lines (the profile's stored totals are only an estimate). Line discounts
    // become one document discount spread over the lines, which is how the invoice page, the
    // PDF and the edit form read it, so all of them show the same tax.
    const placeOfSupply = taxCtx.regime.mode === "IN_GST" ? contactPlaceOfSupply(profile.contact) || "" : ""
    // No state on the customer: keep the profile's own choice (it was saved with IGST for an out-of-state customer)
    const profileSaysInter = profile.items.some((item) => Number(item.igstRate || 0) > 0)
    const supplyType = taxCtx.regime.mode === "IN_GST" && !placeOfSupply && profileSaysInter ? "inter" : supplyTypeFor(taxCtx, undefined, placeOfSupply)
    const gross = profile.items.map((item) => Number(item.quantity) * Number(item.unitPrice))
    const subtotal = roundMoney(gross.reduce((s, g) => s + g, 0))
    const discountTotal = roundMoney(profile.items.reduce((s, item, i) => s + Math.min(Math.max(Number(item.discount || 0), 0), gross[i]), 0))
    const fraction = invoiceDiscountFraction(profile.items.map((item) => ({ qty: Number(item.quantity), unitPrice: Number(item.unitPrice) })), discountTotal, "FIXED")
    const lines = profile.items.map((item) => {
        // The profile keeps the line's total rate (stored as CGST+SGST or IGST)
        const rate = Number(item.cgstRate || 0) + Number(item.sgstRate || 0) + Number(item.igstRate || 0)
        return { item, tax: invoiceItemTaxColumns(Number(item.quantity), Number(item.unitPrice), rate, supplyType, fraction) }
    })
    const taxTotal = roundMoney(lines.reduce((s, l) => s + l.tax.cgstAmount + l.tax.sgstAmount + l.tax.igstAmount + l.tax.vatAmount, 0))
    const total = roundMoney(subtotal - discountTotal + taxTotal)
    let result
    try {
    result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
                subtotal,
                discount: discountTotal,
                taxAmount: taxTotal,
                total,
                placeOfSupply: placeOfSupply || null,
                currencyCode: profile.currencyCode,
                paymentTerms: profile.paymentTerms || "NET_30",
                notes: profile.notes || `Generated from recurring subscription schedule: ${profile.title}`,
                terms: profile.terms,
                recurringProfileId: profile.id,
                items: {
                    create: lines.map(({ item, tax }) => ({
                        productId: item.productId,
                        description: item.description,
                        hsnSacCode: item.hsnSacCode,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        ...tax,
                        // the discount is on the invoice header (see above)
                        discount: 0,
                    })),
                },
            },
        })

        // 2. Advance cycles and compute nextRunDate
        const newCycles = profile.cyclesCompleted + 1
        const nextRun = computeNextRunDate(profile.nextRunDate, profile.frequency)
        let updatedStatus: RecurringStatus = profile.status

        if (profile.maxCycles != null && profile.maxCycles > 0 && newCycles >= profile.maxCycles) {
            updatedStatus = RecurringStatus.COMPLETED
        }
        if (profile.endDate && nextRun > profile.endDate) {
            updatedStatus = RecurringStatus.COMPLETED
        }

        // Claim this cycle: if "Run now" and the daily job reach here together, only one of them
        // still finds the profile at this cycle; the other is rolled back (no second invoice)
        const claimed = await tx.recurringProfile.updateMany({
            where: { id: profile.id, tenantId, cyclesCompleted: profile.cyclesCompleted, nextRunDate: profile.nextRunDate },
            data: {
                cyclesCompleted: newCycles,
                lastRunDate: now,
                nextRunDate: nextRun,
                status: updatedStatus,
            },
        })
        if (claimed.count !== 1) throw new AlreadyRunError()

        // 3. Log execution
        await tx.recurringExecution.create({
            data: {
                tenantId,
                recurringProfileId: profile.id,
                invoiceId: invoice.id,
                executionDate: now,
                status: RecurringExecutionStatus.SUCCESS,
                amount: total,
            },
        })

        return invoice
    })
    } catch (err) {
        if (err instanceof AlreadyRunError) return { error: "This cycle's invoice has just been created by another run." }
        throw err
    }

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
            await reportCaught(err, "recurring invoice: customer balance entry", { tenantId, invoiceId: result.id })
        }
    }
    return { invoice: { id: result.id, invoiceNumber: result.invoiceNumber } }
}
