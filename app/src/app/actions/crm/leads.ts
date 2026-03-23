"use server"

import { createClient } from "@/lib/supabase/server"
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
    created_at: string
}

export async function getLeads(): Promise<Lead[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching leads:", error.message)
        return []
    }
    return data ?? []
}

export async function createLead(
    formData: Omit<Lead, "id" | "created_at">
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("leads").insert([formData])
    if (error) return { error: error.message }
    revalidatePath("/crm/leads")
    return { error: null }
}

export async function updateLead(
    id: string,
    formData: Partial<Omit<Lead, "id" | "created_at">>
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("leads").update(formData).eq("id", id)
    if (error) return { error: error.message }
    revalidatePath("/crm/leads")
    return { error: null }
}

export async function deleteLead(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("leads").delete().eq("id", id)
    if (error) return { error: error.message }
    revalidatePath("/crm/leads")
    return { error: null }
}
