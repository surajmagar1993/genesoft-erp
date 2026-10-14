import { prisma } from "@/lib/prisma"

/**
 * The next invoice number in the business's single series for the current
 * financial year: INV-2026-27-0001 (tax invoices) / PI-… (proforma). Every
 * flow that creates an invoice (form, rental, delivery challan, recurring)
 * uses this, so there is one consecutive series. The highest existing number
 * is read numerically, so deletions and numbers past 9999 don't repeat.
 */
export async function nextInvoiceNumber(tenantId: string, type: "TAX_INVOICE" | "PROFORMA" = "TAX_INVOICE", now = new Date()): Promise<string> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true, fiscalYearStart: true } })
    const settings = (tenant?.settings as Record<string, unknown>) || {}
    const fiscalMonthStart = Number(settings.fiscal_year_start) || tenant?.fiscalYearStart || 1
    let startYear = now.getFullYear()
    if (now.getMonth() + 1 < fiscalMonthStart) startYear -= 1
    const fyPrefix = `${startYear}-${String(startYear + 1).slice(-2)}`
    const prefix = type === "PROFORMA" ? `PI-${fyPrefix}-` : `INV-${fyPrefix}-`

    const rows: { max: number | null }[] = await prisma.$queryRaw`
        select max(substring(invoice_number from '([0-9]+)$')::int) as max
        from invoices
        where tenant_id = ${tenantId}::uuid and invoice_number like ${prefix + "%"}`
    const next = (rows[0]?.max ?? 0) + 1
    return `${prefix}${String(next).padStart(4, "0")}`
}
