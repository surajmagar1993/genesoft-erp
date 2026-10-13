import { prisma } from "@/lib/prisma"
import { resolveTaxRegime, type TaxJurisdictionConfig } from "@/lib/tax-jurisdiction"
import { getStateNameFromCode } from "@/lib/gst-returns-engine"
import { computeLineItemGst, getSupplyTypeForRegime, type SupplyType } from "@/lib/gst-engine"

export interface TenantTaxContext {
    regime: TaxJurisdictionConfig
    currency: string
    /** Indian GST: supplier's state from Settings, else from the GSTIN prefix */
    supplierState: string
    supplierTaxId: string
}

/** A business's tax setup: country rules + its own tax name/rates + currency. */
export async function getTenantTaxContext(tenantId: string): Promise<TenantTaxContext> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { countryCode: true, currencyCode: true, settings: true },
    })
    const settings = (tenant?.settings as Record<string, unknown> | null) || {}
    const regime = resolveTaxRegime(tenant?.countryCode, settings as { tax?: never }, tenant?.currencyCode)
    const taxId = String(settings.gstin || settings.vat_number || settings.ksa_vat_number || settings.trn || settings.uk_vrn || settings.vrn || settings.abn || settings.ein || settings.tax_id || "")
    const gstinState = regime.mode === "IN_GST" && /^\d{2}/.test(taxId) ? getStateNameFromCode(taxId.slice(0, 2)) : ""
    return {
        regime,
        currency: tenant?.currencyCode || regime.currencyCode,
        supplierState: String(settings.state || gstinState || ""),
        supplierTaxId: taxId,
    }
}

/** Supply type the server uses for a document (never taken from the browser). */
export function supplyTypeFor(ctx: TenantTaxContext, supplierState: string | undefined, placeOfSupply: string | undefined): SupplyType {
    return getSupplyTypeForRegime(ctx.regime.mode, supplierState || ctx.supplierState, placeOfSupply || "")
}

/** Validates a line tax rate: 0–100, as a number. */
export function cleanTaxRate(rate: unknown): number {
    const n = Number(rate)
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error("Tax rate must be between 0 and 100")
    return n
}

/** Prisma InvoiceItem tax columns for one line, computed on the server. */
export function invoiceItemTaxColumns(qty: number, unitPrice: number, rate: number, supplyType: SupplyType) {
    const t = computeLineItemGst(qty, unitPrice, rate, supplyType)
    return {
        cgstRate: t.cgstPercent,
        cgstAmount: t.cgstAmount,
        sgstRate: t.sgstPercent,
        sgstAmount: t.sgstAmount,
        igstRate: t.igstPercent,
        igstAmount: t.igstAmount,
        vatRate: t.vatPercent,
        vatAmount: t.vatAmount,
        lineTotal: t.lineTotal,
    }
}

/**
 * A product's tax rate from its tax group: IGST (or VAT) when present,
 * otherwise CGST + SGST, otherwise the sum of its rates. Falls back to the
 * business's default rate when the product has no tax group.
 */
export function productTaxRate(
    taxGroup: { taxRates?: { name: string; rate: unknown; isActive?: boolean }[] } | null | undefined,
    fallbackRate: number
): number {
    const rates = (taxGroup?.taxRates || []).filter((r) => r.isActive !== false)
    if (!rates.length) return fallbackRate
    const byName = (n: string) => rates.filter((r) => r.name.toUpperCase().includes(n)).reduce((sum, r) => sum + Number(r.rate || 0), 0)
    const igst = byName("IGST")
    if (igst > 0) return igst
    const vat = byName("VAT")
    if (vat > 0) return vat
    const cgstSgst = byName("CGST") + byName("SGST")
    if (cgstSgst > 0) return cgstSgst
    return rates.reduce((sum, r) => sum + Number(r.rate || 0), 0)
}
