"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface Company {
    id: string
    name: string
    industry?: string
    website?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    country?: string
    country_code?: string
    gstin?: string
    employee_count?: number
    annual_revenue?: number
    is_active: boolean
    created_at: string
}

export async function getCompanies(): Promise<Company[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching companies:", error.message)
        return []
    }
    return data ?? []
}

export async function createCompany(
    formData: Omit<Company, "id" | "created_at">
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("companies").insert([formData])
    if (error) return { error: error.message }
    revalidatePath("/crm/companies")
    return { error: null }
}

export async function updateCompany(
    id: string,
    formData: Partial<Omit<Company, "id" | "created_at">>
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("companies").update(formData).eq("id", id)
    if (error) return { error: error.message }
    revalidatePath("/crm/companies")
    return { error: null }
}

export async function deleteCompany(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { error } = await supabase.from("companies").delete().eq("id", id)
    if (error) return { error: error.message }
    revalidatePath("/crm/companies")
    return { error: null }
}
