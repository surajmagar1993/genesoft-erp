"use server"

import type { Prisma } from "@prisma/client"
import { createClient } from "@/lib/supabase/server"
import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { fireWorkflowEvent } from "@/lib/workflow-engine"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/app/actions/notifications"
import { assertWithinLimit, PlanLimitError } from "@/lib/plan-limits"
import { toActionResult } from "@/lib/action-result"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "crm" as const

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST"

export interface Lead {
  id: string
  title: string
  contact_name: string
  email: string
  phone: string
  source: string
  status: LeadStatus
  score: number
  assigned_to: string
  notes: string
  tenant_id: string
  created_at: string
  updated_at: string
  estimated_value?: number
}

const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type LeadRow = {
  id: string
  tenantId: string
  title: string
  contactName: string | null
  source: string | null
  status: LeadStatus
  score: number
  assignedTo: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  contact: { email: string | null; phone: string | null; displayName: string } | null
}

const LEAD_SELECT = {
  id: true, tenantId: true, title: true, contactName: true, source: true, status: true, score: true,
  assignedTo: true, notes: true, createdAt: true, updatedAt: true,
  contact: { select: { email: true, phone: true, displayName: true } },
} as const

/** The shape the lead screens use (email/phone come from the linked contact). */
function toLead(r: LeadRow): Lead {
  return {
    id: r.id,
    title: r.title,
    contact_name: r.contactName || r.contact?.displayName || "",
    email: r.contact?.email || "",
    phone: r.contact?.phone || "",
    source: r.source || "",
    status: r.status,
    score: r.score,
    assigned_to: r.assignedTo || "",
    notes: r.notes || "",
    tenant_id: r.tenantId,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

export async function getLeads(
  page: number = 1,
  limit: number = 10,
  filters?: { status?: LeadStatus; search?: string }
) {
  const tenantId = await getTenantId(MODULE)
  const search = filters?.search?.trim()
  const where = {
    tenantId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { contactName: { contains: search, mode: "insensitive" as const } },
            { contact: { email: { contains: search, mode: "insensitive" as const } } },
            { contact: { phone: { contains: search } } },
          ],
        }
      : {}),
  }
  try {
    const [rows, total] = await Promise.all([
      prisma.lead.findMany({ where, select: LEAD_SELECT, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.lead.count({ where }),
    ])
    return { data: (rows as LeadRow[]).map(toLead), total }
  } catch (error) {
    console.error("Error fetching leads:", error)
    return { data: [], total: 0 }
  }
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const tenantId = await getTenantId(MODULE)
  if (!UUID_RE.test(id)) return null
  const row = await prisma.lead.findFirst({ where: { id, tenantId }, select: LEAD_SELECT })
  return row ? toLead(row as LeadRow) : null
}

type LeadInput = Partial<Omit<Lead, "id" | "created_at" | "tenant_id" | "updated_at">>

function cleanLeadFields(input: LeadInput) {
  const data: Record<string, unknown> = {}
  if (input.title !== undefined) {
    const title = String(input.title).trim()
    if (!title) throw new Error("Lead title is required")
    data.title = title.slice(0, 200)
  }
  if (input.contact_name !== undefined) data.contactName = String(input.contact_name).trim() || null
  if (input.source !== undefined) data.source = String(input.source).trim() || null
  if (input.status !== undefined) {
    if (!LEAD_STATUSES.includes(input.status)) throw new Error("Invalid lead status")
    data.status = input.status
  }
  if (input.score !== undefined) data.score = Math.max(0, Math.min(100, Math.round(Number(input.score) || 0)))
  if (input.assigned_to !== undefined) data.assignedTo = String(input.assigned_to).trim() || null
  if (input.notes !== undefined) data.notes = String(input.notes).trim() || null
  return data
}

/**
 * Leads keep the person's email and phone on a linked contact (the leads
 * table has no email/phone columns). Reuses a contact with the same email in
 * this business, otherwise creates one.
 */
async function linkContact(tenantId: string, name: string, email: string, phone: string, existingContactId: string | null): Promise<string | null> {
  if (existingContactId) {
    const data: Record<string, string> = {}
    if (email) data.email = email
    if (phone) data.phone = phone
    if (Object.keys(data).length) await prisma.contact.updateMany({ where: { id: existingContactId, tenantId }, data })
    return existingContactId
  }
  if (!email && !phone) return null
  if (email) {
    const match = await prisma.contact.findFirst({ where: { tenantId, email: { equals: email, mode: "insensitive" } }, select: { id: true } })
    if (match) return match.id
  }
  // Over the plan's contact limit the lead is still saved, just without a linked contact
  try {
    await assertWithinLimit(tenantId, "contacts")
  } catch (err) {
    if (err instanceof PlanLimitError) return null
    throw err
  }
  const created = await prisma.contact.create({
    data: { tenantId, displayName: name || email || phone, email: email || null, phone: phone || null, type: "INDIVIDUAL" },
    select: { id: true },
  })
  return created.id
}

export async function createLead(
  formData: Omit<Lead, "id" | "created_at" | "tenant_id" | "updated_at">
): Promise<{ error: string | null; id?: string }> {
  const tenantId = await getTenantWriterId(MODULE)
  let lead: { id: string }
  try {
    const data = cleanLeadFields(formData)
    if (!data.title) throw new Error("Lead title is required")
    const contactId = await linkContact(tenantId, String(formData.contact_name || "").trim(), String(formData.email || "").trim(), String(formData.phone || "").trim(), null)
    lead = await prisma.lead.create({ data: { ...data, title: data.title as string, tenantId, contactId }, select: { id: true } })
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't create the lead" }
  }

  fireWorkflowEvent(tenantId, "LEAD_CREATED", {
    source: formData.source,
    leadScore: formData.score,
    company: formData.title,
    contactName: formData.contact_name,
    estimatedValue: formData.estimated_value,
  }, lead.id)

  // Create notification
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    try {
      await createNotification({
        type: "lead",
        title: "New Lead Created",
        description: `Lead for ${formData.contact_name || formData.title} has been added.`,
        link: `/crm/leads/${lead.id}`,
        userId: user.id,
        tenantId,
      })
    } catch (notifyError) {
      console.error("Failed to create notification:", notifyError)
    }
  }

  revalidatePath("/crm/leads")
  return { error: null, id: lead.id }
}


export async function updateLead(
  id: string,
  formData: LeadInput
): Promise<{ error: string | null }> {
  const tenantId = await getTenantWriterId(MODULE)
  try {
    const existing = await prisma.lead.findFirst({ where: { id, tenantId }, select: { contactId: true, contactName: true } })
    if (!existing) return { error: "Lead not found" }
    const data = cleanLeadFields(formData)
    if (formData.email !== undefined || formData.phone !== undefined) {
      data.contactId = await linkContact(
        tenantId,
        String(formData.contact_name ?? existing.contactName ?? "").trim(),
        String(formData.email || "").trim(),
        String(formData.phone || "").trim(),
        existing.contactId
      )
    }
    await prisma.lead.updateMany({ where: { id, tenantId }, data })
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't update the lead" }
  }
  revalidatePath("/crm/leads")
  revalidatePath(`/crm/leads/${id}`)
  return { error: null }
}

export async function deleteLead(id: string): Promise<{ error: string | null }> {
  const tenantId = await getTenantManagerId(MODULE)
  try {
    const { count } = await prisma.lead.deleteMany({ where: { id, tenantId } })
    if (count === 0) return { error: "Lead not found" }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't delete the lead" }
  }
  revalidatePath("/crm/leads")
  return { error: null }
}


/**
 * Converts a Lead into a Deal and ensures a Contact exists.
 * This is a critical P1 CRM workflow.
 */
export async function convertLeadToDeal(leadId: string) {
  return toActionResult(() => _convertLeadToDeal(leadId))
}

async function _convertLeadToDeal(leadId: string) {
  const tenantId = await getTenantWriterId(MODULE)

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Fetch lead
    const lead = await tx.lead.findUnique({
      where: { id: leadId, tenantId },
    })

    if (!lead) throw new Error("Lead not found")
    if (lead.status === "CONVERTED") throw new Error("Lead already converted")

    // 2. Identify or Create Contact
    let contactId = lead.contactId

    if (!contactId) {
      await assertWithinLimit(tenantId, "contacts", { db: tx })
      const newContact = await tx.contact.create({
        data: {
          tenantId,
          displayName: lead.contactName || lead.title,
          type: "INDIVIDUAL",
        }
      })
      contactId = newContact.id
    }

    // 3. Create Deal
    const deal = await tx.deal.create({
      data: {
        tenantId,
        contactId,
        title: `Deal: ${lead.title}`,
        value: 0,
        stage: "QUALIFICATION",
        notes: `Converted from lead: ${lead.title}. ${lead.notes || ""}`,
      }
    })

    // 4. Mark Lead as Converted
    await tx.lead.update({
      where: { id: leadId },
      data: {
        status: "CONVERTED",
        convertedTo: deal.id,
      }
    })

    // 5. Create Notification
    try {
      const { data: { user } } = await (await createClient()).auth.getUser()
      if (user) {
        await tx.notification.create({
          data: {
            tenantId,
            userId: user.id,
            type: "lead",
            title: "Lead Converted",
            description: `Lead "${lead.title}" was successfully converted to a deal.`,
            link: `/crm/deals/${deal.id}`
          }
        })
      }
    } catch (e) {
      console.warn("Notification skipped during conversion:", e)
    }

    revalidatePath("/crm/leads")
    revalidatePath("/crm/deals")
    revalidatePath("/crm/contacts")

    return { success: true, dealId: deal.id }
  })
}
