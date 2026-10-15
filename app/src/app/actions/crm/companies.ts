"use server"

import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { fromRow, toRow, toRows } from "@/lib/pg-row"
import { isUuid } from "@/lib/utils"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "crm" as const

export interface Company {
  id: string
  name: string
  industry?: string
  website?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  country?: string
  country_code?: string
  gstin?: string
  employee_count?: number
  annual_revenue?: number
  is_active: boolean
  tenant_id: string
  created_at: string
}

export async function getCompanies(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<{ data: Company[]; total: number }> {
  try {
    const tenantId = await getTenantId(MODULE)
    const q = search?.trim()
    const where = {
      tenantId,
      ...(q ? { OR: (["name", "industry", "email"] as const).map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) } : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.company.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.company.count({ where }),
    ])
    return { data: toRows<Company>("Company", rows), total }
  } catch (err: any) {
    console.error("Exception fetching companies:", err)
    return { data: [], total: 0 }
  }
}

export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    if (!isUuid(id)) return null
    const tenantId = await getTenantId(MODULE)
    const row = await prisma.company.findFirst({ where: { id, tenantId } })
    return row ? toRow<Company>("Company", row) : null
  } catch {
    return null
  }
}

const num = (v: unknown) => (v === undefined ? undefined : v ? Number(v) : null)

export async function createCompany(
  formData: Omit<Company, "id" | "created_at" | "tenant_id">
): Promise<{ error: string | null; data?: Company }> {
  try {
    const tenantId = await getTenantWriterId(MODULE)

    if (!tenantId) {
      return { error: "Authentication required or tenant not identified." }
    }

    if (!formData.name?.trim()) {
      return { error: "Company name is required." }
    }

    const row = await prisma.company.create({
      data: {
        name: formData.name.trim(),
        industry: formData.industry || null,
        website: formData.website || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        countryCode: formData.country_code || "IN",
        gstin: formData.gstin || null,
        employeeCount: num(formData.employee_count) ?? null,
        annualRevenue: num(formData.annual_revenue) ?? null,
        isActive: formData.is_active ?? true,
        tenantId,
      },
    })

    revalidatePath("/crm/companies")
    return { error: null, data: toRow<Company>("Company", row) }
  } catch (err: any) {
    console.error("Exception in createCompany:", err)
    return { error: err.message || "Failed to create company" }
  }
}

export async function updateCompany(
  id: string,
  formData: Partial<Omit<Company, "id" | "created_at" | "tenant_id">>
): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantWriterId(MODULE)

    if (!tenantId) {
      return { error: "Authentication required or tenant not identified." }
    }

    const data = fromRow("Company", {
      ...formData,
      ...(formData.name !== undefined ? { name: formData.name.trim() } : {}),
      employee_count: num(formData.employee_count),
      annual_revenue: num(formData.annual_revenue),
    })
    const { count } = await prisma.company.updateMany({ where: { id, tenantId }, data })
    if (count === 0) return { error: "Company not found" }

    revalidatePath("/crm/companies")
    return { error: null }
  } catch (err: any) {
    console.error("Exception in updateCompany:", err)
    return { error: err.message || "Failed to update company" }
  }
}

export async function deleteCompany(id: string): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantManagerId(MODULE)
    const { count } = await prisma.company.deleteMany({ where: { id, tenantId } })
    if (count === 0) return { error: "Company not found" }
    revalidatePath("/crm/companies")
    return { error: null }
  } catch (err: any) {
    return { error: err.message || "Failed to delete company" }
  }
}

export interface CompanyRelationsData {
  company: Company | null
  contacts: any[]
  deals: any[]
  metrics: {
    totalContacts: number
    totalDeals: number
    activePipelineValue: number
    closedWonRevenue: number
  }
}

export async function getCompanyWithRelations(id: string): Promise<CompanyRelationsData> {
  const tenantId = await getTenantId(MODULE)
  const company = await getCompanyById(id)

  if (!company) {
    return {
      company: null,
      contacts: [],
      deals: [],
      metrics: { totalContacts: 0, totalDeals: 0, activePipelineValue: 0, closedWonRevenue: 0 }
    }
  }

  const [contactsRes, dealsRes] = await Promise.all([
    prisma.contact
      .findMany({ where: { tenantId, companyName: company.name }, orderBy: { createdAt: "desc" } })
      .then((rows) => ({ data: toRows("Contact", rows) })),
    // Deals don't store a company; they belong to a contact at this company
    prisma.deal
      .findMany({
        where: { tenantId, contact: { companyName: { equals: company.name, mode: "insensitive" } } },
        include: { contact: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
      })
      .then((rows: { id: string; title: string; value: unknown; stage: string; probability: number; expectedCloseDate: Date | null; createdAt: Date; contact: { displayName: string } | null }[]) => ({
        data: rows.map((d) => ({
          id: d.id, title: d.title, value: Number(d.value || 0), stage: d.stage, probability: d.probability,
          expected_close: d.expectedCloseDate ? d.expectedCloseDate.toISOString().slice(0, 10) : null,
          contact_name: d.contact?.displayName ?? "", company: company.name, created_at: d.createdAt.toISOString(),
        })),
      }))
  ])

  const contacts = contactsRes.data ?? []
  const deals = dealsRes.data ?? []

  const activePipelineValue = deals
    .filter((d: any) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage))
    .reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0)

  const closedWonRevenue = deals
    .filter((d: any) => d.stage === "CLOSED_WON")
    .reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0)

  return {
    company,
    contacts,
    deals,
    metrics: {
      totalContacts: contacts.length,
      totalDeals: deals.length,
      activePipelineValue,
      closedWonRevenue
    }
  }
}
