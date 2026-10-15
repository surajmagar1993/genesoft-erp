"use server"

import { prisma } from "@/lib/prisma"
import { toRow, toRows } from "@/lib/pg-row"
import { getTenantTaxContext } from "@/lib/tenant-tax"
import { getTenantId, getTenantManagerId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = ["sales", "finance"] as const

export interface TaxRate {
  id: string
  tax_group_id: string
  name: string
  rate: number
  is_active: boolean
}

export interface TaxGroup {
  id: string
  tenant_id: string
  name: string
  country_code: string
  is_default: boolean
  is_active: boolean
  tax_rates?: TaxRate[]
}

export async function getTaxGroups() {
  try {
    const tenantId = await getTenantId(MODULE)
    const groups = await prisma.taxGroup.findMany({ where: { tenantId }, include: { taxRates: true }, orderBy: { createdAt: "desc" } })
    return groups.map((g) => ({ ...toRow<TaxGroup>("TaxGroup", g), tax_rates: toRows<TaxRate>("TaxRate", g.taxRates) }))
  } catch (error) {
    console.error("Error fetching tax groups:", error)
    return []
  }
}

export async function createTaxGroup(data: {
  name: string
  country_code: string
  is_default: boolean
  rates: { name: string; rate: number }[]
}) {
  const tenantId = await getTenantManagerId(MODULE)
  for (const r of data.rates) {
    if (!Number.isFinite(Number(r.rate)) || Number(r.rate) < 0 || Number(r.rate) > 100) throw new Error(`${r.name || "Rate"}: must be between 0 and 100`)
  }

  // The group and its rates together
  const group = await prisma.taxGroup.create({
    data: {
      name: data.name,
      countryCode: data.country_code,
      isDefault: data.is_default,
      tenantId,
      taxRates: { create: data.rates.map((r) => ({ name: r.name, rate: Number(r.rate) })) },
    },
  })

  revalidatePath("/settings")
  return toRow<TaxGroup>("TaxGroup", group)
}

export async function deleteTaxGroup(id: string) {
  const tenantId = await getTenantManagerId(MODULE)
  // Rates go with their group (the database won't delete a group that still has rates);
  // products using it keep working with no tax group.
  await prisma.$transaction(async (tx) => {
    const group = await tx.taxGroup.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!group) throw new Error("Tax group not found")
    await tx.taxRate.deleteMany({ where: { taxGroupId: id } })
    await tx.taxGroup.delete({ where: { id } })
  })
  revalidatePath("/settings")
}


/**
 * The signed-in business's tax setup for documents: country rules plus its
 * own tax name/rates, currency and number format.
 */
export async function getInvoiceTaxRegime(): Promise<{
    mode: "IN_GST" | "SINGLE"
    taxLabel: string
    taxIdLabel: string
    standardRates: number[]
    defaultRate: number
    currency: string
    locale: string
    supplierState: string
    supplierTaxId: string
    countryCode: string
}> {
    const tenantId = await getTenantId(MODULE)
    const ctx = await getTenantTaxContext(tenantId)
    return {
        mode: ctx.regime.mode,
        taxLabel: ctx.regime.taxLabel,
        taxIdLabel: ctx.regime.taxIdLabel,
        standardRates: ctx.regime.standardRates,
        defaultRate: ctx.regime.defaultRate,
        currency: ctx.currency,
        locale: ctx.regime.locale,
        supplierState: ctx.supplierState,
        supplierTaxId: ctx.supplierTaxId,
        countryCode: ctx.regime.countryCode,
    }
}
