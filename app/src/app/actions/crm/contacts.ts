"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export interface Contact {
  id: string
  display_name: string
  type: "INDIVIDUAL" | "COMPANY"
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  email: string | null
  phone: string | null
  mobile?: string | null
  website?: string | null
  gstin?: string | null
  pan: string | null
  cin?: string | null
  tan?: string | null
  msme_udyam?: string | null
  trn?: string | null
  trade_license?: string | null
  vat_number_ksa?: string | null
  cr_number?: string | null
  ein?: string | null
  tax_number?: string | null
  is_tax_exempt?: boolean | null
  tax_exemption_reason?: string | null
  tax_exemption_certificate?: string | null
  customer_group: string
  country_code?: string | null
  currency_code: string
  credit_limit?: number | null
  balance: number
  billing_address?: any
  shipping_address?: any
  notes?: string | null
  is_active: boolean
  tenant_id: string
  created_at: string
}

export async function getContacts(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<{ data: Contact[]; total: number }> {
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  try {
    const whereClause: any = { tenantId }
    if (search) {
      whereClause.OR = [
        { displayName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.contact.count({ where: whereClause }),
    ])

    const formatted: Contact[] = items.map((c: any) => ({
      id: c.id,
      display_name: c.displayName,
      type: c.type as "INDIVIDUAL" | "COMPANY",
      first_name: c.firstName,
      last_name: c.lastName,
      company_name: c.companyName,
      email: c.email,
      phone: c.phone,
      mobile: c.mobile,
      website: c.website,
      customer_group: c.customerGroup || "retail",
      country_code: c.countryCode,
      currency_code: c.currencyCode,
      gstin: c.gstin,
      pan: c.pan,
      cin: c.cin,
      tan: c.tan,
      msme_udyam: c.msmeUdyam,
      trn: c.trn,
      trade_license: c.tradeLicense,
      vat_number_ksa: c.vatNumberKsa,
      cr_number: c.crNumber,
      ein: c.ein,
      tax_number: c.taxNumber,
      is_tax_exempt: c.isTaxExempt,
      tax_exemption_reason: c.taxExemptionReason,
      tax_exemption_certificate: c.taxExemptionCertificate,
      credit_limit: c.creditLimit ? Number(c.creditLimit) : null,
      balance: Number(c.balance || 0),
      billing_address: c.billingAddress,
      shipping_address: c.shippingAddress,
      notes: c.notes,
      is_active: c.isActive,
      tenant_id: c.tenantId,
      created_at: c.createdAt.toISOString(),
    }))

    return { data: formatted, total }
  } catch (err: any) {
    console.error("Error in getContacts with Prisma:", err)
    // Fallback to supabase client
    const supabase = await createClient()
    let query = supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false })

    if (error) {
      return { data: [], total: 0 }
    }
    return { data: data ?? [], total: count || 0 }
  }
}

export async function getContactById(id: string): Promise<Contact | null> {
  const tenantId = await getTenantId()

  try {
    const c = await prisma.contact.findFirst({
      where: { id, tenantId },
    })

    if (!c) return null

    return {
      id: c.id,
      display_name: c.displayName,
      type: c.type as "INDIVIDUAL" | "COMPANY",
      first_name: c.firstName,
      last_name: c.lastName,
      company_name: c.companyName,
      email: c.email,
      phone: c.phone,
      mobile: c.mobile,
      website: c.website,
      customer_group: c.customerGroup || "retail",
      country_code: c.countryCode,
      currency_code: c.currencyCode,
      gstin: c.gstin,
      pan: c.pan,
      cin: c.cin,
      tan: c.tan,
      msme_udyam: c.msmeUdyam,
      trn: c.trn,
      trade_license: c.tradeLicense,
      vat_number_ksa: c.vatNumberKsa,
      cr_number: c.crNumber,
      ein: c.ein,
      tax_number: c.taxNumber,
      is_tax_exempt: c.isTaxExempt,
      tax_exemption_reason: c.taxExemptionReason,
      tax_exemption_certificate: c.taxExemptionCertificate,
      credit_limit: c.creditLimit ? Number(c.creditLimit) : null,
      balance: Number(c.balance || 0),
      billing_address: c.billingAddress,
      shipping_address: c.shippingAddress,
      notes: c.notes,
      is_active: c.isActive,
      tenant_id: c.tenantId,
      created_at: c.createdAt.toISOString(),
    }
  } catch (err) {
    console.error("Error in getContactById:", err)
    return null
  }
}

export async function createContact(
  formData: Omit<Contact, "id" | "created_at" | "tenant_id">
): Promise<{ error: string | null; id?: string }> {
  try {
    const tenantId = await getTenantId()

    // Determine safe displayName
    let displayName = (formData.display_name || "").trim()
    if (!displayName) {
      if (formData.company_name) {
        displayName = formData.company_name.trim()
      } else if (formData.first_name || formData.last_name) {
        displayName = `${formData.first_name || ""} ${formData.last_name || ""}`.trim()
      } else if (formData.email) {
        displayName = formData.email.split("@")[0]
      } else {
        displayName = "New Contact"
      }
    }

    const created = await prisma.contact.create({
      data: {
        tenantId,
        displayName,
        type: formData.type || "INDIVIDUAL",
        firstName: formData.first_name || null,
        lastName: formData.last_name || null,
        companyName: formData.company_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        website: formData.website || null,
        customerGroup: formData.customer_group || "retail",
        countryCode: formData.country_code || "IN",
        currencyCode: formData.currency_code || "INR",
        gstin: formData.gstin || null,
        pan: formData.pan || null,
        cin: formData.cin || null,
        tan: formData.tan || null,
        msmeUdyam: formData.msme_udyam || null,
        trn: formData.trn || null,
        tradeLicense: formData.trade_license || null,
        vatNumberKsa: formData.vat_number_ksa || null,
        crNumber: formData.cr_number || null,
        ein: formData.ein || null,
        isTaxExempt: Boolean(formData.is_tax_exempt),
        taxExemptionReason: formData.tax_exemption_reason || null,
        taxExemptionCertificate: formData.tax_exemption_certificate || null,
        creditLimit: formData.credit_limit ? formData.credit_limit : null,
        balance: formData.balance || 0,
        billingAddress: formData.billing_address || {},
        shippingAddress: formData.shipping_address || {},
        notes: formData.notes || null,
        isActive: formData.is_active ?? true,
      },
    })

    revalidatePath("/crm/contacts")
    return { error: null, id: created.id }
  } catch (err: any) {
    console.error("createContact failed:", err)
    return { error: err.message || "Failed to create contact" }
  }
}

export async function updateContact(
  id: string,
  formData: Partial<Omit<Contact, "id" | "created_at" | "tenant_id">>
): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantId()

    let displayName = formData.display_name?.trim()
    if (displayName === "") {
      if (formData.company_name) {
        displayName = formData.company_name.trim()
      } else if (formData.first_name || formData.last_name) {
        displayName = `${formData.first_name || ""} ${formData.last_name || ""}`.trim()
      }
    }

    await prisma.contact.update({
      where: {
        id,
        tenantId,
      },
      data: {
        ...(displayName ? { displayName } : {}),
        ...(formData.type ? { type: formData.type } : {}),
        firstName: formData.first_name,
        lastName: formData.last_name,
        companyName: formData.company_name,
        email: formData.email,
        phone: formData.phone,
        mobile: formData.mobile,
        website: formData.website,
        customerGroup: formData.customer_group,
        countryCode: formData.country_code,
        currencyCode: formData.currency_code,
        gstin: formData.gstin,
        pan: formData.pan,
        cin: formData.cin,
        tan: formData.tan,
        msmeUdyam: formData.msme_udyam,
        trn: formData.trn,
        tradeLicense: formData.trade_license,
        vatNumberKsa: formData.vat_number_ksa,
        crNumber: formData.cr_number,
        ein: formData.ein,
        isTaxExempt: formData.is_tax_exempt !== undefined ? Boolean(formData.is_tax_exempt) : undefined,
        taxExemptionReason: formData.tax_exemption_reason,
        taxExemptionCertificate: formData.tax_exemption_certificate,
        creditLimit: formData.credit_limit,
        balance: formData.balance,
        billingAddress: formData.billing_address,
        shippingAddress: formData.shipping_address,
        notes: formData.notes,
        isActive: formData.is_active,
      },
    })

    revalidatePath("/crm/contacts")
    return { error: null }
  } catch (err: any) {
    console.error("updateContact failed:", err)
    return { error: err.message || "Failed to update contact" }
  }
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantId()

    await prisma.contact.delete({
      where: {
        id,
        tenantId,
      },
    })

    revalidatePath("/crm/contacts")
    return { error: null }
  } catch (err: any) {
    console.error("deleteContact failed:", err)
    return { error: err.message || "Failed to delete contact" }
  }
}

export async function exportContacts(limit: number = 1000): Promise<Contact[]> {
  const result = await getContacts(1, limit)
  return result.data
}

export async function importContacts(
  contacts: any[]
): Promise<{ error: string | null; count: number }> {
  try {
    const tenantId = await getTenantId()

    const createdRecords = await prisma.$transaction(
      contacts.map((c) =>
        prisma.contact.create({
          data: {
            tenantId,
            displayName: c.display_name || c.displayName || "Imported Contact",
            type: c.type || "INDIVIDUAL",
            email: c.email || null,
            phone: c.phone || null,
            customerGroup: c.customer_group || "retail",
            currencyCode: c.currency_code || "INR",
            balance: parseFloat(c.balance) || 0,
            isActive: c.is_active !== undefined ? c.is_active : true,
          },
        })
      )
    )

    revalidatePath("/crm/contacts")
    return { error: null, count: createdRecords.length }
  } catch (err: any) {
    console.error("importContacts error:", err)
    return { error: err.message || "Failed to import contacts", count: 0 }
  }
}
