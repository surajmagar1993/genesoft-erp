"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

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

export async function getLeads(
  page: number = 1, 
  limit: number = 10,
  filters?: { status?: LeadStatus; search?: string }
) {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("Error fetching leads:", error.message)
    return { data: [], total: 0 }
  }
  return { data: data ?? [], total: count || 0 }
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) return null
  return data
}

import { createNotification } from "@/app/actions/notifications"

export async function createLead(
  formData: Omit<Lead, "id" | "created_at" | "tenant_id" | "updated_at">
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data: lead, error } = await supabase
    .from("leads")
    .insert([{ ...formData, tenant_id: tenantId }])
    .select()
    .single()

  if (error) return { error: error.message }

  // Create notification
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    try {
      await createNotification({
        type: "lead",
        title: "New Lead Created",
        description: `Lead for ${formData.contact_name} has been added.`,
        link: `/crm/leads`,
        userId: user.id,
        tenantId: tenantId,
      })
    } catch (notifyError) {
      console.error("Failed to create notification:", notifyError)
    }
  }

  revalidatePath("/crm/leads")
  return { error: null }
}

export async function updateLead(
  id: string,
  formData: Partial<Omit<Lead, "id" | "created_at" | "tenant_id" | "updated_at">>
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("leads")
    .update(formData)
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/crm/leads")
  return { error: null }
}

export async function deleteLead(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/crm/leads")
  return { error: null }
}

import { prisma } from "@/lib/prisma"

/**
 * Converts a Lead into a Deal and ensures a Contact exists.
 * This is a critical P1 CRM workflow.
 */
export async function convertLeadToDeal(leadId: string) {
  const tenantId = await getTenantId()

  return await (prisma as any).$transaction(async (tx: any) => {
    // 1. Fetch lead
    const lead = await tx.lead.findUnique({
      where: { id: leadId, tenantId },
    })

    if (!lead) throw new Error("Lead not found")
    if (lead.status === "CONVERTED") throw new Error("Lead already converted")

    // 2. Identify or Create Contact
    let contactId = lead.contactId

    if (!contactId) {
      const newContact = await tx.contact.create({
        data: {
          tenantId,
          displayName: lead.contact_name || "New Contact from Lead",
          email: lead.email,
          phone: lead.phone,
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
