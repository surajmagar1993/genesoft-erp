"use server"

import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface Contact {
    id: string
    display_name: string
    type: "INDIVIDUAL" | "COMPANY"
    email: string
    phone: string
    gstin: string
    pan: string
    customer_group: string
    country_code: string
    currency_code: string
    balance: number
    is_active: boolean
    created_at: string
}

export async function getContacts(): Promise<Contact[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching contacts:", error.message)
        return []
    }
    return data ?? []
}

export async function createContact(
    formData: Omit<Contact, "id" | "created_at">
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("contacts").insert([formData])
    if (error) return { error: error.message }
    revalidatePath("/crm/contacts")
    return { error: null }
}

export async function updateContact(
    id: string,
    formData: Partial<Omit<Contact, "id" | "created_at">>
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("contacts").update(formData).eq("id", id)
    if (error) return { error: error.message }
    revalidatePath("/crm/contacts")
    return { error: null }
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("contacts").delete().eq("id", id)
    if (error) return { error: error.message }
    revalidatePath("/crm/contacts")
    return { error: null }
}
