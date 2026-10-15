"use server"

import { fromRow, toRow } from "@/lib/pg-row"
import { prisma } from "@/lib/prisma"
import { getTenantAdminId, getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export interface TenantAddress {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

export interface TenantSettings {
  id: string
  name: string
  email: string | null
  phone: string | null
  website: string | null
  address: TenantAddress | any | null
  logo_url: string | null
  currency_code: string
  country_code: string
  gstin?: string
  trn?: string
  settings: any
  /** Tax name and rates for countries without built-in rules (and US state rates) */
  tax_settings?: { label?: string; rates?: number[]; defaultRate?: number } | null
}

export async function getTenantSettings(): Promise<TenantSettings | null> {
  try {
    const tenantId = await getTenantId()

    if (!tenantId) return null

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    return tenant ? toRow<TenantSettings>("Tenant", tenant) : null
  } catch (err) {
    console.error("Exception fetching tenant settings:", err)
    return null
  }
}

export async function updateTenantSettings(data: Partial<TenantSettings>): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getTenantAdminId()

    if (!tenantId) {
      return { success: false, error: "Authentication required or tenant not identified." }
    }

    const payload: Record<string, any> = {}
    if (data.name !== undefined) payload.name = data.name.trim()
    if (data.email !== undefined) payload.email = data.email?.trim() || null
    if (data.phone !== undefined) payload.phone = data.phone?.trim() || null
    if (data.website !== undefined) payload.website = data.website?.trim() || null
    if (data.logo_url !== undefined) payload.logo_url = data.logo_url || null
    if (data.currency_code !== undefined) payload.currency_code = data.currency_code
    if (data.country_code !== undefined) payload.country_code = data.country_code
    if (data.gstin !== undefined) payload.gstin = data.gstin?.trim() || null
    if (data.address !== undefined) payload.address = data.address

    // Settings JSON is merged, never replaced (it also holds subscription, invoices, integrations),
    // and only these keys are written here: a free-form `settings` patch would let a workspace
    // admin rewrite their own subscription. The tax ID, state and tax overrides are mirrored
    // there because invoices, tax reports and the tax engine read them from settings.
    const touchesSettings = data.gstin !== undefined || data.address !== undefined || data.tax_settings !== undefined
    if (touchesSettings) {
      const current = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } })
      const merged: Record<string, unknown> = { ...((current?.settings as Record<string, unknown>) || {}) }
      if (data.gstin !== undefined) merged.gstin = data.gstin?.trim() || null
      if (data.address !== undefined && data.address && typeof data.address === "object" && "state" in data.address) {
        merged.state = (data.address as TenantAddress).state || null
      }
      if (data.tax_settings !== undefined) {
        const t = data.tax_settings || {}
        const rates = (t.rates || []).map(Number).filter((r) => Number.isFinite(r) && r >= 0 && r <= 100)
        merged.tax = {
          label: t.label?.trim() || undefined,
          rates,
          defaultRate: typeof t.defaultRate === "number" && rates.includes(t.defaultRate) ? t.defaultRate : rates[0],
        }
      }
      payload.settings = merged
    }

    await prisma.tenant.update({ where: { id: tenantId }, data: fromRow("Tenant", payload) })

    revalidatePath("/settings")
    revalidatePath("/reports")
    revalidatePath("/crm")
    revalidatePath("/sales/invoices")

    return { success: true }
  } catch (err: any) {
    console.error("Exception updating tenant settings:", err)
    return { success: false, error: err.message || "Failed to update settings" }
  }
}
