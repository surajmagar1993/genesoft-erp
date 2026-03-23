"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type DealStage = "PROSPECTING" | "QUALIFICATION" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST"

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
    created_at: string
}

export async function getDeals(): Promise<Deal[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching deals:", error.message)
        return []
    }
    return data ?? []
}

export async function createDeal(
    formData: Omit<Deal, "id" | "created_at">
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("deals").insert([formData])
    if (error) return { error: error.message }
    revalidatePath("/crm/deals")
    return { error: null }
}

export async function updateDeal(
    id: string,
    formData: Partial<Omit<Deal, "id" | "created_at">>
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("deals").update(formData).eq("id", id)
    if (error) return { error: error.message }
    revalidatePath("/crm/deals")
    return { error: null }
}

export async function deleteDeal(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("deals").delete().eq("id", id)
    if (error) return { error: error.message }
    revalidatePath("/crm/deals")
    return { error: null }
}
