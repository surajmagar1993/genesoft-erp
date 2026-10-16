"use server"

import { fromRow, toRow } from "@/lib/pg-row"
import { prisma } from "@/lib/prisma"
import { getTenantAdminId, getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { clearFolder, uploadPublicFile } from "@/lib/storage"
import { toActionResult, type ActionResult } from "@/lib/action-result"
import { logTenantAudit } from "@/lib/tenant-audit"

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
    // The logo is changed only by uploadTenantLogo / removeTenantLogo (files in our own storage),
    // never by a URL from the browser: the PDF renderer would fetch any address it was given.
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

    // What actually changes (for the activity log), compared before saving
    const before = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true, phone: true, website: true, currencyCode: true, countryCode: true, address: true, settings: true },
    })
    const beforeSettings = ((before?.settings as Record<string, unknown>) || {})
    const beforeValues: Record<string, unknown> = {
      name: before?.name, email: before?.email, phone: before?.phone, website: before?.website,
      currency_code: before?.currencyCode, country_code: before?.countryCode, address: before?.address,
      gstin: beforeSettings.gstin ?? null,
    }
    const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
    const changedFields = Object.keys(payload).filter((k) => k !== "settings" && !same(beforeValues[k], payload[k]))
    if (data.tax_settings !== undefined && payload.settings && !same(beforeSettings.tax, (payload.settings as Record<string, unknown>).tax)) changedFields.push("tax_settings")

    await prisma.tenant.update({ where: { id: tenantId }, data: fromRow("Tenant", payload) })

    revalidatePath("/settings")
    revalidatePath("/reports")
    revalidatePath("/crm")
    revalidatePath("/sales/invoices")

    // Which fields changed (names only); nothing logged when nothing changed
    if (changedFields.length) {
      await logTenantAudit(tenantId, "SETTINGS_UPDATED", { target: { type: "TENANT", id: tenantId }, metadata: { fields: changedFields.sort() } })
    }
    return { success: true }
  } catch (err: any) {
    console.error("Exception updating tenant settings:", err)
    return { success: false, error: err.message || "Failed to update settings" }
  }
}

const LOGO_BUCKET = "tenant-logos"
const LOGO_MAX_BYTES = 1024 * 1024

/** PNG or JPEG, checked by the file's own bytes (the PDF renderer draws only these). */
function logoKind(buf: Buffer): { ext: "png" | "jpg"; type: string } | null {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", type: "image/png" }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", type: "image/jpeg" }
  return null
}

/**
 * Workspace admins: uploads the business logo shown on invoices, PDFs and the
 * customer portal. Stored at tenant-logos/<tenantId>/logo-<time>.<ext>; older
 * versions in that folder are removed.
 */
export async function uploadTenantLogo(formData: FormData): Promise<ActionResult<{ logoUrl: string }>> {
  return toActionResult(async () => {
    const tenantId = await getTenantAdminId()
    const file = formData.get("logo")
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose an image file to upload.")
    if (file.size > LOGO_MAX_BYTES) throw new Error("The logo must be 1 MB or smaller.")
    const buf = Buffer.from(await file.arrayBuffer())
    const kind = logoKind(buf)
    if (!kind) throw new Error("Upload a PNG or JPG image (these print on PDF invoices).")

    const filePath = `${tenantId}/logo-${Date.now()}.${kind.ext}`
    const logoUrl = await uploadPublicFile(LOGO_BUCKET, filePath, buf, kind.type)
    await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl } })
    await clearFolder(LOGO_BUCKET, tenantId, filePath)
    await logTenantAudit(tenantId, "LOGO_UPLOADED", { target: { type: "TENANT", id: tenantId } })
    revalidatePath("/settings")
    return { logoUrl }
  })
}

/** Workspace admins: removes the logo (documents fall back to the business name). */
export async function removeTenantLogo(): Promise<ActionResult<{ removed: true }>> {
  return toActionResult(async () => {
    const tenantId = await getTenantAdminId()
    await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl: null } })
    await clearFolder(LOGO_BUCKET, tenantId)
    await logTenantAudit(tenantId, "LOGO_REMOVED", { target: { type: "TENANT", id: tenantId } })
    revalidatePath("/settings")
    return { removed: true as const }
  })
}
