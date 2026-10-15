"use server"

import { pick, toRow } from "@/lib/pg-row"
import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { fireWorkflowEvent } from "@/lib/workflow-engine"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { assertWithinLimit } from "@/lib/plan-limits"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "crm" as const

export type DealStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST"

export interface Deal {
  id: string
  title: string
  contact_name: string
  company: string
  value: number
  stage: DealStage
  probability: number
  expected_close: string | null
  assigned_to: string
  notes: string
  tenant_id: string
  created_at: string
}

const DEAL_STAGES: DealStage[] = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type DealRow = {
  id: string; tenantId: string; title: string; value: unknown; stage: DealStage; probability: number
  expectedCloseDate: Date | null; assignedTo: string | null; notes: string | null; createdAt: Date; contactId: string
  contact: { displayName: string; companyName: string | null } | null
}
const DEAL_SELECT = {
  id: true, tenantId: true, title: true, value: true, stage: true, probability: true, expectedCloseDate: true,
  assignedTo: true, notes: true, createdAt: true, contactId: true,
  contact: { select: { displayName: true, companyName: true } },
} as const

/** The shape the deal screens use: contact name and company come from the deal's contact. */
function toDeal(r: DealRow): Deal {
  return {
    id: r.id,
    title: r.title,
    contact_name: r.contact?.displayName || "",
    company: r.contact?.companyName || "",
    value: Number(r.value || 0),
    stage: r.stage,
    probability: r.probability,
    expected_close: r.expectedCloseDate ? r.expectedCloseDate.toISOString().slice(0, 10) : null,
    assigned_to: r.assignedTo || "",
    notes: r.notes || "",
    tenant_id: r.tenantId,
    created_at: r.createdAt.toISOString(),
  }
}

export async function getDeals(
    page: number = 1,
    limit: number = 10,
    filters?: { stage?: DealStage; search?: string }
): Promise<{ data: Deal[]; total: number }> {
  const tenantId = await getTenantId(MODULE)
  const search = filters?.search?.trim()
  const where = {
    tenantId,
    ...(filters?.stage ? { stage: filters.stage } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { contact: { displayName: { contains: search, mode: "insensitive" as const } } },
            { contact: { companyName: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  }
  try {
    const [rows, total] = await Promise.all([
      prisma.deal.findMany({ where, select: DEAL_SELECT, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.deal.count({ where }),
    ])
    return { data: (rows as DealRow[]).map(toDeal), total }
  } catch (error) {
    console.error("Error fetching deals:", error)
    return { data: [], total: 0 }
  }
}

export async function getDealById(id: string): Promise<Deal | null> {
  const tenantId = await getTenantId(MODULE)
  if (!UUID_RE.test(id)) return null
  const row = await prisma.deal.findFirst({ where: { id, tenantId }, select: DEAL_SELECT })
  return row ? toDeal(row as DealRow) : null
}

type DealInput = Partial<Omit<Deal, "id" | "created_at" | "tenant_id">>

/**
 * The deal form names the customer and company as text; a deal needs a
 * contact. Reuses this business's contact with that name, else creates it
 * (recording the company on the contact).
 */
async function resolveDealContact(tenantId: string, name: string, company: string): Promise<string> {
  const displayName = name || company
  if (!displayName) throw new Error("Enter the customer's name or company")
  const existing = await prisma.contact.findFirst({
    where: { tenantId, displayName: { equals: displayName, mode: "insensitive" } },
    select: { id: true, companyName: true },
  })
  if (existing) {
    if (company && !existing.companyName) await prisma.contact.updateMany({ where: { id: existing.id, tenantId }, data: { companyName: company } })
    return existing.id
  }
  await assertWithinLimit(tenantId, "contacts")
  const created = await prisma.contact.create({
    data: { tenantId, displayName, companyName: company || null, type: company && !name ? "COMPANY" : "INDIVIDUAL" },
    select: { id: true },
  })
  return created.id
}

function cleanDealFields(input: DealInput) {
  const data: Record<string, unknown> = {}
  if (input.title !== undefined) {
    const title = String(input.title).trim()
    if (!title) throw new Error("Deal title is required")
    data.title = title.slice(0, 200)
  }
  if (input.value !== undefined) {
    const v = Number(input.value)
    if (!Number.isFinite(v) || v < 0) throw new Error("Deal value must be zero or more")
    data.value = v
  }
  if (input.stage !== undefined) {
    if (!DEAL_STAGES.includes(input.stage)) throw new Error("Invalid deal stage")
    data.stage = input.stage
  }
  if (input.probability !== undefined) data.probability = Math.max(0, Math.min(100, Math.round(Number(input.probability) || 0)))
  if (input.expected_close !== undefined) {
    const d = input.expected_close ? new Date(input.expected_close) : null
    if (d && Number.isNaN(d.getTime())) throw new Error("Expected close date isn't valid")
    data.expectedCloseDate = d
  }
  if (input.assigned_to !== undefined) data.assignedTo = String(input.assigned_to).trim() || null
  if (input.notes !== undefined) data.notes = String(input.notes).trim() || null
  return data
}

export async function createDeal(
  formData: Omit<Deal, "id" | "created_at" | "tenant_id">
): Promise<{ error: string | null; id?: string }> {
  const tenantId = await getTenantWriterId(MODULE)
  try {
    const data = cleanDealFields(formData)
    if (!data.title) throw new Error("Deal title is required")
    const contactId = await resolveDealContact(tenantId, String(formData.contact_name || "").trim(), String(formData.company || "").trim())
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } })
    const deal = await prisma.deal.create({
      data: { ...data, title: data.title as string, tenantId, contactId, currency: tenant?.currencyCode || "INR" },
      select: { id: true },
    })
    revalidatePath("/crm/deals")
    return { error: null, id: deal.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't create the deal" }
  }
}

export async function updateDeal(
  id: string,
  formData: DealInput
): Promise<{ error: string | null }> {
  const tenantId = await getTenantWriterId(MODULE)
  let before: { stage: DealStage } | null
  try {
    before = await prisma.deal.findFirst({ where: { id, tenantId }, select: { stage: true } })
    if (!before) return { error: "Deal not found" }
    const data = cleanDealFields(formData)
    if (formData.contact_name !== undefined || formData.company !== undefined) {
      const name = String(formData.contact_name || "").trim()
      const company = String(formData.company || "").trim()
      if (name || company) data.contactId = await resolveDealContact(tenantId, name, company)
    }
    await prisma.deal.updateMany({ where: { id, tenantId }, data })
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't update the deal" }
  }

  const deal = await getDealById(id)
  // Fire DEAL_WON / DEAL_LOST only on the transition into that stage
  const closedEvent = deal?.stage === "CLOSED_WON" ? "DEAL_WON" : deal?.stage === "CLOSED_LOST" ? "DEAL_LOST" : null
  if (deal && closedEvent && before.stage !== deal.stage) {
    fireWorkflowEvent(tenantId, closedEvent, {
      amount: deal.value,
      dealName: deal.title,
      stage: deal.stage,
      company: deal.company,
      contactName: deal.contact_name,
    }, id)
  }

  revalidatePath("/crm/deals")
  revalidatePath(`/crm/deals/${id}`)
  return { error: null }
}

export async function deleteDeal(id: string): Promise<{ error: string | null }> {
  const tenantId = await getTenantManagerId(MODULE)
  try {
    const { count } = await prisma.deal.deleteMany({ where: { id, tenantId } })
    if (count === 0) return { error: "Deal not found" }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't delete the deal" }
  }
  revalidatePath("/crm/deals")
  return { error: null }
}

const stageProbability: Record<DealStage, number> = {
  PROSPECTING: 20,
  QUALIFICATION: 40,
  PROPOSAL: 60,
  NEGOTIATION: 80,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
}

export async function updateDealStage(
  id: string,
  stage: DealStage
): Promise<{ error: string | null }> {
  const probability = stageProbability[stage] ?? 50
  const result = await updateDeal(id, { stage, probability })
  if (!result.error) {
    revalidatePath(`/crm/deals/${id}`)
    revalidatePath("/crm/deals")
  }
  return result
}

export interface DealRelationsData {
  deal: Deal | null
  contact: any | null
  company: any | null
}

export async function getDealWithRelations(id: string): Promise<DealRelationsData> {
  const tenantId = await getTenantId(MODULE)
  if (!UUID_RE.test(id)) return { deal: null, contact: null, company: null }
  const row = await prisma.deal.findFirst({ where: { id, tenantId }, select: DEAL_SELECT })
  if (!row) return { deal: null, contact: null, company: null }
  const deal = toDeal(row as DealRow)

  const [contactRes, companyRes] = await Promise.all([
    prisma.contact
      .findFirst({ where: { tenantId, id: (row as DealRow).contactId } })
      .then((c) => ({
        data: c ? pick(toRow("Contact", c), ["id", "display_name", "email", "phone", "mobile", "customer_group", "balance", "currency_code"]) : null,
      })),
    deal.company
      ? prisma.company
          .findFirst({ where: { tenantId, name: deal.company } })
          .then((c) => ({
            data: c ? pick(toRow("Company", c), ["id", "name", "industry", "website", "phone", "email", "city", "country", "country_code", "is_active"]) : null,
          }))
      : Promise.resolve({ data: null }),
  ])

  return {
    deal,
    contact: contactRes.data ?? null,
    company: companyRes.data ?? null
  }
}
