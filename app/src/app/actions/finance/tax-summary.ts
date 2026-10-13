"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { getTenantTaxContext } from "@/lib/tenant-tax"

export interface TaxRateRow {
    rate: number
    taxable: number
    tax: number
    cgst: number
    sgst: number
    igst: number
}

export interface TaxSummaryReport {
    from: string
    to: string
    countryCode: string
    mode: "IN_GST" | "SINGLE"
    taxLabel: string
    taxIdLabel: string
    taxId: string
    currency: string
    locale: string
    sales: { invoiceCount: number; taxable: number; tax: number; byRate: TaxRateRow[]; cgst: number; sgst: number; igst: number }
    creditNotes: { count: number; taxable: number; tax: number }
    purchases: { billCount: number; expenseCount: number; taxable: number; tax: number }
    netTaxPayable: number
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * Basic tax summary for a period: tax charged on sales invoices, less credit
 * notes, less tax paid on bills and expenses. No government filing; this is
 * the figure the business (or its accountant) uses to file.
 */
export async function getTaxSummary(params: { from: string; to: string }): Promise<TaxSummaryReport> {
    const tenantId = await getTenantId()
    const ctx = await getTenantTaxContext(tenantId)

    const from = new Date(`${params.from}T00:00:00`)
    const to = new Date(`${params.to}T23:59:59.999`)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
        throw new Error("Choose a valid date range")
    }

    const [invoices, creditNotes, bills, expenses] = await Promise.all([
        prisma.invoice.findMany({
            where: {
                tenantId,
                type: "TAX_INVOICE",
                status: { notIn: ["DRAFT", "CANCELLED"] },
                invoiceDate: { gte: from, lte: to },
            },
            select: {
                items: {
                    select: {
                        quantity: true, unitPrice: true,
                        cgstRate: true, sgstRate: true, igstRate: true, vatRate: true,
                        cgstAmount: true, sgstAmount: true, igstAmount: true, vatAmount: true,
                    },
                },
            },
        }),
        prisma.creditNote.findMany({
            where: { tenantId, status: { notIn: ["DRAFT", "VOID"] }, issueDate: { gte: from, lte: to } },
            select: { subtotal: true, taxAmount: true },
        }),
        prisma.bill.findMany({
            where: { tenantId, status: { notIn: ["DRAFT", "VOID"] }, billDate: { gte: from, lte: to } },
            select: { subtotal: true, taxAmount: true },
        }),
        prisma.expense.findMany({
            where: { tenantId, status: { in: ["APPROVED", "PAID"] }, expenseDate: { gte: from, lte: to } },
            select: { amount: true, taxAmount: true },
        }),
    ])

    const byRate = new Map<number, TaxRateRow>()
    let cgst = 0, sgst = 0, igst = 0, taxable = 0, tax = 0
    for (const inv of invoices as { items: Record<string, unknown>[] }[]) {
        for (const item of inv.items) {
            const n = (k: string) => Number(item[k] || 0)
            const lineTaxable = n("quantity") * n("unitPrice")
            const rate = n("cgstRate") + n("sgstRate") + n("igstRate") + n("vatRate")
            const lineTax = n("cgstAmount") + n("sgstAmount") + n("igstAmount") + n("vatAmount")
            const row = byRate.get(rate) || { rate, taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0 }
            row.taxable += lineTaxable
            row.tax += lineTax
            row.cgst += n("cgstAmount")
            row.sgst += n("sgstAmount")
            row.igst += n("igstAmount")
            byRate.set(rate, row)
            taxable += lineTaxable
            tax += lineTax
            cgst += n("cgstAmount")
            sgst += n("sgstAmount")
            igst += n("igstAmount")
        }
    }

    const sum = <T,>(rows: T[], key: keyof T) => rows.reduce((total, row) => total + Number(row[key] || 0), 0)
    const cnTax = sum(creditNotes, "taxAmount")
    const purchaseTax = sum(bills, "taxAmount") + sum(expenses, "taxAmount")

    return {
        from: params.from,
        to: params.to,
        countryCode: ctx.regime.countryCode,
        mode: ctx.regime.mode,
        taxLabel: ctx.regime.taxLabel,
        taxIdLabel: ctx.regime.taxIdLabel,
        taxId: ctx.supplierTaxId,
        currency: ctx.currency,
        locale: ctx.regime.locale,
        sales: {
            invoiceCount: invoices.length,
            taxable: round(taxable),
            tax: round(tax),
            cgst: round(cgst),
            sgst: round(sgst),
            igst: round(igst),
            byRate: [...byRate.values()]
                .map((r) => ({ ...r, taxable: round(r.taxable), tax: round(r.tax), cgst: round(r.cgst), sgst: round(r.sgst), igst: round(r.igst) }))
                .sort((a, b) => a.rate - b.rate),
        },
        creditNotes: { count: creditNotes.length, taxable: round(sum(creditNotes, "subtotal")), tax: round(cnTax) },
        purchases: {
            billCount: bills.length,
            expenseCount: expenses.length,
            taxable: round(sum(bills, "subtotal") + sum(expenses, "amount")),
            tax: round(purchaseTax),
        },
        netTaxPayable: round(tax - cnTax - purchaseTax),
    }
}
